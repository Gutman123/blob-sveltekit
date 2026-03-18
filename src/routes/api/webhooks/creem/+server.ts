import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import type { RequestHandler } from './$types'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY, CREEM_WEBHOOK_SECRET } from '$env/static/private'

/**
 * Creem sends webhook events as JSON POST requests.
 * We verify the signature using HMAC-SHA256, then upsert the
 * subscription record into the `subscriptions` table.
 *
 * Relevant Creem event types:
 *   - checkout.completed  → new subscription created / renewed
 *   - subscription.updated → plan or status change
 *   - subscription.deleted → cancellation
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

  // Creem may send header as "sha256=<hex>" or just "<hex>"
  const receivedHex = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader

  return computedHex === receivedHex
}

// Build a supabase admin client that bypasses RLS
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
  const signature = request.headers.get('creem-signature') ??
                    request.headers.get('x-creem-signature') ??
                    request.headers.get('webhook-signature')

  // --- Signature verification (skip when no secret is configured) ---
  if (CREEM_WEBHOOK_SECRET) {
    const valid = await verifyCreemSignature(rawBody, signature, CREEM_WEBHOOK_SECRET)
    if (!valid) {
      console.warn('[creem-webhook] Invalid signature')
      return json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[creem-webhook] event:', payload.type ?? payload.event_type)

  const supabase = adminSupabase()

  // -----------------------------------------------------------------------
  // checkout.completed  →  new paid subscription
  // -----------------------------------------------------------------------
  if (
    payload.type === 'checkout.completed' ||
    payload.event_type === 'checkout.completed'
  ) {
    const data = (payload.data ?? payload) as Record<string, unknown>
    const customer = data.customer as Record<string, unknown> | undefined
    const subscription = data.subscription as Record<string, unknown> | undefined
    const checkout = data.checkout as Record<string, unknown> | undefined

    // Creem attaches your custom metadata (e.g. user_id) to the checkout
    const metadata = (checkout?.metadata ?? data.metadata ?? {}) as Record<string, string>
    const userId: string | undefined = metadata.user_id as string | undefined

    if (!userId) {
      console.warn('[creem-webhook] checkout.completed missing metadata.user_id')
      // Still return 200 so Creem does not retry indefinitely
      return json({ received: true, warning: 'no user_id in metadata' })
    }

    // Determine period dates from subscription object
    const periodStart: string = (subscription?.current_period_start as string) ??
      new Date().toISOString()

    // If no explicit end date, infer from interval (month = 30d, year = 365d)
    let periodEnd: string
    if (subscription?.current_period_end) {
      periodEnd = subscription.current_period_end as string
    } else {
      const planId = (subscription?.plan_id ?? data.plan_id ?? '') as string
      const isAnnual = /year|annual|annu/i.test(planId)
      const daysToAdd = isAnnual ? 365 : 30
      periodEnd = new Date(Date.now() + daysToAdd * 86_400_000).toISOString()
    }

    const { error } = await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        status: 'active',
        plan_id: subscription?.plan_id ?? data.plan_id ?? 'platinum',
        creem_checkout_id: checkout?.id ?? data.id ?? null,
        creem_customer_id: customer?.id ?? null,
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

    console.log(`[creem-webhook] ✅ subscription activated for user ${userId}`)
    return json({ received: true })
  }

  // -----------------------------------------------------------------------
  // subscription.updated  →  renewal / plan change
  // -----------------------------------------------------------------------
  if (
    payload.type === 'subscription.updated' ||
    payload.event_type === 'subscription.updated'
  ) {
    const sub = (payload.data ?? payload) as Record<string, unknown>
    const metadata = (sub.metadata ?? {}) as Record<string, string>
    const userId: string | undefined = metadata.user_id as string | undefined

    if (userId) {
      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          status: (sub.status as string) ?? 'active',
          plan_id: sub.plan_id ?? 'platinum',
          creem_customer_id: sub.customer_id ?? null,
          current_period_start: sub.current_period_start ?? new Date().toISOString(),
          current_period_end: sub.current_period_end ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }
    return json({ received: true })
  }

  // -----------------------------------------------------------------------
  // subscription.deleted  →  cancel / expire
  // -----------------------------------------------------------------------
  if (
    payload.type === 'subscription.deleted' ||
    payload.event_type === 'subscription.deleted'
  ) {
    const sub = (payload.data ?? payload) as Record<string, unknown>
    const metadata = (sub.metadata ?? {}) as Record<string, string>
    const userId: string | undefined = metadata.user_id as string | undefined

    if (userId) {
      await supabase.from('subscriptions').upsert(
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

  // Unknown event type — acknowledge receipt so Creem stops retrying
  return json({ received: true })
}
