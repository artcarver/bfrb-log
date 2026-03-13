/**
 * daily-state-widget.js — Lightweight daily upstream state logger
 *
 * Clinical rationale:
 *   BFRB episode frequency correlates with upstream variables — sleep quality,
 *   stress level, and physiological state — that aren't captured by episode-level
 *   logging alone. This widget adds a once-per-day "state snapshot" that Patterns
 *   can correlate against episode data.
 *
 * Usage:
 *   Add to index.html AND tracker.html just before </body>:
 *     <script src="daily-state-widget.js"></script>
 *
 *   The widget auto-initializes when a Firebase user is detected via MutationObserver
 *   on #app.on — no polling required.
 *   Call window.initDailyState(db, uid) directly if preferred.
 *
 * Firestore schema:
 *   users/{uid}/dailystate/{YYYY-MM-DD} = {
 *     date: string,            // YYYY-MM-DD
 *     sleep: number,           // 1–5
 *     stress: number,          // 0–10
 *     note: string,            // free text, max 120 chars
 *     created_at: Timestamp,
 *     updated_at: Timestamp
 *   }
 */

(function () {

  const TODAY = new Date().toISOString().slice(0, 10);
  let _initialized = false;

  /* ── CSS ───────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('gw-daily-styles')) return;
    const s = document.createElement('style');
    s.id = 'gw-daily-styles';
    s.textContent = `
      /* FAB sits above action bar (which is ~72px + safe-area).
         z-index 95 — below nav (100) but above page content.
         Panel opens upward so it never goes behind nav. */
      .ds-widget{
        position:fixed;
        bottom:calc(76px + env(safe-area-inset-bottom));
        right:16px;
        z-index:95;
      }
      .ds-fab{
        width:48px;height:48px;
        border-radius:50%;
        background:var(--sage);
        color:#fff;
        border:none;
        cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        box-shadow:var(--s2);
        transition:var(--tr);
        font-size:20px;
        touch-action:manipulation;
      }
      .ds-fab:hover{transform:scale(1.07)}
      /* Logged state — muted green outline */
      .ds-fab.logged{
        background:var(--card);
        color:var(--sage);
        border:2px solid var(--sage);
      }
      .ds-panel{
        position:absolute;
        bottom:58px;right:0;
        width:290px;
        background:var(--card);
        border:1px solid var(--bdr);
        border-radius:var(--r);
        box-shadow:var(--s3);
        padding:20px;
        display:none;
        /* Cap height so it never extends behind the nav on short screens */
        max-height:calc(100dvh - var(--nav-h, 52px) - 100px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
        overflow-y:auto;
        -webkit-overflow-scrolling:touch;
      }
      .ds-panel.on{display:block}
      .ds-title{font-family:'Lora',serif;font-size:16px;color:var(--tx);margin-bottom:4px}
      .ds-sub{font-size:12px;color:var(--mu);margin-bottom:16px}
      .ds-label{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--mu);margin-bottom:8px;display:block}
      .ds-stars{display:flex;gap:6px;margin-bottom:16px}
      .ds-star{
        font-size:22px;cursor:pointer;opacity:.25;
        transition:opacity .1s;line-height:1;
        touch-action:manipulation;
        /* Ensure 44px tap target without changing visual size */
        padding:11px 4px;
        margin:-11px -4px;
      }
      .ds-star.on{opacity:1}
      .ds-stress-row{display:flex;align-items:center;gap:10px;margin-bottom:16px}
      .ds-stress-val{font-family:'Lora',serif;font-size:20px;color:var(--ac);width:24px;text-align:right}
      .ds-stress-track{
        flex:1;height:6px;border-radius:10px;
        background:var(--bdr);outline:none;
        -webkit-appearance:none;appearance:none;cursor:pointer;border:none;
      }
      .ds-stress-track::-webkit-slider-thumb{
        -webkit-appearance:none;
        width:22px;height:22px;border-radius:50%;
        background:var(--ac);border:2px solid var(--card);
        box-shadow:var(--s1);cursor:pointer;
      }
      .ds-stress-track::-moz-range-thumb{
        width:18px;height:18px;border-radius:50%;
        background:var(--ac);border:2px solid var(--card);
        box-shadow:var(--s1);cursor:pointer;
      }
      .ds-stress-track::-moz-range-track{
        height:6px;background:var(--bdr);border-radius:10px;border:none;
      }
      .ds-note{
        width:100%;background:var(--sur);
        border:1.5px solid var(--bdr);border-radius:var(--rsm);
        padding:10px 12px;font-family:'DM Sans',sans-serif;
        font-size:16px;color:var(--tx);outline:none;
        resize:none;min-height:56px;transition:var(--tr);margin-bottom:14px;
      }
      .ds-note:focus{border-color:var(--ac)}
      .ds-save{
        width:100%;background:var(--sage);color:#fff;
        border:none;border-radius:var(--pill);padding:11px;
        font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;
        cursor:pointer;transition:var(--tr);touch-action:manipulation;
      }
      .ds-save:hover{opacity:.9}
      .ds-save:disabled{opacity:.5;cursor:not-allowed}
      .ds-saved-note{font-size:12px;color:var(--sage);text-align:center;margin-top:8px;display:none}
      @media(max-width:420px){
        .ds-panel{width:calc(100vw - 32px);right:-8px}
      }
    `;
    document.head.appendChild(s);
  }

  /* ── WIDGET HTML ───────────────────────────────────────────────────────── */
  function buildWidget() {
    if (document.getElementById('ds-widget')) return; // already mounted
    const el = document.createElement('div');
    el.className = 'ds-widget';
    el.id = 'ds-widget';
    el.innerHTML = `
      <div class="ds-panel" id="ds-panel" role="dialog" aria-label="Daily state log" aria-modal="true">
        <div class="ds-title">Today's baseline</div>
        <div class="ds-sub">${TODAY} — takes 20 seconds</div>

        <label class="ds-label">Sleep quality</label>
        <div class="ds-stars" id="ds-stars" role="group" aria-label="Sleep quality 1 to 5">
          ${[1,2,3,4,5].map(i =>
            `<span class="ds-star" data-v="${i}" onclick="dsSetSleep(${i})"
              role="button" tabindex="0" aria-label="${i} star${i>1?'s':''}"
              onkeydown="if(event.key==='Enter'||event.key===' ')dsSetSleep(${i})"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>`
          ).join('')}
        </div>

        <label class="ds-label" for="ds-stress-range">Stress level</label>
        <div class="ds-stress-row">
          <input type="range" class="ds-stress-track" id="ds-stress-range"
            min="0" max="10" value="5"
            oninput="dsUpdateStress(this.value)"
            aria-label="Stress level 0 to 10">
          <div class="ds-stress-val" id="ds-stress-val">5</div>
        </div>

        <label class="ds-label" for="ds-note-input">One line <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></label>
        <textarea class="ds-note" id="ds-note-input"
          placeholder="How are you doing today?"
          maxlength="120" rows="2"></textarea>

        <button class="ds-save" id="ds-save-btn" onclick="dsSave()">Save today's state</button>
        <div class="ds-saved-note" id="ds-saved-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg>Saved</div>
      </div>

      <button class="ds-fab" id="ds-fab" onclick="dsToggle()"
        aria-label="Log daily state" aria-haspopup="dialog" aria-expanded="false">
        <span aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span>
      </button>
    `;
    document.body.appendChild(el);
  }

  /* ── STATE ─────────────────────────────────────────────────────────────── */
  let _db = null, _uid = null, _sleep = 0, _stress = 5;

  window.dsSetSleep = function (v) {
    _sleep = v;
    document.querySelectorAll('.ds-star').forEach(s =>
      s.classList.toggle('on', +s.dataset.v <= v)
    );
  };

  window.dsUpdateStress = function (v) {
    _stress = +v;
    const el = document.getElementById('ds-stress-val');
    if (el) el.textContent = v;
  };

  window.dsToggle = function () {
    const panel = document.getElementById('ds-panel');
    const fab   = document.getElementById('ds-fab');
    if (!panel) return;
    const open = panel.classList.toggle('on');
    if (fab) fab.setAttribute('aria-expanded', String(open));
    if (open) {
      // Small delay so the panel is visible before focus — avoids iOS scroll jump
      setTimeout(() => {
        const noteEl = document.getElementById('ds-note-input');
        if (noteEl) noteEl.focus();
      }, 50);
    }
  };

  window.dsSave = async function () {
    if (!_db || !_uid) return;
    const btn  = document.getElementById('ds-save-btn');
    const note = (document.getElementById('ds-note-input')?.value || '').trim().slice(0, 120);
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
      const { doc, setDoc, serverTimestamp } = await import(
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
      );
      const ref = doc(_db, 'users', _uid, 'dailystate', TODAY);
      await setDoc(ref, {
        date: TODAY,
        sleep: _sleep,
        stress: _stress,
        note,
        updated_at: serverTimestamp(),
        created_at: serverTimestamp(),
      }, { merge: true });

      const fab = document.getElementById('ds-fab');
      if (fab) {
        fab.classList.add('logged');
        fab.setAttribute('aria-label', 'Daily state logged — tap to edit');
      }
      const savedNote = document.getElementById('ds-saved-note');
      if (savedNote) savedNote.style.display = 'block';
      if (btn) btn.textContent = 'Saved';

      setTimeout(() => {
        const panel = document.getElementById('ds-panel');
        const fabEl = document.getElementById('ds-fab');
        if (panel) panel.classList.remove('on');
        if (fabEl) fabEl.setAttribute('aria-expanded', 'false');
      }, 1200);

    } catch (err) {
      console.error('Daily state save error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'Save today\'s state'; }
    }
  };

  /* ── CHECK IF ALREADY LOGGED TODAY ─────────────────────────────────────── */
  async function checkTodayLogged(db, uid) {
    try {
      const { doc, getDoc } = await import(
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
      );
      const snap = await getDoc(doc(db, 'users', uid, 'dailystate', TODAY));
      if (!snap.exists()) return;

      const data = snap.data();
      if (data.sleep)  window.dsSetSleep(data.sleep);
      if (data.stress !== undefined) {
        _stress = data.stress;
        const rangeEl = document.getElementById('ds-stress-range');
        const valEl   = document.getElementById('ds-stress-val');
        if (rangeEl) rangeEl.value = data.stress;
        if (valEl)   valEl.textContent = data.stress;
      }
      if (data.note) {
        const noteEl = document.getElementById('ds-note-input');
        if (noteEl) noteEl.value = data.note;
      }
      const fab = document.getElementById('ds-fab');
      if (fab) {
        fab.classList.add('logged');
        fab.setAttribute('aria-label', 'Daily state logged — tap to edit');
      }
    } catch (e) { /* non-critical — silently skip */ }
  }

  /* ── INIT ──────────────────────────────────────────────────────────────── */
  window.initDailyState = function (db, uid) {
    if (_initialized) return; // guard against double-init
    _initialized = true;
    _db  = db;
    _uid = uid;
    injectStyles();
    buildWidget();
    checkTodayLogged(db, uid);

    // Close panel on outside click
    document.addEventListener('click', e => {
      const widget = document.getElementById('ds-widget');
      if (widget && !widget.contains(e.target)) {
        const panel = document.getElementById('ds-panel');
        const fab   = document.getElementById('ds-fab');
        if (panel) panel.classList.remove('on');
        if (fab)   fab.setAttribute('aria-expanded', 'false');
      }
    });

    // Hide FAB when virtual keyboard is open (prevents overlap with action bar)
    if (window.visualViewport) {
      let lastHeight = window.visualViewport.height;
      window.visualViewport.addEventListener('resize', () => {
        const widget = document.getElementById('ds-widget');
        if (!widget) return;
        const keyboardOpen = window.visualViewport.height < lastHeight * 0.75;
        widget.style.display = keyboardOpen ? 'none' : '';
        if (!keyboardOpen) lastHeight = window.visualViewport.height;
      });
    }
  };

  /* ── AUTO-DETECT AUTH VIA MutationObserver ──────────────────────────────
   *
   * Replaces the old polling loop (which ran up to 40 × 500ms = 20 seconds).
   * Watches #app for the class change to 'on', which each page's Firebase
   * onAuthStateChanged already triggers. Falls back gracefully if #app
   * isn't in the DOM yet by waiting for DOMContentLoaded first.
   *
   * ─────────────────────────────────────────────────────────────────────── */
  function watchForAuth() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    // If auth already resolved before this script ran (e.g. fast cached load)
    if (appEl.classList.contains('on') && window._db && window._uid) {
      window.initDailyState(window._db, window._uid);
      return;
    }

    const observer = new MutationObserver(() => {
      if (appEl.classList.contains('on') && window._db && window._uid) {
        observer.disconnect();
        window.initDailyState(window._db, window._uid);
      }
    });

    observer.observe(appEl, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchForAuth);
  } else {
    watchForAuth();
  }

})();
