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
 *   The widget auto-initializes when a Firebase user is detected.
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

  /* ── CSS ───────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('gw-daily-styles')) return;
    const s = document.createElement('style');
    s.id = 'gw-daily-styles';
    s.textContent = `
      .ds-widget{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));right:16px;z-index:90}
      .ds-fab{width:48px;height:48px;border-radius:50%;background:var(--sage);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--s2);transition:var(--tr);font-size:20px;touch-action:manipulation}
      .ds-fab:hover{transform:scale(1.07)}
      .ds-fab.logged{background:var(--sagel);color:var(--sage);border:1.5px solid var(--sagem)}
      .ds-panel{position:absolute;bottom:58px;right:0;width:290px;background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);box-shadow:var(--s3);padding:20px;display:none;max-height:calc(100dvh - 180px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow-y:auto;-webkit-overflow-scrolling:touch}
      .ds-panel.on{display:block}
      .ds-title{font-family:'Lora',serif;font-size:16px;color:var(--tx);margin-bottom:4px}
      .ds-sub{font-size:12px;color:var(--mu);margin-bottom:16px}
      .ds-label{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--mu);margin-bottom:8px;display:block}
      .ds-stars{display:flex;gap:6px;margin-bottom:16px}
      .ds-star{font-size:22px;cursor:pointer;opacity:.3;transition:opacity .1s;line-height:1;touch-action:manipulation}
      .ds-star.on{opacity:1}
      .ds-stress-row{display:flex;align-items:center;gap:10px;margin-bottom:16px}
      .ds-stress-val{font-family:'Lora',serif;font-size:20px;color:var(--ac);width:24px;text-align:right}
      .ds-stress-track{flex:1;height:6px;border-radius:10px;background:var(--bdr);outline:none;-webkit-appearance:none;cursor:pointer}
      .ds-stress-track::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--ac);border:2px solid var(--card);box-shadow:var(--s1);cursor:pointer}
      .ds-note{width:100%;background:var(--sur);border:1.5px solid var(--bdr);border-radius:var(--rsm);padding:10px 12px;font-family:'DM Sans',sans-serif;font-size:16px;color:var(--tx);outline:none;resize:none;min-height:56px;transition:var(--tr);margin-bottom:14px}
      .ds-note:focus{border-color:var(--ac)}
      .ds-save{width:100%;background:var(--sage);color:#fff;border:none;border-radius:var(--pill);padding:11px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:var(--tr);touch-action:manipulation}
      .ds-save:hover{opacity:.9}
      .ds-save:disabled{opacity:.5;cursor:not-allowed}
      .ds-saved-note{font-size:12px;color:var(--sage);text-align:center;margin-top:8px;display:none}
      @media(max-width:420px){.ds-panel{width:calc(100vw - 32px);right:-8px}}
    `;
    document.head.appendChild(s);
  }

  /* ── WIDGET HTML ───────────────────────────────────────────────────────── */
  function buildWidget() {
    const el = document.createElement('div');
    el.className = 'ds-widget';
    el.id = 'ds-widget';
    el.innerHTML = `
      <div class="ds-panel" id="ds-panel" role="dialog" aria-label="Daily state log" aria-modal="true">
        <div class="ds-title">Today's baseline</div>
        <div class="ds-sub">${TODAY} — takes 20 seconds</div>
        <label class="ds-label">Sleep quality</label>
        <div class="ds-stars" id="ds-stars" role="group" aria-label="Sleep quality 1 to 5">
          ${[1,2,3,4,5].map(i => `<span class="ds-star" data-v="${i}" onclick="dsSetSleep(${i})" role="button" tabindex="0" aria-label="${i} star${i>1?'s':''}" onkeydown="if(event.key==='Enter'||event.key===' ')dsSetSleep(${i})">★</span>`).join('')}
        </div>
        <label class="ds-label" for="ds-stress-range">Stress level</label>
        <div class="ds-stress-row">
          <input type="range" class="ds-stress-track" id="ds-stress-range" min="0" max="10" value="5" oninput="dsUpdateStress(this.value)" aria-label="Stress level 0 to 10">
          <div class="ds-stress-val" id="ds-stress-val">5</div>
        </div>
        <label class="ds-label" for="ds-note-input">One line (optional)</label>
        <textarea class="ds-note" id="ds-note-input" placeholder="How are you doing today?" maxlength="120" rows="2"></textarea>
        <button class="ds-save" id="ds-save-btn" onclick="dsSave()">Save today's state</button>
        <div class="ds-saved-note" id="ds-saved-note">✓ Saved</div>
      </div>
      <button class="ds-fab" id="ds-fab" onclick="dsToggle()" aria-label="Log daily state" aria-haspopup="dialog" aria-expanded="false">
        <span aria-hidden="true">📋</span>
      </button>
    `;
    document.body.appendChild(el);
  }

  /* ── STATE ─────────────────────────────────────────────────────────────── */
  let _db = null, _uid = null, _sleep = 0, _stress = 5;

  window.dsSetSleep = function (v) {
    _sleep = v;
    document.querySelectorAll('.ds-star').forEach(s => s.classList.toggle('on', +s.dataset.v <= v));
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
      const noteEl = document.getElementById('ds-note-input');
      if (noteEl) noteEl.focus();
    }
  };

  window.dsSave = async function () {
    if (!_db || !_uid) return;
    const btn  = document.getElementById('ds-save-btn');
    const note = (document.getElementById('ds-note-input')?.value || '').trim().slice(0, 120);
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
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
      if (fab) { fab.classList.add('logged'); fab.setAttribute('aria-label', 'Daily state logged'); }
      const savedNote = document.getElementById('ds-saved-note');
      if (savedNote) savedNote.style.display = 'block';
      if (btn) { btn.textContent = 'Saved ✓'; }
      setTimeout(() => {
        const panel = document.getElementById('ds-panel');
        if (panel) panel.classList.remove('on');
        const fabEl = document.getElementById('ds-fab');
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
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const snap = await getDoc(doc(db, 'users', uid, 'dailystate', TODAY));
      if (snap.exists()) {
        const data = snap.data();
        // Pre-fill fields with today's logged values
        if (data.sleep) { window.dsSetSleep(data.sleep); }
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
        if (fab) { fab.classList.add('logged'); fab.setAttribute('aria-label', 'Daily state logged — tap to edit'); }
      }
    } catch (e) { /* non-critical */ }
  }

  /* ── INIT ──────────────────────────────────────────────────────────────── */
  window.initDailyState = function (db, uid) {
    _db  = db;
    _uid = uid;
    injectStyles();
    buildWidget();
    checkTodayLogged(db, uid);
    // Close on outside click
    document.addEventListener('click', e => {
      const widget = document.getElementById('ds-widget');
      if (widget && !widget.contains(e.target)) {
        const panel = document.getElementById('ds-panel');
        const fab   = document.getElementById('ds-fab');
        if (panel) panel.classList.remove('on');
        if (fab)   fab.setAttribute('aria-expanded', 'false');
      }
    });
  };

  /* ── AUTO-DETECT AUTH ──────────────────────────────────────────────────── */
  // Poll for Firebase auth state — works after onAuthStateChanged fires
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (attempts > 40) { clearInterval(poll); return; }
    const uid = window._uid;
    if (uid && window._db) {
      clearInterval(poll);
      window.initDailyState(window._db, uid);
    }
  }, 500);

})();
