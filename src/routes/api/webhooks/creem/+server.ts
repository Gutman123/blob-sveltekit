import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import type { RequestHandler } from './$types'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY, CREEM_WEBHOOK_SECRET } from '$env/static/private'

/**
 * Creem Webhook Handler — fixed for actual Creem payload structure:
 *
 * Real Creem payload shape:
 * {
 *   "eventType": "checkout.completed",   ← NOT "type" or "event_type"
 *   "object": {                           ← NOT "data"
 *     "id": "ch_xxx",
 *     "metadata": { "user_id": "..." },
 *     "customer": { "id": "cust_xxx", ... },
 *     "subscription": {
 *       "current_period_start_date": "...",  ← NOT current_period_start
 *       "current_period_end_date": "...",    ← NOT current_period_end
 *       "metadata": { "user_id": "..." }
 *     }
 *   },
 *   "id": "evt_xxx",
 *   "created_at": 1234567890
 * }
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyCreemSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const computedHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const receivedHex = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader

  return computedHex === receivedHex
}

function adminSupabase() {
  return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ request }) => {
  const rawBody = await request.text()

  const signature =
    request.headers.get('creem-signature') ??
    request.headers.get('x-creem-signature') ??
    request.headers.get('webhook-signature')

  // Signature verification (skip only when secret is not configured)
  if (CREEM_WEBHOOK_SECRET) {
    const valid = await verifyCreemSignature(rawBody, signature, CREEM_WEBHOOK_SECRET)
    if (!valid) {
      console.warn('[creem-webhook] Invalid signature, header received:', signature)
      return json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ✅ Fix 1: Creem uses "eventType", not "type" or "event_type"
  const eventType = (payload.eventType ?? payload.type ?? payload.event_type) as string | undefined
  console.log('[creem-webhook] eventType:', eventType)
  console.log('[creem-webhook] full payload:', JSON.stringify(payload, null, 2))

  const supabase = adminSupabase()

  // -----------------------------------------------------------------------
  // checkout.completed  →  new paid subscription
  // -----------------------------------------------------------------------
  if (eventType === 'checkout.completed') {
    // ✅ Fix 2: Creem uses "object" as the top-level data container, not "data"
    const obj = (payload.object ?? payload.data ?? payload) as Record<string, unknown>

    const customer = obj.customer as Record<string, unknown> | undefined
    const subscription = obj.subscription as Record<string, unknown> | undefined

    // ✅ Fix 3: user_id lives in obj.metadata OR obj.subscription.metadata
    const metadata = (obj.metadata ?? {}) as Record<string, string>
    const subMetadata = (subscription?.metadata ?? {}) as Record<string, string>
    const userId: string | undefined = metadata.user_id ?? subMetadata.user_id

    if (!userId) {
      console.warn('[creem-webhook] checkout.completed: missing user_id in metadata')
      console.warn('[creem-webhook] obj.metadata:', obj.metadata)
      console.warn('[creem-webhook] subscription.metadata:', subscription?.metadata)
      return json({ received: true, warning: 'no user_id in metadata' })
    }

    // ✅ Fix 4: Creem uses "current_period_start_date" and "current_period_end_date" (with _date suffix)
    const periodStart: string =
      (subscription?.current_period_start_date as string) ??
      (subscription?.current_period_start as string) ??
      new Date().toISOString()

    let periodEnd: string
    if (subscription?.current_period_end_date) {
      periodEnd = subscription.current_period_end_date as string
    } else if (subscription?.current_period_end) {
      periodEnd = subscription.current_period_end as string
    } else {
      // Fallback: infer from product billing_period
      const product = obj.product as Record<string, unknown> | undefined
      const billingPeriod = (product?.billing_period as string) ?? ''
      const isAnnual = /year|annual/i.test(billingPeriod)
      periodEnd = new Date(Date.now() + (isAnnual ? 365 : 30) * 86_400_000).toISOString()
    }

    // creem_checkout_id from obj.id (the checkout object's own id)
    const creemCheckoutId = (obj.id as string) ?? null
    const creemCustomerId = (customer?.id as string) ?? null

    // plan_id: use product name or id as fallback
    const product = obj.product as Record<string, unknown> | undefined
    const planId = (product?.id as string) ?? (obj.plan_id as string) ?? 'platinum'

    console.log(`[creem-webhook] upserting subscription for user ${userId}`, {
      periodStart,
      periodEnd,
      creemCheckoutId,
      planId,
    })

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          status: 'active',
          plan_id: planId,
          creem_checkout_id: creemCheckoutId,
          creem_customer_id: creemCustomerId,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('[creem-webhook] upsert error:', error)
      return json({ error: error.message }, { status: 500 })
    }

    console.log(`[creem-webhook] ✅ subscription activated for user ${userId}, expires ${periodEnd}`)
    return json({ received: true })
  }

  // -----------------------------------------------------------------------
  // subscription.paid  →  renewal payment succeeded
  // -----------------------------------------------------------------------
  if (eventType === 'subscription.paid') {
    const obj = (payload.object ?? payload.data ?? payload) as Record<string, unknown>
    const metadata = (obj.metadata ?? {}) as Record<string, string>
    const userId: string | undefined = metadata.user_id

    if (!userId) {
      console.warn('[creem-webhook] subscription.paid: missing user_id')
      return json({ received: true, warning: 'no user_id' })
    }

    const periodEnd: string =
      (obj.current_period_end_date as string) ??
      (obj.current_period_end as string) ??
      new Date(Date.now() + 30 * 86_400_000).toISOString()

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          status: 'active',
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('[creem-webhook] subscription.paid upsert error:', error)
      return json({ error: error.message }, { status: 500 })
    }

    console.log(`[creem-webhook] ✅ subscription renewed for user ${userId}, expires ${periodEnd}`)
    return json({ received: true })
  }

  // -----------------------------------------------------------------------
  // subscription.updated  →  plan or status change
  // -----------------------------------------------------------------------
  if (eventType === 'subscription.updated') {
    const obj = (payload.object ?? payload.data ?? payload) as Record<string, unknown>
    const metadata = (obj.metadata ?? {}) as Record<string, string>
    const userId: string | undefined = metadata.user_id

    if (userId) {
      const periodEnd =
        (obj.current_period_end_date as string) ??
        (obj.current_period_end as string) ??
        null

      await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            status: (obj.status as string) ?? 'active',
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
    }
    return json({ received: true })
  }

  // -----------------------------------------------------------------------
  // subscription.deleted  →  cancelled
  // -----------------------------------------------------------------------
  if (eventType === 'subscription.deleted') {
    const obj = (payload.object ?? payload.data ?? payload) as Record<string, unknown>
    const metadata = (obj.metadata ?? {}) as Record<string, string>
    const userId: string | undefined = metadata.user_id

    if (userId) {
      await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            status: 'canceled',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
    }
    return json({ received: true })
  }

  // Unknown event — acknowledge so Creem stops retrying
  console.log('[creem-webhook] unhandled eventType:', eventType)
  return json({ received: true })
}