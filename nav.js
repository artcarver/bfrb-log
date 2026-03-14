/**
 * nav.js - Groundwork shared navigation
 */

(function () {
  // 1. THEME INITIALIZATION
  const savedTheme = localStorage.getItem('gw-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  window.toggleTheme = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('gw-theme', isDark ? '' : 'dark');
    // Keep PWA theme-color in sync
    const tcMeta = document.getElementById('theme-color-meta');
    if (tcMeta) tcMeta.setAttribute('content', isDark ? '#1a1820' : '#ffffff');
  };

  // 2. FIREBASE STUBS
  if (!window.signInWithGoogle) window.signInWithGoogle = function () {};
  if (!window.signOut) window.signOut = function () {};

  // 3. BUILD NAV HTML
  function buildNav() {
    const path = window.location.pathname;
    const isPage = (p) => path.includes(p) || (p === 'index.html' && path.endsWith('/'));

    const avatarSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

    return `
      <nav class="gw-nav-container">
        <div class="nav-left">
          <a href="index.html" class="nav-brand">Ground<span>work</span></a>
        </div>
        <div class="nav-links">
          <a href="index.html" class="nav-link ${isPage('index.html') ? 'active' : ''}">Log</a>
          <a href="tracker.html" class="nav-link ${isPage('tracker.html') ? 'active' : ''}">Patterns</a>
          <a href="interventions.html" class="nav-link ${isPage('interventions.html') ? 'active' : ''}">Tools</a>
          <a href="context.html" class="nav-link ${isPage('context.html') ? 'active' : ''}">Profile</a>
        </div>
        <div class="nav-right">
          <button id="sign-btn-nav" class="sign-btn" onclick="signInWithGoogle()" style="display:none">Sign in</button>
          <button id="avatar-btn" class="avatar-btn" onclick="toggleProfileMenu()" style="display:none">
            <div class="user-avatar-placeholder">${avatarSvg}</div>
          </button>
          <div class="profile-menu" id="profile-menu">
            <button class="profile-menu-item" onclick="toggleTheme();toggleProfileMenu()">
              <span class="profile-menu-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span> Theme
            </button>
            <button class="profile-menu-item" onclick="signOut()">
              <span class="profile-menu-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span> Sign out
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  // 4. PROFILE MENU TOGGLE
  window.toggleProfileMenu = function () {
    const menu = document.getElementById('profile-menu');
    if (menu) menu.classList.toggle('on');
  };

  // 5. INJECT ALL NAV STYLES
  function injectNavStyles() {
    if (document.getElementById('gw-nav-styles')) return;
    const style = document.createElement('style');
    style.id = 'gw-nav-styles';
    style.textContent = `
      /* Base Nav Layout */
      .gw-nav-container {
        height: calc(52px + env(safe-area-inset-top));
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        padding-top: env(safe-area-inset-top);
        background: rgba(255,255,255,.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--bdr);
        position: sticky;
        top: 0;
        z-index: 100;
        box-sizing: border-box;
        min-height: 52px;
      }
      [data-theme="dark"] .gw-nav-container {
        background: rgba(26,24,32,.96);
      }

      /* Brand & Left */
      .nav-left { display: flex; align-items: center; justify-content: flex-start; }
      .nav-brand { font-family: 'Nunito Sans',sans-serif; font-size: 18px; color: var(--tx); text-decoration: none; font-weight: 400; }
      .nav-brand span { color: var(--ac); }

      /* Links & Center */
      .nav-links { display: flex; align-items: center; gap: 2px; justify-content: center; min-width: 0; }
      .nav-link { 
        font-family: 'Nunito Sans',sans-serif; 
        font-size: 13px; 
        font-weight: 600; 
        color: var(--tx2); 
        text-decoration: none; 
        padding: 6px 12px; 
        border-radius: var(--pill); 
        transition: var(--tr); 
        white-space: nowrap;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      .nav-link:hover { background: var(--acl); color: var(--ac); }
      .nav-link.active { background: var(--acl); color: var(--ac); font-weight: 600; }

      /* Buttons & Right */
      .nav-right { display: flex; align-items: center; gap: 8px; justify-content: flex-end; position: relative; }
      .sign-btn {
        font-family: 'Nunito Sans',sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: var(--tx2);
        background: var(--sur);
        border: 1px solid var(--bdr);
        border-radius: var(--pill);
        padding: 6px 12px;
        cursor: pointer;
        transition: var(--tr);
      }
      .sign-btn:hover { border-color: var(--ac); color: var(--ac); }
      .avatar-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; border-radius: 50%; }

      /* Desktop Centering Magic */
      @media (min-width: 700px) {
        .nav-left, .nav-right { flex: 1 !important; }
        .nav-links { flex: 0 0 auto !important; }
      }

      /* Narrow mobile: hide brand, tighter link padding */
      @media (max-width: 374px) {
        .nav-brand { display: none; }
        .nav-link { padding: 6px 6px; font-size: 12px; }
      }

      /* iOS Safari Fix */
      @media (max-width: 768px) {
        input[type="text"], input[type="datetime-local"], input[type="number"], textarea, select {
          font-size: 16px !important;
        }
        .nav-link { padding: 6px 8px; } /* Slightly tighter links on small screens */
      }
      
      /* Avatar & Menu */
      .user-avatar-placeholder {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1.5px solid var(--bdr);
        background: var(--sur);
        color: var(--mu);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--tr);
      }
      .avatar-btn:hover .user-avatar-placeholder { border-color: var(--ac); color: var(--ac); }
      
      .profile-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: -8px;
        background: var(--card);
        border: 1px solid var(--bdr);
        border-radius: var(--rsm);
        box-shadow: var(--s2);
        min-width: 160px;
        display: none;
        z-index: 200;
        overflow: hidden;
      }
      .profile-menu.on { display: block; }
      .profile-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        font-family: 'Nunito Sans',sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: var(--tx2);
        cursor: pointer;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        transition: var(--tr);
      }
      .profile-menu-item:hover { background: var(--bg); color: var(--tx); }
      .profile-menu-item + .profile-menu-item { border-top: 1px solid var(--bdr); }
      .profile-menu-icon { font-size: 14px; width: 16px; text-align: center; }
    `;
    document.head.appendChild(style);
  }

  // 6. SYNC UI WITH FIREBASE
  function syncAuthUI() {
    const app = document.getElementById('app');
    const isLoggedIn = app && app.classList.contains('on');
    
    const signBtn = document.getElementById('sign-btn-nav');
    const avatarBtn = document.getElementById('avatar-btn');
    
    if (signBtn && avatarBtn) {
      const wantSign = isLoggedIn ? 'none' : 'block';
      const wantAvatar = isLoggedIn ? 'flex' : 'none';
      if (signBtn.style.display !== wantSign) signBtn.style.display = wantSign;
      if (avatarBtn.style.display !== wantAvatar) avatarBtn.style.display = wantAvatar;
    }
  }

  // 7. INJECT
  function injectNav() {
    injectNavStyles();
    const placeholder = document.getElementById('gw-nav');
    if (placeholder) placeholder.innerHTML = buildNav();

    document.addEventListener('click', function (e) {
      const menu = document.getElementById('profile-menu');
      const btn = document.getElementById('avatar-btn');
      if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('on');
      }
    });

    // Watch #app class changes instead of polling
    const appEl = document.getElementById('app');
    if (appEl) {
      const observer = new MutationObserver(syncAuthUI);
      observer.observe(appEl, { attributes: true, attributeFilter: ['class'] });
    }
    syncAuthUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }

  // Register service worker (handles offline + home screen caching)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }

  // 8. ACCESSIBILITY — make .tag divs keyboard-accessible
  function patchTagAccessibility() {
    document.querySelectorAll('.tag').forEach(el => {
      if (el.tagName === 'BUTTON' || el.getAttribute('role')) return;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchTagAccessibility);
  } else {
    // Delay slightly so page scripts can finish building DOM
    setTimeout(patchTagAccessibility, 100);
  }
})();
