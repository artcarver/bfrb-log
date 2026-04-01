import { auth, db, provider, signInWithPopup, onAuthStateChanged, fbSignOut } from './firebase-client.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

window._db = db;
window._uid = null;
window._currentDocId = null;

window.signInWithGoogle = async () => {
  try { await signInWithPopup(auth, provider); }
  catch(e) { if (e.code !== 'auth/popup-closed-by-user') console.error('Sign in error:', e); }
};
window.signOut = async () => { await fbSignOut(auth); };

onAuthStateChanged(auth, user => {
  window._uid = user ? user.uid : null;
  document.getElementById('auth-screen').classList.toggle('on', !user);
  document.getElementById('app').classList.toggle('on', !!user);
  if (user) {
    initSliders();
    handleArrivalParams();
  }
});

/* ── ARRIVAL FROM TOOLS PAGE ───────────────────────────────────── */
function handleArrivalParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('from') !== 'intervention') return;

  // Clean URL
  history.replaceState({}, '', 'index.html');

  // Pre-select outcome based on what happened in the tool
  const outcome = params.get('outcome');
  setTimeout(() => {
    if (outcome === 'held') {
      // Successfully resisted using a tool
      const resistedTag = document.querySelector('.outcome-resisted');
      if (resistedTag) resistedTag.click();
    } else if (outcome === 'caught') {
      // Used a tool but still picked
      const pickedTag = document.querySelector('.outcome-episode');
      if (pickedTag) pickedTag.click();
    }

    // Store surf data if present
    const surfPeak = params.get('surf_peak');
    const surfEnd = params.get('surf_end');
    if (surfPeak !== null) state.surf_peak = parseInt(surfPeak, 10);
    if (surfEnd !== null) state.surf_end = parseInt(surfEnd, 10);
  }, 100);
}

/* ── STATE ─────────────────────────────────────────────────────── */
const state = {
  outcome: null,      // 'resisted' | 'picked'
  awareness: null,    // 'Urge first' | 'Automatic'
  where: [],          // multi-select body areas
  timing: 'now',
  state: null,        // quick emotional state
  // full-mode fields:
  urge_before: 5,
  urge_after: 3,
  target: [],         // multi-select target types
  mirror: null,
  trigger: null,
  aftermath: null,
  duration: null,
  pattern: null,
  interventions: [],  // multi-select: what barriers/tools were in place
  environment: null,
  activity: null,
  notes: ''
};

let currentMode = localStorage.getItem('gw-log-mode') || 'quick';

/* ── MODE TOGGLE ───────────────────────────────────────────────── */
window.setMode = (mode) => {
  currentMode = mode;
  localStorage.setItem('gw-log-mode', mode);
  document.getElementById('mode-quick').classList.toggle('on', mode === 'quick');
  document.getElementById('mode-quick').setAttribute('aria-pressed', String(mode === 'quick'));
  document.getElementById('mode-full').classList.toggle('on', mode === 'full');
  document.getElementById('mode-full').setAttribute('aria-pressed', String(mode === 'full'));
  document.getElementById('full-fields').classList.toggle('on', mode === 'full');
};

document.addEventListener('DOMContentLoaded', () => { setMode(currentMode); initSliders(); });

/* ── OUTCOME ───────────────────────────────────────────────────── */
window.selectOutcome = (val, el) => {
  el.parentElement.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  state.outcome = val;
  if (navigator.vibrate) navigator.vibrate(10);

  document.getElementById('outcome-gated').style.display = 'block';

  const isPicked = val === 'picked';
  document.getElementById('awareness-field').style.display = isPicked ? 'block' : 'none';
  document.getElementById('aftermath-field').style.display = isPicked ? 'block' : 'none';
  document.getElementById('duration-field').style.display = isPicked ? 'block' : 'none';
  document.getElementById('pattern-field').style.display = isPicked ? 'block' : 'none';

  if (!isPicked) {
    state.awareness = null;
    state.aftermath = null;
    state.duration = null;
    state.pattern = null;
    state.urge_before = parseInt(document.getElementById('slider-urge-before')?.value || '5');
    // Reset awareness tags and show urge-before
    document.querySelectorAll('#awareness-field .tag').forEach(t => t.classList.remove('on'));
    const ubf = document.getElementById('urge-before-field');
    if (ubf) ubf.style.display = '';
  }

  const afterLabel = document.getElementById('urge-after-label');
  if (afterLabel) afterLabel.textContent = isPicked ? 'Urge after picking' : 'Urge after resisting';

  updateSaveBtn();
};

