/**
 * nav.js — Groundwork shared navigation
 * Renders the nav bar on every page and manages theme + profile menu.
 * Each page just needs: <div id="gw-nav"></div> where <nav> used to be,
 * and <script src="nav.js"></script> before closing </body>.
 * The active link is detected automatically from window.location.pathname.
 */

(function () {
  // ── THEME (runs immediately, before render, to avoid flash) ──
  const savedTheme = localStorage.getItem('gw-theme') || localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  window.toggleTheme = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('gw-theme', isDark ? '' : 'dark');
    // keep legacy key in sync for firebase.js which reads it
    localStorage.setItem('theme', isDark ? '' : 'dark');
  };

  // ── NAV LINKS ──
  const NAV_LINKS = [
    { href: 'index.html',         label: 'Log'         },
    { href: 'tracker.html',       label: 'Patterns'    },
    { href: 'interventions.html', label: 'Tools'       },
    { href: 'context.html',       label: 'Context'     },
  ];

  function activePage() {
    const path = window.location.pathname;
    const file = path.split('/').pop() || 'index.html';
    return file || 'index.html';
  }

  function buildNav() {
    const current = activePage();
    const linksHtml = NAV_LINKS.map(({ href, label }) => {
      const isActive = href === current || (current === '' && href === 'index.html');
      return `<a class="nav-link${isActive ? ' active' : ''}" href="${href}">${label}</a>`;
    }).join('');

    return `<nav>
  <a class="nav-brand" href="index.html">Ground<span>work</span></a>
  <div class="nav-links">
    ${linksHtml}
  </div>
  <div class="nav-right">
    <button class="theme-btn" onclick="toggleTheme()" title="Toggle dark mode">&#9680;</button>
    <button class="sign-btn" id="sign-btn-nav" onclick="signInWithGoogle()">Sign in</button>
    <button class="avatar-btn" id="avatar-btn" onclick="toggleProfileMenu()" style="display:none" aria-label="Account menu">
      <img class="user-avatar" id="user-avatar" src="" alt="">
    </button>
    <div class="profile-menu" id="profile-menu">
      <button class="profile-menu-item" onclick="toggleTheme();toggleProfileMenu()">
        <span class="profile-menu-icon">&#9680;</span> Dark mode
      </button>
      <button class="profile-menu-item" onclick="signOut()">
        <span class="profile-menu-icon">&rarr;</span> Sign out
      </button>
    </div>
  </div>
</nav>`;
  }

  // ── PROFILE MENU ──
  window.toggleProfileMenu = function () {
    const menu = document.getElementById('profile-menu');
    if (menu) menu.classList.toggle('on');
  };

  // ── INJECT NAV ──
  function injectNav() {
    const placeholder = document.getElementById('gw-nav');
    if (placeholder) {
      placeholder.outerHTML = buildNav();
    } else {
      // Fallback: replace existing <nav> if placeholder not present
      const existing = document.querySelector('nav');
      if (existing) existing.outerHTML = buildNav();
    }

    // Close profile menu on outside click
    document.addEventListener('click', function (e) {
      const menu = document.getElementById('profile-menu');
      const btn  = document.getElementById('avatar-btn');
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
