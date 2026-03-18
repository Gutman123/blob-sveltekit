<script lang="ts">
  import { enhance } from '$app/forms'
  import { goto, invalidate } from '$app/navigation'

  let { form, data } = $props()

  let file: File | null = $state(null)
  let showDropdown = $state(false)

  let session = $derived(data.session)
  let user = $derived(data.user)
  let supabase = $derived(data.supabase)
  let isMember = $derived(data.isMember ?? false)
  let subscription = $derived(data.subscription ?? null)

  async function login() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    showDropdown = false
    invalidate('supabase:auth')
  }

  function toggleDropdown() {
    showDropdown = !showDropdown
  }

  function closeDropdown() {
    showDropdown = false
  }

  function onChange(
    event: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    file = (event.target as HTMLInputElement)?.files?.[0] ?? null
  }
  let buttonClass = $derived(
    file
      ? 'border-black bg-black text-white hover:bg-white hover:text-black'
      : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400',
  )
</script>

<svelte:window onclick={(e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.user-menu')) {
    showDropdown = false;
  }
}} />

<main class="relative flex min-h-screen flex-col items-center justify-center">

  <!-- Auth Section -->
  <div class="absolute top-6 right-6 z-50 user-menu">
    {#if user}
      <div class="relative">
        <button
          onclick={(e) => { e.stopPropagation(); toggleDropdown(); }}
          class="flex items-center space-x-2 rounded-full bg-white/30 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-900/5 transition-all hover:bg-white/50 hover:shadow-md focus:outline-none"
        >
          <div class="relative">
            {#if user.user_metadata?.avatar_url}
              <img src={user.user_metadata.avatar_url} alt="User Avatar" class="h-6 w-6 rounded-full" />
            {/if}
            {#if isMember}
              <span class="absolute -bottom-1 -right-1 text-[9px] leading-none">💎</span>
            {/if}
          </div>
          <span>{user.user_metadata?.full_name || user.email || 'User'}</span>
          {#if isMember}
            <span class="text-xs font-semibold px-1.5 py-0.5 rounded-full" style="background: rgba(229,231,235,0.2); color: #c4b5fd">白金</span>
          {/if}
          <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {#if showDropdown}
          <div class="absolute right-0 mt-2 w-56 rounded-xl bg-white/80 py-2 shadow-xl backdrop-blur-md ring-1 ring-black/5 transform transition-all dark:bg-zinc-800/90 dark:ring-white/10 border border-gray-100 dark:border-zinc-700">
            <div class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-zinc-700/50 mb-1">
              Signed in as<br/>
              <span class="font-medium text-gray-900 dark:text-white truncate block mt-0.5">{user.email}</span>
              {#if isMember && subscription?.current_period_end}
                <span class="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style="background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3)">
                  💎 白金会员 · 到期 {new Date(subscription.current_period_end).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              {:else if isMember}
                <span class="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style="background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3)">
                  💎 白金会员
                </span>
              {/if}
            </div>
            <a href="/profile" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors" onclick={closeDropdown}>
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span>用户信息设置与查看</span>
              </div>
            </a>
            <button onclick={logout} class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center space-x-2">
              <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              <span>退出登录</span>
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <button
        onclick={login}
        class="flex items-center space-x-2 rounded-full bg-white/70 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-900/5 backdrop-blur-md transition-all hover:bg-white hover:shadow-lg focus:outline-none dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
      >
        <svg class="h-5 w-5 bg-white rounded-full" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Google 一键登录</span>
      </button>
    {/if}
  </div>

  <a
    href="https://vercel.com/templates/next.js/blob-sveltekit"
    class="group mt-20 sm:mt-0 rounded-full flex space-x-1 bg-white/30 shadow-sm ring-1 ring-gray-900/5 text-gray-600 text-sm font-medium px-10 py-2 hover:shadow-lg active:shadow-sm transition-all"
  >
    Deploy your own to Vercel
  </a>
  <h1
    class="pt-4 pb-8 bg-gradient-to-br from-black via-[#171717] to-[#575757] bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
  >
    Blob on Vercel
  </h1>
  <div
    class="flex flex-col items-center w-full max-w-xl p-12 mx-auto rounded-lg shadow-xl dark:bg-white/10 bg-white/30 ring-1 ring-gray-900/5 backdrop-blur-lg"
  >
    <form
      class="grid gap-6 w-full"
      action="?/upload"
      method="POST"
      enctype="multipart/form-data"
      use:enhance={() => {
        return async ({ update }) => {
          file = null
          update({ reset: true })
        }
      }}
    >
      <div>
        <div class="space-y-1 mb-4">
          <h2 class="text-xl font-semibold">Upload a file</h2>
          <p class="text-sm text-gray-500">
            Accepted formats: .png, .jpg, .gif, .mp4
          </p>
        </div>
        <label
          for="image-upload"
          class="group relative mt-2 flex h-72 cursor-pointer flex-col items-center justify-center rounded-md border border-gray-300 bg-white shadow-sm transition-all hover:bg-gray-50"
        >
          {#if !file}
            <div class="absolute z-[5] h-full w-full rounded-md">
              <div
                class={`${''} absolute z-[3] flex h-full w-full flex-col items-center justify-center rounded-md px-10 transition-all ${'bg-white opacity-100 hover:bg-gray-50'}`}
              >
                <svg
                  class={`${'scale-100'} h-7 w-7 text-gray-500 transition-all duration-75 group-hover:scale-110 group-active:scale-95`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
                  />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </svg>
                <p class="mt-2 text-center text-sm text-gray-500">
                  Click to upload.
                </p>
                <p class="mt-2 text-center text-sm text-gray-500">
                  Max file size: 50MB
                </p>
                <span class="sr-only">Photo upload</span>
              </div>
            </div>
          {:else}
            <p>{file.name}</p>
          {/if}
        </label>
        <div class="mt-1 flex rounded-md shadow-sm">
          <input
            id="image-upload"
            name="image-upload"
            type="file"
            accept="image/*"
            class="sr-only"
            onchange={onChange}
          />
        </div>
      </div>

      <button
        disabled={!file}
        class="{buttonClass} flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none"
      >
        <p class="text-sm">Confirm upload</p>
      </button>
      {#if form && !file}
        <div class="p-2">
          <p class="font-semibold text-gray-900">File uploaded!</p>
          <p class="mt-1 text-sm text-gray-500">
            Your file has been uploaded to{' '}
            <a
              class="font-medium text-gray-900 underline"
              href={form.uploaded}
              target="_blank"
              rel="noopener noreferrer"
            >
              {form.uploaded}
            </a>
          </p>
        </div>
      {/if}
    </form>
  </div>
  <div
    class="flex justify-center gap-1 font-light text-gray-600 w-full max-w-lg text-center mt-6"
  >
    <a
      href="https://vercel.com/blob"
      class="font-medium underline underline-offset-4 hover:text-black transition-colors"
    >
      Vercel Blob
    </a>{' '}
    demo.
    <span>Built with</span>
    <a
      href="https://kit.svelte.dev/"
      class="flex items-center font-medium underline underline-offset-4 hover:text-black transition-colors"
    >
      <img src="svelte_logo.png" alt="svelte logo" class="h-6 mx-1" />
      <p>SvelteKit</p>
    </a>
    .
  </div>
  <div class="sm:absolute sm:bottom-0 w-full px-20 py-10 flex justify-between">
    <a href="https://vercel.com">
      <img src="/vercel.svg" alt="Vercel Logo" width={100} height={24} />
    </a>
    <a
      href="https://github.com/vercel/examples/tree/main/storage/blob-sveltekit"
      class="flex items-center space-x-2"
    >
      <img src="/github.svg" alt="GitHub Logo" width={24} height={24} />
      <p class="font-light">Source</p>
    </a>
  </div>
</main>