/* ── AWARENESS (controls urge slider visibility) ───────────────── */
window.selectAwareness = (val, el) => {
  const parent = el.closest('[role="group"]') || el.parentElement;
  const wasOn = el.classList.contains('on');
  parent.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  if (wasOn) {
    state.awareness = null;
    // Show urge sliders by default when deselected
    const ubf = document.getElementById('urge-before-field');
    if (ubf) ubf.style.display = '';
  } else {
    el.classList.add('on');
    if (navigator.vibrate) navigator.vibrate(10);
    state.awareness = val;
    const isAutomatic = val === 'Automatic';
    // Hide urge-before if automatic (there was no urge to rate)
    const ubf = document.getElementById('urge-before-field');
    if (ubf) ubf.style.display = isAutomatic ? 'none' : '';
    if (isAutomatic) state.urge_before = null;
    else state.urge_before = parseInt(document.getElementById('slider-urge-before')?.value || '5');
  }
};

/* ── TAG HELPERS ───────────────────────────────────────────────── */
window.selectTag = (key, el) => {
  const parent = el.closest('[role="group"]') || el.parentElement;
  const wasOn = el.classList.contains('on');
  parent.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  if (wasOn) {
    // Deselect
    state[key] = null;
  } else {
    el.classList.add('on');
    if (navigator.vibrate) navigator.vibrate(10);
    state[key] = el.textContent.trim();
  }
};

window.toggleMulti = (key, el) => {
  const val = el.textContent.trim();
  const arr = state[key];
  const idx = arr.indexOf(val);
  if (idx > -1) { arr.splice(idx, 1); el.classList.remove('on'); }
  else          { arr.push(val);      el.classList.add('on');    }
  if (key === 'where') updateAreaBadges();
};

/* ── BODY AREA GROUPS ──────────────────────────────────────────── */
window.toggleAreaGroup = (id, el) => {
  const sub = document.getElementById('sub-' + id);
  if (!sub) return;
  const isOpen = !sub.classList.contains('hidden');
  sub.classList.toggle('hidden', isOpen);
  el.classList.toggle('open', !isOpen);
};

function updateAreaBadges() {
  const groups = { face: 'sub-face', head: 'sub-head', arms: 'sub-arms', torso: 'sub-torso', legs: 'sub-legs' };
  for (const [id, subId] of Object.entries(groups)) {
    const sub = document.getElementById(subId);
    const badge = document.getElementById('badge-' + id);
    if (!sub || !badge) continue;
    const count = sub.querySelectorAll('.tag.on').length;
    badge.textContent = count > 0 ? count : '';
  }
}

