/**
 * nav.js - Groundwork shared navigation
 */

(function () {
  // 1. THEME INITIALIZATION
  const savedTheme = localStorage.getItem('gw-theme') || localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  window.toggleTheme = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('gw-theme', isDark ? '' : 'dark');
    localStorage.setItem('theme', isDark ? '' : 'dark');
  };

  // 2. FIREBASE STUBS
  if (!window.signInWithGoogle) window.signInWithGoogle = function () {};
  if (!window.signOut) window.signOut = function () {};

  // 3. BUILD NAV HTML
  function buildNav() {
    const path = window.location.pathname;
    const isPage = (p) => path.includes(p) || (p === 'index.html' && path.endsWith('/'));

    // SVG User Icon
    const avatarSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

    return `
      <nav>
        <a href="index.html" class="nav-brand">Ground<span>work</span></a>
        <div class="nav-links">
          <a href="index.html" class="nav-link ${isPage('index.html') ? 'active' : ''}">Log</a>
          <a href="tracker.html" class="nav-link ${isPage('tracker.html') ? 'active' : ''}">Patterns</a>
          <a href="interventions.html" class="nav-link ${isPage('interventions.html') ? 'active' : ''}">Tools</a>
          <a href="context.html" class="nav-link ${isPage('context.html') ? 'active' : ''}">Context</a>
        </div>
        <div class="nav-right">
          <button id="sign-btn-nav" class="sign-btn" onclick="signInWithGoogle()" style="display:none">Sign in</button>
          <button id="avatar-btn" class="avatar-btn" onclick="toggleProfileMenu()" style="display:none">
            <div class="user-avatar-placeholder">${avatarSvg}</div>
          </button>
          <div class="profile-menu" id="profile-menu">
            <button class="profile-menu-item" onclick="toggleTheme();toggleProfileMenu()">
              <span class="profile-menu-icon">&#9680;</span> Toggle Theme
            </button>
            <button class="profile-menu-item" onclick="signOut()">
              <span class="profile-menu-icon">&rarr;</span> Sign out
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

  // 5. INJECT STYLES
  function injectNavStyles() {
    if (document.getElementById('gw-nav-styles')) return;
    const style = document.createElement('style');
    style.id = 'gw-nav-styles';
    style.textContent = `
      @media (max-width: 768px) {
        input[type="text"], input[type="datetime-local"], input[type="number"], textarea, select {
          font-size: 16px !important;
        }
      }
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
      .avatar-btn:hover .user-avatar-placeholder {
        border-color: var(--ac);
        color: var(--ac);
      }
      .profile-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
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
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: var(--tx2);
        cursor: pointer;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        transition: var(--tr);
      }
      .profile-menu-item:hover {
        background: var(--bg);
        color: var(--tx);
      }
      .profile-menu-item + .profile-menu-item {
        border-top: 1px solid var(--bdr);
      }
      .profile-menu-icon {
        font-size: 14px;
        width: 16px;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  // 6. OBSERVE AUTH STATE ACROSS APP
  let _internalUid = null;
  Object.defineProperty(window, '_uid', {
    get: function() { return _internalUid; },
    set: function(val) {
      _internalUid = val;
      const signBtn = document.getElementById('sign-btn-nav');
      const avatarBtn = document.getElementById('avatar-btn');
      if (signBtn) signBtn.style.display = val ? 'none' : 'block';
      if (avatarBtn) avatarBtn.style.display = val ? 'flex' : 'none';
    }
  });

  // 7. INJECT NAV INTO DOM
  function injectNav() {
    injectNavStyles();
    const placeholder = document.getElementById('gw-nav');
    
    if (placeholder) {
      placeholder.innerHTML = buildNav();
    }

    // Force UI refresh if auth state loaded before DOM
    if (_internalUid) {
      window._uid = _internalUid; 
    }

    // Close menu on outside click
    document.addEventListener('click', function (e) {
      const menu = document.getElementById('profile-menu');
      const btn = document.getElementById('avatar-btn');
      if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('on');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
})();
