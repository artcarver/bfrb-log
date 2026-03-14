import { auth, db, provider, signInWithPopup, onAuthStateChanged, fbSignOut } from './firebase-client.js';
import { collection, addDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleArrivalParams);
    } else {
      handleArrivalParams();
    }
  }
});

const state = {
  core: {
    timing: 'now', bfrb: null, outcome: null,
    where: [], what: [],
    ritual: null, awareness: null, duration: null,
    urge: 5, urge_after: null,
    pre_feeling: null, mirror: null, skin_impact: null
  },
  ctx: {
    pre_action: null, trigger: null, environment: null,
    activity: null, escalation: null, aftercare: null,
    post_feeling: null, tried_tool: null, tools: [], eff: null
  }
};

let currentMode = localStorage.getItem('gw-log-mode') || 'quick';

window.setMode = (mode) => {
  currentMode = mode;
  localStorage.setItem('gw-log-mode', mode);

  document.getElementById('mode-quick').classList.toggle('on', mode === 'quick');
  document.getElementById('mode-quick').setAttribute('aria-pressed', String(mode === 'quick'));
  document.getElementById('mode-full').classList.toggle('on', mode === 'full');
  document.getElementById('mode-full').setAttribute('aria-pressed', String(mode === 'full'));

  const isFullMode = mode === 'full';
  document.getElementById('full-core').classList.toggle('on', isFullMode);
  document.getElementById('full-ctx').classList.toggle('on', isFullMode);
};

document.addEventListener('DOMContentLoaded', () => { setMode(currentMode); initSliders(); });

let _pendingArrival = null;

function handleArrivalParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('from') !== 'intervention') return;

  _pendingArrival = { outcome: params.get('outcome'), tool: params.get('tool') };

  const surfPeak = params.get('surf_peak');
  const surfEnd  = params.get('surf_end');
  if (surfPeak !== null) state.core.surf_peak = parseInt(surfPeak, 10);
  if (surfEnd  !== null) state.core.surf_end  = parseInt(surfEnd,  10);

  history.replaceState({}, '', 'index.html');

  const pickingTag = document.querySelector('.behavior-tag');
  if (pickingTag) pickingTag.click();
}

function applyPendingArrival() {
  if (!_pendingArrival) return;
  const { outcome, tool } = _pendingArrival;
  _pendingArrival = null;

  if (outcome === 'held') {
    const tag = [...document.querySelectorAll('#outcome-grid .tag')].find(t => t.textContent.trim() === 'Resisted');
    if (tag) tag.click();
  } else if (outcome === 'failed') {
    const tag = [...document.querySelectorAll('#outcome-grid .tag')].find(t => t.textContent.trim() === 'Full episode');
    if (tag) tag.click();
  }

  if (tool) {
    const yesTag = document.getElementById('int-yes-tag');
    if (yesTag) yesTag.click();
    
    // Bug fix applied here
    const toolMap = {
      motor: 'Competing Response', decouple: 'Decoupling Redirect',
      surf:  'Urge Surfing',       unhook:   'Cognitive Defusion',
      shock: 'Fidget / Sensory',   ground:   'Grounding / Breathing',
    };
    
    const label = toolMap[tool];
    if (label) {
      const toolTag = [...document.querySelectorAll('#tools-grid .tag')].find(t => t.textContent.trim() === label);
      if (toolTag) toolTag.click();
    }
  }
}

function updateSaveBtn() {
  const btn = document.getElementById('btn-save-all');
  const ready = !!(state.core.bfrb && state.core.outcome);
  btn.disabled = !ready;
  btn.classList.toggle('inactive', !ready);
  if (ready) {
    const labels = {
      'Resisted':   'Log resistance',
      'Near Miss':  'Log near miss',
      'Caught':     'Log caught mid-act',
      'Episode':    'Log episode'
    };
    btn.textContent = labels[state.core.outcome] || 'Save';
  } else {
    btn.textContent = 'Save';
  }
}

