<script lang="ts">
  import '../app.css'
  import { invalidate } from '$app/navigation'
  import { onMount } from 'svelte'
  import { createBrowserClient, isBrowser } from '@supabase/ssr'
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

  let { children, data } = $props()

  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      fetch,
    },
    cookies: {
      getAll() {
        if (!isBrowser()) {
          return []
        }
        // Parse document.cookie into array format
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

  onMount(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession?.expires_at !== data.session?.expires_at) {
        // 使 supabase:auth 依赖失效，触发 +layout.server.ts 重新查询
        // 这样登录/登出后，subscription 和 isMember 都会自动更新
        invalidate('supabase:auth')
      }
    })

    return () => subscription.unsubscribe()
  })
</script>

{@render children?.()}
