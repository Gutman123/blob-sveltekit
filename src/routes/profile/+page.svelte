<script lang="ts">
  import { enhance } from '$app/forms'
  import { goto } from '$app/navigation'

  let { data, form } = $props()

  let user = $derived(data.user)
  let profile = $derived(data.profile)

  // Tab state
  type Tab = 'membership' | 'profile' | 'password'
  let activeTab = $state<Tab>('membership')

  // Password visibility
  let showNew = $state(false)
  let showConfirm = $state(false)

  // Derived member info
  let memberLevel = $derived(() => {
    const created = user?.created_at ? new Date(user.created_at) : new Date()
    const now = new Date()
    const days = Math.floor((now.getTime() - created.getTime()) / 86400000)
    if (days >= 365) return { label: '黄金会员', color: '#F59E0B', icon: '👑', days }
    if (days >= 90)  return { label: '白银会员', color: '#94A3B8', icon: '🥈', days }
    return { label: '普通会员', color: '#6EE7B7', icon: '✨', days }
  })

  let avatarUrl = $derived(user?.user_metadata?.avatar_url ?? null)
  let displayName = $derived(profile?.username || user?.user_metadata?.full_name || user?.email || 'User')
  let joinDate = $derived(user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—')

  let progressTarget = $derived(memberLevel().days >= 365 ? 365 : memberLevel().days >= 90 ? 365 : 90)
  let progressPct = $derived(Math.min(100, Math.round((memberLevel().days / progressTarget) * 100)))
</script>

<svelte:head>
  <title>用户中心 — Blob on Vercel</title>
  <meta name="description" content="管理您的账户信息、会员等级与安全设置" />
</svelte:head>

<main class="profile-page">
  <!-- Background orbs -->
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>

  <!-- Top nav -->
  <nav class="top-nav">
    <button class="back-btn" onclick={() => goto('/')}>
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
      返回首页
    </button>
  </nav>

  <div class="container">
    <!-- Profile Header Card -->
    <div class="header-card">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="avatar-wrap">
          {#if avatarUrl}
            <img src={avatarUrl} alt="头像" class="avatar" />
          {:else}
            <div class="avatar avatar-fallback">
              {displayName.charAt(0).toUpperCase()}
            </div>
          {/if}
          <div class="member-badge" style="background: {memberLevel().color}22; border-color: {memberLevel().color}55">
            <span>{memberLevel().icon}</span>
          </div>
        </div>
        <div class="header-info">
          <h1 class="user-name">{displayName}</h1>
          <p class="user-email">{user?.email}</p>
          <div class="member-tag" style="color: {memberLevel().color}">
            {memberLevel().label} · 注册 {memberLevel().days} 天
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab {activeTab === 'membership' ? 'tab-active' : ''}"
          onclick={() => activeTab = 'membership'}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
          会员等级
        </button>
        <button
          class="tab {activeTab === 'profile' ? 'tab-active' : ''}"
          onclick={() => activeTab = 'profile'}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          个人信息
        </button>
        <button
          class="tab {activeTab === 'password' ? 'tab-active' : ''}"
          onclick={() => activeTab = 'password'}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          修改密码
        </button>
        <div class="tab-indicator"
          style="left: calc({activeTab === 'membership' ? 0 : activeTab === 'profile' ? 1 : 2} * 33.333%)">
        </div>
      </div>
    </div>

    <!-- Tab Panels -->
    <div class="panel">

      <!-- ── MEMBERSHIP TAB ── -->
      {#if activeTab === 'membership'}
        <div class="panel-section fade-in">
          <h2 class="section-title">会员等级</h2>
          <p class="section-sub">根据您的注册年限享受对应权益</p>

          <div class="tier-grid">
            {#each [
              { label: '普通会员', icon: '✨', color: '#6EE7B7', bg: '#6EE7B722', req: '注册即可获得', perks: ['基础文件上传', '50MB 单文件限制', '标准访问速度'] },
              { label: '白银会员', icon: '🥈', color: '#94A3B8', bg: '#94A3B822', req: '注册满 90 天', perks: ['优先文件处理', '200MB 单文件限制', '加速访问节点', '专属客服支持'] },
              { label: '黄金会员', icon: '👑', color: '#F59E0B', bg: '#F59E0B22', req: '注册满 365 天', perks: ['最高优先级', '无限制文件大小', '专属 CDN 加速', '高级数据分析', '专属徽章'] },
            ] as tier}
              <div class="tier-card {memberLevel().label === tier.label ? 'tier-active' : ''}"
                style="--tcolor: {tier.color}; --tbg: {tier.bg}">
                <div class="tier-header">
                  <span class="tier-icon">{tier.icon}</span>
                  <div>
                    <div class="tier-name" style="color: {tier.color}">{tier.label}</div>
                    <div class="tier-req">{tier.req}</div>
                  </div>
                  {#if memberLevel().label === tier.label}
                    <div class="tier-current-badge">当前</div>
                  {/if}
                </div>
                <ul class="tier-perks">
                  {#each tier.perks as perk}
                    <li>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                      </svg>
                      {perk}
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>

          <!-- Progress bar towards next tier -->
          <div class="progress-card">
            <div class="progress-header">
              <span class="progress-label">距离下一等级进度</span>
              <span class="progress-days" style="color: {memberLevel().color}">{memberLevel().days} 天</span>
            </div>

            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: {progressPct}%; background: {memberLevel().color}"></div>
            </div>
            <div class="progress-meta">
              <span>0</span>
              {#if memberLevel().days < 365}
                <span>{progressTarget} 天达成</span>
              {:else}
                <span class="progress-maxed">已达最高等级 🎉</span>
              {/if}
            </div>
          </div>

          <!-- Stats row -->
          <div class="stats-row">
            <div class="stat-box">
              <div class="stat-val">{memberLevel().days}</div>
              <div class="stat-key">注册天数</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">{joinDate}</div>
              <div class="stat-key">加入日期</div>
            </div>
            <div class="stat-box">
              <div class="stat-val" style="color:{memberLevel().color}">{memberLevel().icon} {memberLevel().label}</div>
              <div class="stat-key">当前等级</div>
            </div>
          </div>
        </div>
      {/if}

      <!-- ── PROFILE TAB ── -->
      {#if activeTab === 'profile'}
        <div class="panel-section fade-in">
          <h2 class="section-title">个人信息设置</h2>
          <p class="section-sub">更新您的公开资料与联系信息</p>

          {#if form?.success && form?.action === 'profile'}
            <div class="alert alert-success">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              个人信息已成功保存！
            </div>
          {/if}
          {#if form?.message && form?.action === 'profile'}
            <div class="alert alert-error">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {form.message}
            </div>
          {/if}

          <form method="POST" action="?/updateProfile" use:enhance class="profile-form">
            <div class="form-row">
              <div class="field">
                <label for="username">用户名</label>
                <input id="username" name="username" type="text"
                  placeholder="您的显示名称"
                  value={profile?.username ?? user?.user_metadata?.full_name ?? ''} />
              </div>
              <div class="field">
                <label for="phone">手机号码</label>
                <input id="phone" name="phone" type="tel"
                  placeholder="请输入手机号码"
                  value={profile?.phone ?? ''} />
              </div>
            </div>

            <div class="field">
              <label for="address">地址</label>
              <input id="address" name="address" type="text"
                placeholder="城市 / 地区 / 详细地址"
                value={profile?.address ?? ''} />
            </div>

            <div class="field">
              <label for="bio">个人简介</label>
              <textarea id="bio" name="bio" rows="3"
                placeholder="简单介绍一下自己...">{profile?.bio ?? ''}</textarea>
            </div>

            <!-- Read-only Google auth info -->
            <div class="readonly-section">
              <div class="readonly-label">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                账号信息（由 Google 提供，不可修改）
              </div>
              <div class="readonly-fields">
                <div class="readonly-field">
                  <span class="readonly-key">邮箱</span>
                  <span class="readonly-val">{user?.email}</span>
                </div>
                <div class="readonly-field">
                  <span class="readonly-key">Google ID</span>
                  <span class="readonly-val mono">{user?.id?.slice(0, 16)}…</span>
                </div>
              </div>
            </div>

            <button type="submit" class="btn-primary">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              保存信息
            </button>
          </form>
        </div>
      {/if}

      <!-- ── PASSWORD TAB ── -->
      {#if activeTab === 'password'}
        <div class="panel-section fade-in">
          <h2 class="section-title">修改密码</h2>
          <p class="section-sub">为您的账户设置一个强密码</p>

          {#if user?.app_metadata?.provider === 'google'}
            <div class="alert alert-info">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <strong>您使用 Google 账号登录</strong><br/>
                您仍可设置密码，以便日后使用邮箱+密码方式登录。
              </div>
            </div>
          {/if}

          {#if form?.success && form?.action === 'password'}
            <div class="alert alert-success">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              密码已成功更新！
            </div>
          {/if}
          {#if form?.message && form?.action === 'password'}
            <div class="alert alert-error">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {form.message}
            </div>
          {/if}

          <form method="POST" action="?/updatePassword" use:enhance class="profile-form">
            <div class="field">
              <label for="newPassword">新密码</label>
              <div class="password-wrap">
                <input
                  id="newPassword" name="newPassword"
                  type={showNew ? 'text' : 'password'}
                  placeholder="至少 6 位字符"
                  autocomplete="new-password"
                />
                <button type="button" class="eye-btn" onclick={() => showNew = !showNew} aria-label="切换密码可见">
                  {#if showNew}
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  {:else}
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  {/if}
                </button>
              </div>
            </div>

            <div class="field">
              <label for="confirmPassword">确认新密码</label>
              <div class="password-wrap">
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="再次输入新密码"
                  autocomplete="new-password"
                />
                <button type="button" class="eye-btn" onclick={() => showConfirm = !showConfirm} aria-label="切换密码可见">
                  {#if showConfirm}
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  {:else}
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  {/if}
                </button>
              </div>
            </div>

            <div class="password-tips">
              <p>密码建议：</p>
              <ul>
                <li>至少 8 位字符</li>
                <li>包含大小写字母</li>
                <li>包含数字和特殊符号（如 @#$!）</li>
              </ul>
            </div>

            <button type="submit" class="btn-primary btn-danger">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              更新密码
            </button>
          </form>
        </div>
      {/if}

    </div>
  </div>
</main>

<style>
  /* ── Base ── */
  .profile-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0f17 0%, #1a1a2e 40%, #16213e 100%);
    padding: 0 1rem 4rem;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  /* ── Orbs ── */
  .orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.25;
    pointer-events: none;
  }
  .orb-1 { width: 500px; height: 500px; background: #6366f1; top: -120px; left: -100px; animation: drift 12s ease-in-out infinite alternate; }
  .orb-2 { width: 400px; height: 400px; background: #8b5cf6; bottom: -80px; right: -80px; animation: drift 15s ease-in-out infinite alternate-reverse; }
  .orb-3 { width: 300px; height: 300px; background: #06b6d4; top: 50%; left: 55%; animation: drift 10s ease-in-out infinite alternate; }

  @keyframes drift {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(30px, 20px) scale(1.05); }
  }

  /* ── Nav ── */
  .top-nav {
    display: flex;
    align-items: center;
    padding: 1.25rem 0;
    max-width: 860px;
    margin: 0 auto;
  }
  .back-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: rgba(255,255,255,0.6);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    transition: color 0.2s, background 0.2s;
  }
  .back-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

  /* ── Container ── */
  .container {
    max-width: 860px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ── Header Card ── */
  .header-card {
    border-radius: 1.5rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(20px);
    overflow: hidden;
    position: relative;
  }
  .header-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%);
  }
  .header-content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem 2rem 1.5rem;
    position: relative;
  }
  .avatar-wrap { position: relative; flex-shrink: 0; }
  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.15);
    object-fit: cover;
  }
  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    font-size: 2rem;
    font-weight: 700;
  }
  .member-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    border: 1.5px solid;
    background: rgba(0,0,0,0.4);
  }
  .header-info { flex: 1; min-width: 0; }
  .user-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.2rem;
    line-height: 1.2;
  }
  .user-email { color: rgba(255,255,255,0.5); font-size: 0.875rem; margin: 0 0 0.5rem; }
  .member-tag { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.03em; }

  /* ── Tabs ── */
  .tabs {
    display: flex;
    position: relative;
    border-top: 1px solid rgba(255,255,255,0.07);
  }
  .tab {
    flex: 1;
    background: none;
    border: none;
    color: rgba(255,255,255,0.45);
    padding: 0.9rem 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    cursor: pointer;
    transition: color 0.2s;
    position: relative;
    z-index: 1;
  }
  .tab:hover { color: rgba(255,255,255,0.75); }
  .tab-active { color: #fff; }
  .tab-indicator {
    position: absolute;
    bottom: 0;
    width: 33.333%;
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 2px 2px 0 0;
    transition: left 0.3s cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Panel ── */
  .panel {
    border-radius: 1.5rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(20px);
    overflow: hidden;
  }
  .panel-section {
    padding: 2rem;
  }
  .fade-in {
    animation: fadeInUp 0.3s ease both;
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.25rem;
  }
  .section-sub {
    color: rgba(255,255,255,0.45);
    font-size: 0.875rem;
    margin: 0 0 1.75rem;
  }

  /* ── Membership tier grid ── */
  .tier-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .tier-card {
    background: var(--tbg);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 1rem;
    padding: 1.25rem;
    transition: transform 0.2s, border-color 0.2s;
  }
  .tier-card:hover { transform: translateY(-2px); }
  .tier-active {
    border-color: var(--tcolor) !important;
    box-shadow: 0 0 20px -5px var(--tcolor);
  }
  .tier-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    position: relative;
  }
  .tier-icon { font-size: 1.5rem; }
  .tier-name { font-size: 0.95rem; font-weight: 700; }
  .tier-req { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 0.1rem; }
  .tier-current-badge {
    margin-left: auto;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    color: #fff;
    letter-spacing: 0.05em;
  }
  .tier-perks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .tier-perks li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.65);
  }
  .tier-perks li svg { color: var(--tcolor); flex-shrink: 0; }

  /* ── Progress ── */
  .progress-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 1rem;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }
  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .progress-label { font-size: 0.875rem; color: rgba(255,255,255,0.6); }
  .progress-days { font-size: 0.875rem; font-weight: 700; }
  .progress-bar-track {
    height: 8px;
    background: rgba(255,255,255,0.08);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  .progress-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
  }
  .progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.3);
  }
  .progress-maxed { color: #F59E0B; }

  /* ── Stats row ── */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .stat-box {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 0.875rem;
    padding: 1rem;
    text-align: center;
  }
  .stat-val { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.25rem; }
  .stat-key { font-size: 0.75rem; color: rgba(255,255,255,0.4); }

  /* ── Forms ── */
  .profile-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .field label {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255,255,255,0.6);
    letter-spacing: 0.04em;
  }
  .field input,
  .field textarea {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 0.75rem;
    padding: 0.7rem 1rem;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    resize: vertical;
    font-family: inherit;
  }
  .field input::placeholder,
  .field textarea::placeholder { color: rgba(255,255,255,0.2); }
  .field input:focus,
  .field textarea:focus {
    border-color: #6366f1;
    background: rgba(99,102,241,0.08);
  }

  /* ── Password input ── */
  .password-wrap {
    position: relative;
  }
  .password-wrap input {
    width: 100%;
    padding-right: 3rem;
    box-sizing: border-box;
  }
  .eye-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255,255,255,0.3);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    display: flex;
    transition: color 0.2s;
  }
  .eye-btn:hover { color: rgba(255,255,255,0.7); }

  /* ── Read-only section ── */
  .readonly-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 0.875rem;
    padding: 1rem;
  }
  .readonly-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.35);
    margin-bottom: 0.75rem;
  }
  .readonly-fields { display: flex; flex-direction: column; gap: 0.5rem; }
  .readonly-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
  }
  .readonly-key { color: rgba(255,255,255,0.4); }
  .readonly-val { color: rgba(255,255,255,0.7); }
  .mono { font-family: 'Courier New', monospace; font-size: 0.78rem; }

  /* ── Password tips ── */
  .password-tips {
    background: rgba(99,102,241,0.08);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 0.75rem;
    padding: 1rem;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
  }
  .password-tips p { margin: 0 0 0.5rem; font-weight: 600; color: rgba(255,255,255,0.6); }
  .password-tips ul { margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.25rem; }

  /* ── Buttons ── */
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.8rem 1.5rem;
    border-radius: 0.75rem;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: inherit;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 20px rgba(99,102,241,0.3);
    align-self: flex-start;
  }
  .btn-primary:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 6px 25px rgba(99,102,241,0.4);
  }
  .btn-danger {
    background: linear-gradient(135deg, #7c3aed, #db2777);
    box-shadow: 0 4px 20px rgba(219,39,119,0.3);
  }
  .btn-danger:hover { box-shadow: 0 6px 25px rgba(219,39,119,0.4); }

  /* ── Alerts ── */
  .alert {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  .alert svg { flex-shrink: 0; margin-top: 1px; }
  .alert-success {
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.25);
    color: #6EE7B7;
  }
  .alert-error {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.25);
    color: #FCA5A5;
  }
  .alert-info {
    background: rgba(99,102,241,0.1);
    border: 1px solid rgba(99,102,241,0.25);
    color: #a5b4fc;
  }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .form-row { grid-template-columns: 1fr; }
    .stats-row { grid-template-columns: 1fr 1fr; }
    .tier-grid { grid-template-columns: 1fr; }
    .header-content { flex-direction: column; align-items: flex-start; }
    .panel-section { padding: 1.25rem; }
  }
</style>
