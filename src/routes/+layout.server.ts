import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
  const { session, user } = await safeGetSession()

  // 只有登录用户才查询订阅状态
  let subscription = null
  if (user) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .maybeSingle()

    subscription = data ?? null
  }

  const isMember = subscription !== null

  return {
    session,
    user,
    subscription,
    isMember,
  }
}
