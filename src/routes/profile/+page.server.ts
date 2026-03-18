import { redirect, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase }, parent }) => {
  const { session, user } = await safeGetSession()

  if (!session || !user) {
    redirect(303, '/')
  }

  // 从 layout 获取已查好的会员状态（避免重复查询）
  const { subscription, isMember } = await parent()

  // Try to fetch profile from profiles table; ignore if it doesn't exist yet
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return {
    user,
    session,
    profile: profile ?? null,
    subscription,
    isMember,
  }
}

export const actions: Actions = {
  updateProfile: async ({ request, locals: { safeGetSession, supabase } }) => {
    const { session, user } = await safeGetSession()
    if (!session || !user) {
      return fail(401, { message: '未授权，请重新登录' })
    }

    const formData = await request.formData()
    const username = (formData.get('username') as string)?.trim()
    const address = (formData.get('address') as string)?.trim()
    const phone = (formData.get('phone') as string)?.trim()
    const bio = (formData.get('bio') as string)?.trim()

    // Upsert into profiles table
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username,
      address,
      phone,
      bio,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      return fail(500, { message: '保存失败：' + error.message, action: 'profile' })
    }

    return { success: true, action: 'profile' }
  },

  updatePassword: async ({ request, locals: { safeGetSession, supabase } }) => {
    const { session } = await safeGetSession()
    if (!session) {
      return fail(401, { message: '未授权，请重新登录' })
    }

    const formData = await request.formData()
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!newPassword || newPassword.length < 6) {
      return fail(400, { message: '密码至少需要 6 位字符', action: 'password' })
    }

    if (newPassword !== confirmPassword) {
      return fail(400, { message: '两次输入的密码不一致', action: 'password' })
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      return fail(500, { message: '密码更新失败：' + error.message, action: 'password' })
    }

    return { success: true, action: 'password' }
  },
}
