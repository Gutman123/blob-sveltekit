// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'

/** 订阅记录，与 Supabase subscriptions 表字段对应 */
export interface Subscription {
  id: string
  user_id: string
  status: string
  plan_id: string | null
  creem_checkout_id: string | null
  creem_customer_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string | null
  updated_at: string | null
}

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      supabase: SupabaseClient
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>
    }
    interface PageData {
      session: Session | null
      user: User | null
      /** 当前用户的有效订阅记录（未登录或无订阅时为 null） */
      subscription: import('./app').Subscription | null
      /** 用户是否为有效会员（subscription 存在且在有效期内） */
      isMember: boolean
    }
    // interface Platform {}
  }
}

export {}