window.selectTiming = (val, el) => {
  el.parentElement.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  state.core.timing = val;
  const timeWrap  = document.getElementById('core-time-wrap');
  const timeInput = document.getElementById('core-time');
  timeWrap.classList.toggle('hidden', val !== 'earlier');
  if (val === 'earlier' && !timeInput.value) {
    const d = new Date(Date.now() - 30 * 60000);
    const pad = n => String(n).padStart(2, '0');
    timeInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
};

window.selectBehavior = (val, el) => {
  el.parentElement.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  state.core.bfrb  = val;
  state.core.where = [];
  state.core.what  = [];
  state.core.outcome = null;

  document.getElementById('behavior-gated').style.display = 'block';

  document.querySelectorAll('#outcome-grid .tag').forEach(t => t.classList.remove('on'));
  document.getElementById('outcome-gated').style.display = 'none';

  document.querySelectorAll('.area-sub').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.area-parent').forEach(p => p.classList.remove('open'));

  const pickVis = val === 'picking' ? '' : 'none';
  const biteVis = val === 'biting'  ? '' : 'none';
  document.getElementById('where-tags-picking').style.display = pickVis;
  document.getElementById('where-tags-biting').style.display  = biteVis;
  document.getElementById('what-tags-picking').style.display  = pickVis;
  document.getElementById('what-tags-biting').style.display   = biteVis;
  document.querySelectorAll('#where-field .tag, #what-field .tag').forEach(t => t.classList.remove('on'));

  const preActionPicking = document.getElementById('pre-actions-picking');
  const preActionBiting  = document.getElementById('pre-actions-biting');
  if (preActionPicking) preActionPicking.style.display = pickVis;
  if (preActionBiting)  preActionBiting.style.display  = biteVis;
  state.ctx.pre_action = null;
  document.querySelectorAll('#pre-actions-picking .tag, #pre-actions-biting .tag').forEach(t => t.classList.remove('on'));

  const mirrorField = document.getElementById('mirror-field');
  if (mirrorField) mirrorField.style.display = val === 'picking' ? 'block' : 'none';
  if (val !== 'picking') {
    state.core.mirror = null; state.core.skin_impact = null; state.ctx.aftercare = null;
  }

  const isBiting = val === 'biting';
  const preFeelingLabel = document.getElementById('pre-feeling-label');
  const preFeelingHint  = document.getElementById('pre-feeling-hint');
  if (preFeelingLabel) preFeelingLabel.textContent = isBiting ? 'State before (if noticed)' : 'State before';
  if (preFeelingHint)  preFeelingHint.textContent  = isBiting
    ? 'Biting often happens automatically with no felt emotional state. Log it if you noticed one, skip if you truly weren\'t aware of any feeling.'
    : 'The emotional state that preceded the behavior — this tells you what need it was serving (relief from anxiety, stimulation when bored, etc.).';

  const pickingUrgeWrap = document.getElementById('urge-before-picking-wrap');
  const bitingUrgeWrap  = document.getElementById('urge-before-biting-wrap');
  if (pickingUrgeWrap) pickingUrgeWrap.style.display = isBiting ? 'none' : '';
  if (bitingUrgeWrap)  bitingUrgeWrap.style.display  = isBiting ? '' : 'none';

  if (bitingUrgeWrap) {
    bitingUrgeWrap.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
    const bSlider = document.getElementById('biting-urge-slider');
    if (bSlider) bSlider.style.display = 'none';
  }
  if (isBiting) { state.core.urge = null; }
  else {
    state.core.urge = 5;
    const s = document.getElementById('core-urge');
    if (s) { s.value = 5; updateSlider(s, 'core-urge-val', 'urge', 'core-urge-word'); }
  }

  updateSaveBtn();

  setTimeout(() => {
    applyPendingArrival();
    const outcomeField = document.querySelector('#outcome-grid');
    if (outcomeField) outcomeField.closest('.field')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
};

window.selectOutcome = (val, el) => {
  el.parentElement.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  state.core.outcome = val;
  if (navigator.vibrate) navigator.vibrate(10);

  document.getElementById('outcome-gated').style.display = 'block';

  const isResisted  = val === 'Resisted';
  const isNearMiss  = val === 'Near Miss';
  const isCaught    = val === 'Caught';
  const isEpisode   = val === 'Episode';
  const showDetails = isNearMiss || isCaught || isEpisode;

  const awarenessField = document.getElementById('awareness-field');
  document.querySelectorAll('#awareness-field .tag').forEach(t => t.classList.remove('on'));
  state.core.awareness = null;
  if (awarenessField) awarenessField.style.display = isResisted ? 'none' : 'block';

  const afterLabel = document.getElementById('urge-after-label');
  if (isResisted)      afterLabel.textContent = 'Urge relief after resisting';
  else if (isNearMiss) afterLabel.textContent = 'Urge level after near miss';
  else if (isCaught)   afterLabel.textContent = 'Urge level after stopping';
  else if (isEpisode)  afterLabel.textContent = 'Urge level after episode';

  document.getElementById('core-details').classList.toggle('hidden', !showDetails);

  if (isEpisode) {
    document.getElementById('ritual-field').style.display = 'block';
    const isBiting = state.core.bfrb === 'biting';
    document.getElementById('ritual-tags-picking').style.display = isBiting ? 'none' : '';
    document.getElementById('ritual-tags-biting').style.display  = isBiting ? '' : 'none';
    state.core.ritual = null;
    document.querySelectorAll('#ritual-field .tag').forEach(t => t.classList.remove('on'));
  } else {
    document.getElementById('ritual-field').style.display = 'none';
  }

  document.getElementById('skin-impact-field').style.display =
    (isEpisode && state.core.bfrb === 'picking') ? 'block' : 'none';

  const mirrorField = document.getElementById('mirror-field');
  if (mirrorField && state.core.bfrb === 'picking') {
    mirrorField.style.display = showDetails ? 'block' : 'none';
  }

  if (!showDetails) {
    state.core.where = []; state.core.what = [];
    state.core.duration = null; state.core.ritual = null; state.core.skin_impact = null;
    document.querySelectorAll('#core-details .tag').forEach(t => t.classList.remove('on'));
  }

  document.getElementById('post-feeling-field').style.display = 'block';
  document.getElementById('escalation-field').style.display   = isEpisode ? 'block' : 'none';
  document.getElementById('aftercare-field').style.display    =
    (isEpisode && state.core.bfrb === 'picking') ? 'block' : 'none';

  if (!isEpisode) {
    state.ctx.escalation = null;
    document.querySelectorAll('#escalation-field .tag').forEach(t => t.classList.remove('on'));
  }

  if (currentMode === 'full') {
    document.getElementById('full-ctx').classList.add('on');
  }

  updateSaveBtn();
};

window.selectTag = (level, key, el) => {
  const parent = el.closest('[role="group"]') || el.parentElement;
  parent.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  if (navigator.vibrate) navigator.vibrate(10);
  const rawText = Array.from(el.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent.trim())
    .find(t => t.length > 0) || el.textContent.trim();
  const awarenessMap = {
    'Urge came first':        'Urge first',
    'Noticed while doing it': 'Mid-action',
    'Only noticed after':     'Automatic',
  };
  state[level][key] = awarenessMap[rawText] || rawText;
};

window.toggleArea = (id, el) => {
  const sub = document.getElementById('area-' + id);
  if (!sub) return;
  const isOpen = !sub.classList.contains('hidden');
  sub.classList.toggle('hidden', isOpen);
  el.classList.toggle('open', !isOpen);
  if (isOpen) {
    sub.querySelectorAll('.tag.on').forEach(t => {
      const idx = state.core.where.indexOf(t.textContent.trim());
      if (idx > -1) state.core.where.splice(idx, 1);
      t.classList.remove('on');
    });
  }
};

window.toggleMultiTag = (level, key, el) => {
  const val = el.textContent.trim();
  const arr = state[level][key];
  const idx = arr.indexOf(val);
  if (idx > -1) { arr.splice(idx, 1); el.classList.remove('on'); }
  else          { arr.push(val);      el.classList.add('on');    }
};

window.updateSlider = (el, valId, key, wordId) => {
  const v = parseInt(el.value);
  const pct = ((v - 1) / 9) * 100;
  el.style.background = `linear-gradient(to right, var(--ac) ${pct}%, var(--bdr) ${pct}%)`;
  document.getElementById(valId).textContent = v;
  if (wordId) {
    const wordEl = document.getElementById(wordId);
    if (wordEl) {
      const words = ['','Minimal','Low','Mild','Moderate','Noticeable','Elevated','High','Very high','Intense','Extreme'];
      wordEl.textContent = words[v] || '';
    }
  }
  state.core[key] = v;
};

function initSliders() {
  const s  = document.getElementById('core-urge');
  const sb = document.getElementById('core-urge-biting');
  const sa = document.getElementById('core-urge-after');
  if (s)  updateSlider(s,  'core-urge-val',        'urge',       'core-urge-word');
  if (sb) updateSlider(sb, 'core-urge-biting-val',  'urge',       'core-urge-biting-word');
  if (sa) {
    const v = 3;
    const pct = ((v - 1) / 9) * 100;
    sa.style.background = `linear-gradient(to right, var(--ac) ${pct}%, var(--bdr) ${pct}%)`;
    document.getElementById('core-urge-after-val').textContent = v;
    const wordEl = document.getElementById('core-urge-after-word');
    if (wordEl) wordEl.textContent = 'Mild';
  }
}

window.setBitingUrge = function(hadUrge, el) {
  el.parentElement.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  const sliderWrap = document.getElementById('biting-urge-slider');
  if (hadUrge) {
    sliderWrap.style.display = 'block';
    const s = document.getElementById('core-urge-biting');
    if (s) { s.value = 5; updateSlider(s, 'core-urge-biting-val', 'urge', 'core-urge-biting-word'); }
  } else {
    sliderWrap.style.display = 'none';
    state.core.urge = null;
  }
};

window.toggleIntervention = (didTry, el) => {
  el.parentElement.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  state.ctx.tried_tool = didTry;
  document.getElementById('intervention-block').classList.toggle('hidden', !didTry);
};

window.showToast = (msg, isErr = false) => {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast' + (isErr ? ' err' : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
};

window.saveAll = async () => {
  if (!state.core.bfrb)    { showToast('Choose a behaviour first', true); return; }
  if (!state.core.outcome) { showToast('Choose an outcome first', true);  return; }

  const btn = document.getElementById('btn-save-all');
  btn.disabled = true; btn.textContent = 'Saving…';

  const outcomeKey =
    state.core.outcome === 'Near Miss' ? 'near_miss' :
    state.core.outcome === 'Episode'   ? 'did'       :
    state.core.outcome === 'Caught'    ? 'caught'    : 'resisted';

  const docData = {
    bfrb_type:                  state.core.bfrb,
    entry_type:                 outcomeKey,
    urge_before:                state.core.urge,
    urge_after:                 state.core.urge_after,
    pre_feeling:                state.core.pre_feeling  || '',
    awareness:                  state.core.awareness    || '',
    created_at:                 document.getElementById('core-time')?.value
                                  ? new Date(document.getElementById('core-time').value)
                                  : serverTimestamp(),
    pre_action:                 state.ctx.pre_action    || '',
    primary_trigger:            state.ctx.trigger       || '',
    environment:                state.ctx.environment   || '',
    activity:                   state.ctx.activity      || '',
    escalation:                 state.ctx.escalation    || '',
    aftercare:                  state.ctx.aftercare     || '',
    post_feeling:               state.ctx.post_feeling  || '',
    tried_intervention:         state.ctx.tried_tool === true,
    interventions:              state.ctx.tools.join(', '),
    intervention_effectiveness: state.ctx.eff ? parseInt(state.ctx.eff) : null,
    narrative_notes:            (document.getElementById('narrative-notes')?.value || '').trim(),
    ...(state.core.surf_peak !== undefined ? { surf_peak: state.core.surf_peak } : {}),
    ...(state.core.surf_end  !== undefined ? { surf_end:  state.core.surf_end  } : {}),
  };

  if (outcomeKey !== 'resisted') {
    docData.body_areas = state.core.where.join(', ');
    docData.target     = state.core.what.join(', ');
    docData.duration   = state.core.duration || '';
    if (outcomeKey === 'did') docData.post_ritual = state.core.ritual || '';
  }
  if (state.core.bfrb === 'picking') {
    docData.mirror = state.core.mirror || '';
    if (outcomeKey === 'did') docData.skin_impact = state.core.skin_impact || '';
  }

  try {
    const docRef = await addDoc(collection(db, 'users', window._uid, 'entries'), docData);
    window._currentDocId = docRef.id;

    document.getElementById('success-title').textContent = 'Logged.';
    document.getElementById('success-body').textContent  = '';

    const iconEl = document.getElementById('success-icon');
    if (iconEl) {
      iconEl.className = 'success-icon ' + (
        outcomeKey === 'resisted'  ? 'resisted' :
        outcomeKey === 'caught'    ? 'caught'   :
        outcomeKey === 'near_miss' ? 'nearmiss' : 'episode'
      );
    }

    const isActive = outcomeKey === 'near_miss' || outcomeKey === 'caught' || outcomeKey === 'did';
    document.getElementById('success-cta-primary').style.display  = isActive  ? 'block' : 'none';
    document.getElementById('success-cta-resisted').style.display = !isActive ? 'block' : 'none';

    document.getElementById('log-form').classList.add('hidden');
    document.getElementById('bar-save').classList.add('hidden');
    document.getElementById('screen-success').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch(e) {
    console.error('Save error:', e);
    btn.disabled = false; btn.textContent = 'Save'; btn.classList.add('inactive');
    if (e.code === 'resource-exhausted' || (e.message && e.message.toLowerCase().includes('quota'))) {
      showToast('Daily write limit reached — try again tomorrow', true);
    } else {
      showToast('Error saving — try again', true);
    }
  }
};

window.resetForm = () => {
  state.core = {
    timing: 'now', bfrb: null, outcome: null,
    where: [], what: [], ritual: null, awareness: null, duration: null,
    urge: 5, urge_after: null, pre_feeling: null, mirror: null, skin_impact: null
  };
  state.ctx = {
    pre_action: null, trigger: null, environment: null,
    activity: null, escalation: null, aftercare: null,
    post_feeling: null, tried_tool: null, tools: [], eff: null
  };
  window._currentDocId = null;

  document.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.area-sub').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.area-parent').forEach(p => p.classList.remove('open'));

  document.getElementById('behavior-gated').style.display  = 'none';
  document.getElementById('outcome-gated').style.display   = 'none';
  document.getElementById('ctx-gated').style.display       = 'none';
  document.getElementById('core-details').classList.add('hidden');
  document.getElementById('ritual-field').style.display    = 'none';
  document.getElementById('post-feeling-field').style.display = 'none';
  document.getElementById('aftercare-field').style.display = 'none';
  document.getElementById('escalation-field').style.display= 'none';
  document.getElementById('mirror-field').style.display    = 'none';
  document.getElementById('skin-impact-field').style.display = 'none';
  document.getElementById('intervention-block').classList.add('hidden');
  document.getElementById('awareness-field').style.display = 'block';

  const pap = document.getElementById('pre-actions-picking');
  const pab = document.getElementById('pre-actions-biting');
  if (pap) pap.style.display = 'none';
  if (pab) pab.style.display = 'none';

  document.getElementById('narrative-notes').value = '';
  document.getElementById('urge-after-label').textContent = 'Urge level after';

  document.getElementById('core-time').value = '';
  document.getElementById('core-time-wrap').classList.add('hidden');

  const timingTags = document.querySelectorAll('#timing-field .grid-2 .tag');
  if (timingTags[0]) timingTags[0].classList.add('on');

  const pickingUrgeWrap = document.getElementById('urge-before-picking-wrap');
  const bitingUrgeWrap  = document.getElementById('urge-before-biting-wrap');
  if (pickingUrgeWrap) pickingUrgeWrap.style.display = '';
  if (bitingUrgeWrap)  {
    bitingUrgeWrap.style.display = 'none';
    bitingUrgeWrap.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  }
  const bSlider = document.getElementById('biting-urge-slider');
  if (bSlider) bSlider.style.display = 'none';

  const preFeelingLabel = document.getElementById('pre-feeling-label');
  if (preFeelingLabel) preFeelingLabel.textContent = 'State before';

  const pickRitual = document.getElementById('ritual-tags-picking');
  const biteRitual = document.getElementById('ritual-tags-biting');
  if (pickRitual) pickRitual.style.display = 'none';
  if (biteRitual) biteRitual.style.display = 'none';

  const s  = document.getElementById('core-urge');
  const sa = document.getElementById('core-urge-after');
  s.value = 5;  updateSlider(s, 'core-urge-val', 'urge', 'core-urge-word');
  if (sa) {
    sa.value = 3;
    const pct = ((3 - 1) / 9) * 100;
    sa.style.background = `linear-gradient(to right, var(--ac) ${pct}%, var(--bdr) ${pct}%)`;
    document.getElementById('core-urge-after-val').textContent = 3;
    const wordEl = document.getElementById('core-urge-after-word');
    if (wordEl) wordEl.textContent = 'Mild';
  }

  const btn = document.getElementById('btn-save-all');
  btn.disabled = true; btn.textContent = 'Save'; btn.classList.add('inactive');

  document.getElementById('log-form').classList.remove('hidden');
  document.getElementById('bar-save').classList.remove('hidden');
  document.getElementById('screen-success').classList.add('hidden');
  setMode(currentMode);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const OTHER_KEY_MAP = {
  'core-pre_feeling':    { level:'core', key:'pre_feeling',  multi:false },
  'core-where_pick':     { level:'core', key:'where',        multi:true  },
  'core-what_pick':      { level:'core', key:'what',         multi:true  },
  'core-what_bite':      { level:'core', key:'what',         multi:true  },
  'core-duration':       { level:'core', key:'duration',     multi:false },
  'core-ritual':         { level:'core', key:'ritual',       multi:false },
  'ctx-pre_action_pick': { level:'ctx',  key:'pre_action',   multi:false },
  'ctx-pre_action_bite': { level:'ctx',  key:'pre_action',   multi:false },
  'ctx-trigger':         { level:'ctx',  key:'trigger',      multi:false },
  'ctx-environment':     { level:'ctx',  key:'environment',  multi:false },
  'ctx-activity':        { level:'ctx',  key:'activity',     multi:false },
  'ctx-escalation':      { level:'ctx',  key:'escalation',   multi:false },
  'ctx-post_feeling':    { level:'ctx',  key:'post_feeling', multi:false },
  'ctx-tools':           { level:'ctx',  key:'tools',        multi:true  },
};

window.otherSingle = function(level, key, tagEl) {
  tagEl.parentElement.querySelectorAll('.tag:not(.tag-other)').forEach(t => t.classList.remove('on'));
  showOtherInput(level, key);
};
window.otherMulti = function(level, key, tagEl) { showOtherInput(level, key); };

function showOtherInput(level, key) {
  const wrap = document.getElementById(`other-${level}-${key}`);
  if (!wrap) return;
  wrap.classList.add('on');
  const input = wrap.querySelector('.other-input');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
}

window.cancelOther = function(level, key) {
  setTimeout(() => {
    const wrap = document.getElementById(`other-${level}-${key}`);
    if (wrap) {
      const input = wrap.querySelector('.other-input');
      if (input && !input.value.trim()) wrap.classList.remove('on');
    }
  }, 300);
};

window.confirmOther = function(level, key, isMulti, inputEl) {
  const val = (inputEl?.value || '').trim();
  if (!val) return;

  if (isMulti) {
    const arr = state[level][key] || [];
    if (!arr.includes(val)) { arr.push(val); state[level][key] = arr; }
  } else {
    state[level][key] = val;
  }

  persistOtherValue(level, key, val);

  const wrap = document.getElementById(`other-${level}-${key}`);
  if (wrap) {
    const tag = document.createElement('div');
    tag.className = 'tag on';
    tag.textContent = val;
    tag.setAttribute('data-custom', '1');
    tag.setAttribute('role', 'button');
    tag.setAttribute('tabindex', '0');
    tag.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tag.click(); } });
    if (isMulti) {
      tag.onclick = function() { toggleMultiTag(level, key, this); };
    } else {
      tag.onclick = function() {
        this.closest('[role="group"]')?.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
        this.classList.add('on');
        state[level][key] = val;
      };
    }
    wrap.parentElement.insertBefore(tag, wrap);
    wrap.classList.remove('on');
    inputEl.value = '';
  }
  updateSaveBtn();
};

function persistOtherValue(level, key, val) {
  const storeKey = 'gw-other-values';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch(e) {}
  const fieldKey = `${level}.${key}`;
  if (!store[fieldKey]) store[fieldKey] = {};
  store[fieldKey][val] = (store[fieldKey][val] || 0) + 1;
  localStorage.setItem(storeKey, JSON.stringify(store));
}

window.getOtherValues = function() {
  try { return JSON.parse(localStorage.getItem('gw-other-values') || '{}'); } catch(e) { return {}; }
};

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (!document.getElementById('log-form').classList.contains('hidden')) {
    e.preventDefault();
    document.getElementById('btn-save-all').click();
  }
});