/* ── TIMING ────────────────────────────────────────────────────── */
window.selectTiming = (val, el) => {
  el.parentElement.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  state.timing = val;
  const timeWrap  = document.getElementById('time-wrap');
  const timeInput = document.getElementById('log-time');
  timeWrap.classList.toggle('hidden', val !== 'earlier');
  if (val === 'earlier' && !timeInput.value) {
    const d = new Date(Date.now() - 30 * 60000);
    const pad = n => String(n).padStart(2, '0');
    timeInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
};

/* ── SLIDER ────────────────────────────────────────────────────── */
const SLIDER_WORDS = ['','Minimal','Low','Mild','Moderate','Noticeable','Elevated','High','Very high','Intense','Extreme'];

window.updateSlider = (el, valId, key, wordId) => {
  const v = parseInt(el.value);
  const pct = ((v - 1) / 9) * 100;
  el.style.background = `linear-gradient(to right, var(--ac) ${pct}%, var(--bdr) ${pct}%)`;
  document.getElementById(valId).textContent = v;
  if (wordId) {
    const wordEl = document.getElementById(wordId);
    if (wordEl) wordEl.textContent = SLIDER_WORDS[v] || '';
  }
  state[key] = v;
};

function initSliders() {
  const s = document.getElementById('slider-urge-before');
  const sa = document.getElementById('slider-urge-after');
  if (s)  updateSlider(s,  'urge-before-val', 'urge_before', 'urge-before-word');
  if (sa) { sa.value = 3; updateSlider(sa, 'urge-after-val', 'urge_after', 'urge-after-word'); }
}

/* ── OTHER INPUT ───────────────────────────────────────────────── */
window.showOther = function(key, tagEl) {
  const wrap = document.getElementById(`other-${key}`);
  if (!wrap) return;
  wrap.classList.add('on');
  const input = wrap.querySelector('.other-input');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
};

window.cancelOtherInput = function(key) {
  setTimeout(() => {
    const wrap = document.getElementById(`other-${key}`);
    if (wrap) {
      const input = wrap.querySelector('.other-input');
      if (input && !input.value.trim()) wrap.classList.remove('on');
    }
  }, 300);
};

window.confirmOtherVal = function(key, isMulti, inputEl) {
  const val = (inputEl?.value || '').trim();
  if (!val) return;

  if (isMulti) {
    const arr = state[key] || [];
    if (!arr.includes(val)) { arr.push(val); state[key] = arr; }
  } else {
    state[key] = val;
  }

  const wrap = document.getElementById(`other-${key}`);
  if (wrap) {
    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'tag on';
    tag.textContent = val;
    if (isMulti) {
      tag.onclick = function() { toggleMulti(key, this); };
    } else {
      tag.onclick = function() {
        const wasOn = this.classList.contains('on');
        this.closest('[role="group"]')?.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
        if (wasOn) {
          state[key] = null;
        } else {
          this.classList.add('on');
          state[key] = val;
        }
      };
    }
    // Insert inside the tag group, before the "Other..." button
    const otherBtn = wrap.parentElement.querySelector('.tag-other');
    const group = wrap.previousElementSibling || wrap.parentElement.querySelector('[role="group"]');
    if (otherBtn && otherBtn.parentElement) {
      otherBtn.parentElement.insertBefore(tag, otherBtn);
    } else if (group) {
      group.appendChild(tag);
    } else {
      wrap.parentElement.insertBefore(tag, wrap);
    }
    wrap.classList.remove('on');
    inputEl.value = '';
  }
  updateSaveBtn();
};

/* ── SAVE BTN STATE ────────────────────────────────────────────── */
function updateSaveBtn() {
  const btn = document.getElementById('btn-save');
  const ready = !!state.outcome;
  btn.disabled = !ready;
  btn.classList.toggle('inactive', !ready);
  if (ready) {
    btn.textContent = state.outcome === 'resisted' ? 'Log resistance' : 'Log episode';
  } else {
    btn.textContent = 'Save';
  }
}

/* ── SAVE ──────────────────────────────────────────────────────── */
window.saveEntry = async () => {
  if (!state.outcome) { showToast('Choose an outcome first', true); return; }

  const btn = document.getElementById('btn-save');
  btn.disabled = true; btn.textContent = 'Saving...';

  const entryType = state.outcome === 'resisted' ? 'resisted' : 'did';

  const docData = {
    bfrb_type:          'picking',
    entry_type:         entryType,
    pre_feeling:        state.state || '',
    body_areas:         state.where.join(', '),
    awareness:          state.awareness || '',
    narrative_notes:    (document.getElementById('notes')?.value || '').trim(),
    created_at:         document.getElementById('log-time')?.value
                          ? new Date(document.getElementById('log-time').value)
                          : new Date(),
  };

  // Full mode fields
  if (currentMode === 'full') {
    docData.urge_before   = state.urge_before;
    docData.urge_after    = state.urge_after;
    docData.target        = state.target.join(', ');
    docData.mirror        = state.mirror || '';
    docData.primary_trigger = state.trigger || '';
    docData.environment   = state.environment || '';
    docData.activity      = state.activity || '';
    if (state.interventions.length > 0) {
      docData.tried_intervention = true;
      docData.interventions = state.interventions.join(', ');
    }
  }

  if (entryType === 'did') {
    docData.post_ritual   = state.aftermath || '';
    docData.duration      = state.duration || '';
    docData.escalation    = state.pattern || '';
  }

  // Surf data from tools page
  if (state.surf_peak !== undefined) docData.surf_peak = state.surf_peak;
  if (state.surf_end !== undefined) docData.surf_end = state.surf_end;

  try {
    const docRef = await addDoc(collection(db, 'users', window._uid, 'entries'), docData);
    window._currentDocId = docRef.id;

    document.getElementById('success-title').textContent = 'Logged.';
    document.getElementById('success-body').textContent = '';

    const iconEl = document.getElementById('success-icon');
    if (iconEl) {
      iconEl.className = 'success-icon ' + (entryType === 'resisted' ? 'resisted' : 'episode');
    }

    document.getElementById('log-form').classList.add('hidden');
    document.getElementById('bar-save').classList.add('hidden');
    document.getElementById('screen-success').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch(e) {
    console.error('Save error:', e);
    btn.disabled = false; btn.textContent = 'Save'; btn.classList.add('inactive');
    if (e.code === 'resource-exhausted' || (e.message && e.message.toLowerCase().includes('quota'))) {
      showToast('Daily write limit reached -- try again tomorrow', true);
    } else {
      showToast('Error saving -- try again', true);
    }
  }
};

/* ── RESET ─────────────────────────────────────────────────────── */
window.resetForm = () => {
  state.outcome = null;
  state.awareness = null;
  state.where = [];
  state.timing = 'now';
  state.state = null;
  state.urge_before = 5;
  state.urge_after = 3;
  state.target = [];
  state.mirror = null;
  state.trigger = null;
  state.aftermath = null;
  state.duration = null;
  state.pattern = null;
  state.interventions = [];
  state.environment = null;
  state.activity = null;
  state.notes = '';
  window._currentDocId = null;

  document.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.body-area-sub').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.body-area-parent').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.area-badge').forEach(b => b.textContent = '');
  document.getElementById('outcome-gated').style.display = 'none';
  document.getElementById('awareness-field').style.display = 'none';
  document.getElementById('aftermath-field').style.display = 'none';
  document.getElementById('duration-field').style.display = 'none';
  document.getElementById('pattern-field').style.display = 'none';
  const ubf = document.getElementById('urge-before-field');
  if (ubf) ubf.style.display = '';
  document.getElementById('notes').value = '';
  document.getElementById('log-time').value = '';
  document.getElementById('time-wrap').classList.add('hidden');

  // Reset timing "Right now" to on
  const timingTags = document.querySelectorAll('#log-form [aria-label="Timing"] .tag');
  if (timingTags[0]) timingTags[0].classList.add('on');

  const s = document.getElementById('slider-urge-before');
  const sa = document.getElementById('slider-urge-after');
  if (s) { s.value = 5; updateSlider(s, 'urge-before-val', 'urge_before', 'urge-before-word'); }
  if (sa) { sa.value = 3; updateSlider(sa, 'urge-after-val', 'urge_after', 'urge-after-word'); }

  const btn = document.getElementById('btn-save');
  btn.disabled = true; btn.textContent = 'Save'; btn.classList.add('inactive');

  document.getElementById('log-form').classList.remove('hidden');
  document.getElementById('bar-save').classList.remove('hidden');
  document.getElementById('screen-success').classList.add('hidden');
  setMode(currentMode);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ── TOAST ─────────────────────────────────────────────────────── */
window.showToast = (msg, isErr = false) => {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
};

/* ── ENTER KEY ─────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (!document.getElementById('log-form').classList.contains('hidden')) {
    e.preventDefault();
    document.getElementById('btn-save').click();
  }
});
