/**
 * nav.js - Groundwork shared navigation + palette system
 *
 * Palette persistence works as follows:
 *   1. On every page load, BEFORE the nav renders, applyStoredPalette()
 *      injects a <style id="gw-palette"> appended to <head> (after base.css)
 *      that overrides CSS custom properties. Appending after base.css ensures
 *      the palette cascade wins without needing !important.
 *   2. Palette choice is stored in localStorage under 'gw-palette'.
 *   3. 'default' means no override style — base.css tokens apply as-is.
 *   4. --theme-bg and --nav-bg-rgb are palette tokens too, so the nav glass
 *      and iOS status bar hint update automatically via syncThemeColor().
 *   5. iOS home screen: status bar color is locked at install time. We keep
 *      the default neutral (#f5f5f3) so it never clashes with any palette.
 */

(function () {

  // ═══════════════════════════════════════════════════════════════
  // PALETTES
  // Each entry defines light and dark token overrides.
  // 'default' = no overrides; base.css neutral tokens apply.
  // ═══════════════════════════════════════════════════════════════
  const PALETTES = {
    default: {
      label: 'Default',
      swatch: '#7a7a7a',
      light: null,
      dark:  null,
    },
    lavender: {
      label: 'Lavender',
      swatch: '#7a66b0',
      light: {
        '--bg':'#eeebf8','--sur':'#f5f3fc','--card':'#ffffff',
        '--bg-rgb':'238,235,248',
        '--bdr':'#ddd8f0','--bdr2':'#c4bce4',
        '--tx':'#26243a','--tx2':'#4a4568','--mu':'#9b8fb0',
        '--ac':'#7a66b0','--ac-h':'#6250a0',
        '--acl':'rgba(122,102,176,.10)','--acl2':'rgba(122,102,176,.18)',
        '--sage':'#3d8a6a','--sagel':'rgba(61,138,106,.10)','--sagem':'rgba(61,138,106,.20)',
        '--warm':'#b07840','--warml':'rgba(176,120,64,.12)',
        '--o-resisted':'#3d8a6a','--o-near':'#b07840','--o-episode':'#7a66b0',
        '--theme-bg':'#eeebf8','--nav-bg-rgb':'238,235,248',
      },
      dark: {
        '--bg':'#1c1928','--sur':'#252233','--card':'#2e2a42',
        '--bg-rgb':'28,25,40',
        '--bdr':'#3c3858','--bdr2':'#544e78',
        '--tx':'#f0eeff','--tx2':'#c0b8dc','--mu':'#8878a8',
        '--ac':'#9e8ed0','--ac-h':'#b4a4e0',
        '--acl':'rgba(158,142,208,.14)','--acl2':'rgba(158,142,208,.24)',
        '--sage':'#5aaa86','--sagel':'rgba(90,170,134,.13)','--sagem':'rgba(90,170,134,.25)',
        '--warm':'#c49660','--warml':'rgba(196,150,96,.14)',
        '--o-resisted':'#5aaa86','--o-near':'#c49660','--o-episode':'#9e8ed0',
        '--theme-bg':'#1c1928','--nav-bg-rgb':'28,25,40',
      }
    },
    sage: {
      label: 'Sage',
      swatch: '#4e8a6e',
      light: {
        '--bg':'#f0f6f3','--sur':'#e6f2ec','--card':'#ffffff',
        '--bg-rgb':'240,246,243',
        '--bdr':'#c8e0d4','--bdr2':'#a0c8b8',
        '--tx':'#1a2e26','--tx2':'#3a5548','--mu':'#7aa898',
        '--ac':'#4e8a6e','--ac-h':'#3a7058',
        '--acl':'rgba(78,138,110,.10)','--acl2':'rgba(78,138,110,.18)',
        '--sage':'#4e8a6e','--sagel':'rgba(78,138,110,.10)','--sagem':'rgba(78,138,110,.20)',
        '--warm':'#c08840','--warml':'rgba(192,136,64,.12)',
        '--o-resisted':'#4e8a6e','--o-near':'#c08840','--o-episode':'#4e8a6e',
        '--theme-bg':'#f0f6f3','--nav-bg-rgb':'240,246,243',
      },
      dark: {
        '--bg':'#141f1c','--sur':'#1c2e28','--card':'#243830',
        '--bg-rgb':'20,31,28',
        '--bdr':'#2c4438','--bdr2':'#3d6050',
        '--tx':'#eaf4f0','--tx2':'#a8cfc0','--mu':'#6a9888',
        '--ac':'#5aaa86','--ac-h':'#70c09a',
        '--acl':'rgba(90,170,134,.13)','--acl2':'rgba(90,170,134,.24)',
        '--sage':'#5aaa86','--sagel':'rgba(90,170,134,.13)','--sagem':'rgba(90,170,134,.25)',
        '--warm':'#c49660','--warml':'rgba(196,150,96,.14)',
        '--o-resisted':'#5aaa86','--o-near':'#c49660','--o-episode':'#5aaa86',
        '--theme-bg':'#141f1c','--nav-bg-rgb':'20,31,28',
      }
    },
    rose: {
      label: 'Rose',
      swatch: '#b06080',
      light: {
        '--bg':'#faf3f6','--sur':'#f5e8ee','--card':'#ffffff',
        '--bg-rgb':'250,243,246',
        '--bdr':'#eeccd8','--bdr2':'#d8a0b8',
        '--tx':'#2e1a22','--tx2':'#5a3848','--mu':'#b08898',
        '--ac':'#b06080','--ac-h':'#904060',
        '--acl':'rgba(176,96,128,.10)','--acl2':'rgba(176,96,128,.18)',
        '--sage':'#3d8a6a','--sagel':'rgba(61,138,106,.10)','--sagem':'rgba(61,138,106,.20)',
        '--warm':'#c07840','--warml':'rgba(192,120,64,.12)',
        '--o-resisted':'#3d8a6a','--o-near':'#c07840','--o-episode':'#b06080',
        '--theme-bg':'#faf3f6','--nav-bg-rgb':'250,243,246',
      },
      dark: {
        '--bg':'#221418','--sur':'#30202a','--card':'#3a2832',
        '--bg-rgb':'34,20,24',
        '--bdr':'#4a3040','--bdr2':'#6a4858',
        '--tx':'#faeef3','--tx2':'#d4b8c4','--mu':'#9a7888',
        '--ac':'#d080a0','--ac-h':'#e098b8',
        '--acl':'rgba(208,128,160,.13)','--acl2':'rgba(208,128,160,.24)',
        '--sage':'#5aaa86','--sagel':'rgba(90,170,134,.13)','--sagem':'rgba(90,170,134,.25)',
        '--warm':'#c49660','--warml':'rgba(196,150,96,.14)',
        '--o-resisted':'#5aaa86','--o-near':'#c49660','--o-episode':'#d080a0',
        '--theme-bg':'#221418','--nav-bg-rgb':'34,20,24',
      }
    },
    slate: {
      label: 'Slate',
      swatch: '#5a7090',
      light: {
        '--bg':'#f2f4f7','--sur':'#e8ecf2','--card':'#ffffff',
        '--bg-rgb':'242,244,247',
        '--bdr':'#cdd4e0','--bdr2':'#a8b4c8',
        '--tx':'#1c2230','--tx2':'#3a4860','--mu':'#7a8898',
        '--ac':'#5a7090','--ac-h':'#425878',
        '--acl':'rgba(90,112,144,.10)','--acl2':'rgba(90,112,144,.18)',
        '--sage':'#3d8a6a','--sagel':'rgba(61,138,106,.10)','--sagem':'rgba(61,138,106,.20)',
        '--warm':'#a07840','--warml':'rgba(160,120,64,.12)',
        '--o-resisted':'#3d8a6a','--o-near':'#a07840','--o-episode':'#5a7090',
        '--theme-bg':'#f2f4f7','--nav-bg-rgb':'242,244,247',
      },
      dark: {
        '--bg':'#161c24','--sur':'#202830','--card':'#28303c',
        '--bg-rgb':'22,28,36',
        '--bdr':'#303c4c','--bdr2':'#445060',
        '--tx':'#eef2f8','--tx2':'#b8c4d4','--mu':'#7888a0',
        '--ac':'#7898b8','--ac-h':'#90b0d0',
        '--acl':'rgba(120,152,184,.13)','--acl2':'rgba(120,152,184,.24)',
        '--sage':'#5aaa86','--sagel':'rgba(90,170,134,.13)','--sagem':'rgba(90,170,134,.25)',
        '--warm':'#c49660','--warml':'rgba(196,150,96,.14)',
        '--o-resisted':'#5aaa86','--o-near':'#c49660','--o-episode':'#7898b8',
        '--theme-bg':'#161c24','--nav-bg-rgb':'22,28,36',
      }
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // APPLY PALETTE — runs synchronously before render
  // ═══════════════════════════════════════════════════════════════
  function buildPaletteCSS(tokens) {
    if (!tokens) return '';
    const vars = Object.entries(tokens).map(([k,v]) => `  ${k}:${v};`).join('\n');
    return `:root {\n${vars}\n}`;
  }

  function applyStoredPalette() {
    const key = localStorage.getItem('gw-palette') || 'default';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const palette = PALETTES[key];
    if (!palette) return;

    const tokens = isDark ? palette.dark : palette.light;
    let el = document.getElementById('gw-palette');
    if (!el) {
      el = document.createElement('style');
      el.id = 'gw-palette';
      // Must be appended AFTER base.css in the cascade to win
      document.head.appendChild(el);
    }
    el.textContent = buildPaletteCSS(tokens);
  }

  // Apply immediately (before DOMContentLoaded) to prevent flash
  applyStoredPalette();

  function setActivePaletteUI(key) {
    document.querySelectorAll('.palette-swatch').forEach(el => {
      el.classList.toggle('active', el.dataset.palette === key);
    });
  }

  window.selectPalette = function(key) {
    localStorage.setItem('gw-palette', key);
    applyStoredPalette();
    syncThemeColor();
    setActivePaletteUI(key);
  };

  // ═══════════════════════════════════════════════════════════════
  // THEME (light/dark)
  // ═══════════════════════════════════════════════════════════════
  const savedTheme = localStorage.getItem('gw-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyStoredPalette(); // re-apply with dark tokens
  }

  window.toggleTheme = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('gw-theme', isDark ? 'light' : 'dark');
    applyStoredPalette();
    syncThemeColor();
  };

  // ═══════════════════════════════════════════════════════════════
  // FIREBASE STUBS
  // ═══════════════════════════════════════════════════════════════
  if (!window.signInWithGoogle) window.signInWithGoogle = function () {};
  if (!window.signOut) window.signOut = function () {};

  // ═══════════════════════════════════════════════════════════════
  // BUILD NAV HTML
  // ═══════════════════════════════════════════════════════════════
  function buildNav() {
    const path = window.location.pathname;
    const isPage = (p) => path.includes(p) || (p === 'index.html' && path.endsWith('/'));
    const currentPalette = localStorage.getItem('gw-palette') || 'default';

    const avatarSvg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

    const swatches = Object.entries(PALETTES).map(([key, p]) => `
      <button class="palette-swatch ${key === currentPalette ? 'active' : ''}"
        data-palette="${key}"
        onclick="selectPalette('${key}')"
        aria-label="${p.label} palette"
        title="${p.label}">
        <span class="palette-swatch-dot" style="background:${p.swatch}"></span>
        <span class="palette-swatch-label">${p.label}</span>
      </button>`).join('');

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
            <div class="profile-menu-section">
              <div class="profile-menu-section-label">Palette</div>
              <div class="palette-swatches">${swatches}</div>
            </div>
            <button class="profile-menu-item" onclick="toggleTheme();toggleProfileMenu()">
              <span class="profile-menu-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span> Dark mode
            </button>
            <button class="profile-menu-item" onclick="signOut()">
              <span class="profile-menu-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span> Sign out
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // PROFILE MENU TOGGLE
  // ═══════════════════════════════════════════════════════════════
  window.toggleProfileMenu = function () {
    const menu = document.getElementById('profile-menu');
    if (menu) menu.classList.toggle('on');
  };

  // ═══════════════════════════════════════════════════════════════
  // NAV STYLES
  // ═══════════════════════════════════════════════════════════════
  function injectNavStyles() {
    if (document.getElementById('gw-nav-styles')) return;
    const style = document.createElement('style');
    style.id = 'gw-nav-styles';
    style.textContent = `
      .gw-nav-container {
        height: calc(52px + env(safe-area-inset-top));
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 16px; padding-top: env(safe-area-inset-top);
        background: rgba(var(--nav-bg-rgb),.97);
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--bdr);
        position: sticky; top: 0; z-index: 100; /* timer-overlay uses z-index:1000 to clear this */
        box-sizing: border-box; min-height: 52px;
      }
      .nav-left { display: flex; align-items: center; }
      .nav-brand { font-family: 'Nunito Sans',sans-serif; font-size: 18px; color: var(--tx); text-decoration: none; font-weight: 400; }
      .nav-brand span { color: var(--ac); }
      .nav-links { display: flex; align-items: center; gap: 2px; justify-content: center; min-width: 0; }
      .nav-link {
        font-family: 'Nunito Sans',sans-serif; font-size: 13px; font-weight: 600;
        color: var(--tx2); text-decoration: none; padding: 6px 12px;
        border-radius: var(--pill); transition: var(--tr);
        white-space: nowrap; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      }
      .nav-link:hover { background: var(--acl); color: var(--ac); }
      .nav-link.active { background: var(--acl); color: var(--ac); font-weight: 600; }
      .nav-right { display: flex; align-items: center; gap: 8px; justify-content: flex-end; position: relative; }
      .sign-btn {
        font-family: 'Nunito Sans',sans-serif; font-size: 12px; font-weight: 600;
        color: var(--tx2); background: var(--sur); border: 1px solid var(--bdr);
        border-radius: var(--pill); padding: 6px 12px; cursor: pointer; transition: var(--tr);
      }
      .sign-btn:hover { border-color: var(--ac); color: var(--ac); }
      .avatar-btn { background: none; border: none; padding: 0; cursor: pointer; display: flex; border-radius: 50%; }
      @media (min-width: 700px) {
        .nav-left, .nav-right { flex: 1 !important; }
        .nav-links { flex: 0 0 auto !important; }
      }
      @media (max-width: 374px) {
        .nav-brand { display: none; }
        .nav-link { padding: 6px 6px; font-size: 12px; }
      }
      @media (max-width: 768px) {
        input[type="text"], input[type="datetime-local"], input[type="number"], textarea, select { font-size: 16px !important; }
        .nav-link { padding: 6px 8px; }
      }
      .user-avatar-placeholder {
        width: 32px; height: 32px; border-radius: 50%;
        border: 1.5px solid var(--bdr); background: var(--sur); color: var(--mu);
        display: flex; align-items: center; justify-content: center; transition: var(--tr);
      }
      .avatar-btn:hover .user-avatar-placeholder { border-color: var(--ac); color: var(--ac); }
      .profile-menu {
        position: absolute; top: calc(100% + 8px); right: -8px;
        background: var(--card); border: 1px solid var(--bdr);
        border-radius: var(--rsm); box-shadow: var(--s3);
        min-width: 200px; display: none; z-index: 200; overflow: hidden;
      }
      .profile-menu.on { display: block; }
      .profile-menu-section {
        padding: 12px 14px 10px;
        border-bottom: 1px solid var(--bdr);
      }
      .profile-menu-section-label {
        font-family: 'Nunito Sans',sans-serif; font-size: 10px; font-weight: 700;
        letter-spacing: .06em; text-transform: uppercase; color: var(--mu);
        margin-bottom: 10px;
      }
      .palette-swatches {
        display: flex; gap: 6px; flex-wrap: wrap;
      }
      .palette-swatch {
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        background: none; border: none; cursor: pointer; padding: 4px 6px;
        border-radius: 8px; transition: background .12s;
        touch-action: manipulation;
      }
      .palette-swatch:hover { background: var(--sur); }
      .palette-swatch.active { background: var(--acl); }
      .palette-swatch-dot {
        width: 22px; height: 22px; border-radius: 50%;
        border: 2px solid transparent; transition: border-color .15s, transform .15s;
        display: block;
      }
      .palette-swatch.active .palette-swatch-dot { border-color: var(--tx); transform: scale(1.15); }
      .palette-swatch-label {
        font-family: 'Nunito Sans',sans-serif; font-size: 10px; font-weight: 600;
        color: var(--tx2); white-space: nowrap;
      }
      .palette-swatch.active .palette-swatch-label { color: var(--tx); }
      .profile-menu-item {
        display: flex; align-items: center; gap: 10px; padding: 11px 16px;
        font-family: 'Nunito Sans',sans-serif; font-size: 13px; font-weight: 600;
        color: var(--tx2); cursor: pointer; background: none; border: none;
        width: 100%; text-align: left; transition: var(--tr);
      }
      .profile-menu-item:hover { background: var(--sur); color: var(--tx); }
      .profile-menu-item + .profile-menu-item { border-top: 1px solid var(--bdr); }
      .profile-menu-icon { font-size: 14px; width: 16px; text-align: center; }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════
  // SYNC AUTH UI
  // ═══════════════════════════════════════════════════════════════
  function syncAuthUI() {
    const app = document.getElementById('app');
    const isLoggedIn = app && app.classList.contains('on');
    const signBtn  = document.getElementById('sign-btn-nav');
    const avatarBtn = document.getElementById('avatar-btn');
    if (signBtn && avatarBtn) {
      const wantSign   = isLoggedIn ? 'none'  : 'block';
      const wantAvatar = isLoggedIn ? 'flex'  : 'none';
      if (signBtn.style.display   !== wantSign)   signBtn.style.display   = wantSign;
      if (avatarBtn.style.display !== wantAvatar) avatarBtn.style.display = wantAvatar;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SYNC THEME-COLOR META
  // ═══════════════════════════════════════════════════════════════
  function syncThemeColor() {
    const meta = document.getElementById('theme-color-meta');
    if (!meta) return;
    const val = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim();
    if (val) meta.setAttribute('content', val);
  }

  // ═══════════════════════════════════════════════════════════════
  // INJECT
  // ═══════════════════════════════════════════════════════════════
  function injectNav() {
    injectNavStyles();
    const placeholder = document.getElementById('gw-nav');
    if (placeholder) placeholder.innerHTML = buildNav();

    document.addEventListener('click', function (e) {
      const menu = document.getElementById('profile-menu');
      const btn  = document.getElementById('avatar-btn');
      if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('on');
      }
    });

    const appEl = document.getElementById('app');
    if (appEl) {
      const observer = new MutationObserver(syncAuthUI);
      observer.observe(appEl, { attributes: true, attributeFilter: ['class'] });
    }
    syncAuthUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectNav(); syncThemeColor(); });
  } else {
    injectNav();
    syncThemeColor();
  }

  // ═══════════════════════════════════════════════════════════════
  // SERVICE WORKER
  // ═══════════════════════════════════════════════════════════════
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }
})();
