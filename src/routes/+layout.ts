import { createBrowserClient, isBrowser } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  depends('supabase:auth')

  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      fetch,
    },
    cookies: {
      getAll() {
        if (!isBrowser()) {
          return []
        }
        return document.cookie.split('; ').filter(Boolean).map((c) => {
          const [name, ...rest] = c.split('=')
          return { name, value: rest.join('=') }
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = `${name}=${value}; path=${options?.path ?? '/'}; max-age=${options?.maxAge ?? 31536000}; SameSite=${options?.sameSite ?? 'Lax'}`
        })
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    session,
    supabase,
    user,
    // 透传服务端已计算好的会员状态（仅在首次 SSR 时由服务端查询，CSR 导航时复用缓存）
    subscription: data.subscription ?? null,
    isMember: data.isMember ?? false,
  }
}
