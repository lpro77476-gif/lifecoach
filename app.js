'use strict';
/* Life Coach - Phase 1 (Foundation)
   Data: sirf is phone ke browser me (localStorage). Backup zaroor lo (Settings -> Backup). */

const KEY = 'lifecoach_v1';
const CATS = { study: '📚 Padhai', fitness: '💪 Fitness', skill: '🛠️ Skill', habit: '🌿 Habit' };
const BOARDS = ['CBSE', 'JKBOSE', 'Other'];
const NAV = [
  ['home', '🏠', 'Home'], ['today', '✅', 'Aaj'], ['progress', '📊', 'Progress'],
  ['more', '➕', 'Aur'], ['settings', '⚙️', 'Settings']
];

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => new Date().toLocaleDateString('en-CA');
function shift(d, n) {
  const t = new Date(d + 'T00:00:00');
  t.setDate(t.getDate() + n);
  return t.toLocaleDateString('en-CA');
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function blank() {
  return { version: 1, settings: { name: '', board: 'CBSE', examDate: '', freeHours: 4 }, days: {} };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw), b = blank();
      return { version: 1, settings: Object.assign(b.settings, s.settings || {}), days: s.days || {} };
    }
  } catch (e) { /* corrupt data: start blank */ }
  return blank();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { alert('Save nahi ho paya. Phone ki storage check karo aur backup le lo.'); }
}

let state = load();
let view = 'home';
let cur = todayStr();

function getDay(d) { return state.days[d] || { tasks: [], missed: '', why: '' }; }
function ensureDay(d) { return state.days[d] || (state.days[d] = { tasks: [], missed: '', why: '' }); }

function stats(d) {
  const t = getDay(d).tasks;
  const done = t.filter(x => x.done);
  return {
    total: t.length, done: done.length,
    pct: t.length ? Math.round(done.length * 100 / t.length) : 0,
    planned: t.reduce((a, x) => a + (+x.mins || 0), 0),
    doneMins: done.reduce((a, x) => a + (+x.mins || 0), 0)
  };
}
const fmtMins = m => m >= 60 ? Math.floor(m / 60) + ' ghanta ' + (m % 60 ? (m % 60) + ' min' : '') : m + ' min';
const niceDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/* ---------- Views ---------- */
function vHome() {
  const s = state.settings, t = todayStr(), st = stats(t);
  let h = `<div class="card"><h2>Namaste ${esc(s.name || 'dost')} 👋</h2>`;
  if (s.examDate) {
    const days = Math.ceil((new Date(s.examDate + 'T00:00:00') - new Date(t + 'T00:00:00')) / 864e5);
    h += `<div class="muted">${esc(s.board)} exam me</div><div class="big">${days >= 0 ? days + ' din' : 'Exam ho chuka'}</div>`;
  } else {
    h += `<div class="muted">Settings me exam date daalo, countdown yaha dikhega.</div>`;
  }
  h += `</div>`;

  h += `<div class="card"><h2>Aaj ka progress</h2><div class="big">${st.pct}%</div>
    <div class="bar"><i style="width:${st.pct}%"></i></div>
    <p class="muted">${st.done}/${st.total} task complete · Plan: ${fmtMins(st.planned)} / Free time: ${s.freeHours} ghanta</p>`;
  if (st.planned > s.freeHours * 60) {
    h += `<p class="warn">⚠️ Plan tumhare free time se zyada hai. Kuch task kam ya chhote karo. (Ye simple rule hai, AI nahi.)</p>`;
  }
  h += `</div>`;

  const pend = getDay(t).tasks.filter(x => !x.done).slice(0, 3);
  h += `<div class="card"><h2>Abhi ke priorities</h2>`;
  h += pend.length ? pend.map(x => `<div class="task"><div class="t"><b>${esc(x.title)}</b><br><span class="muted">${CATS[x.cat] || ''} · ${x.mins} min</span></div></div>`).join('')
    : `<p class="muted">Koi pending task nahi. "Aaj" tab me task add karo.</p>`;
  h += `<button style="margin-top:8px" data-a="go" data-v="today">Aaj ka plan kholo</button></div>`;

  h += `<div class="card"><h2>Pichle 7 din</h2><div class="days">`;
  for (let i = 6; i >= 0; i--) {
    const d = shift(t, -i), p = stats(d).pct;
    h += `<div><i style="height:${Math.max(3, p * 0.7)}px"></i>${new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'narrow' })}<br>${p}%</div>`;
  }
  return h + `</div></div>`;
}

function vToday() {
  const d = getDay(cur), st = stats(cur);
  let h = `<div class="card"><div class="row">
    <button class="ghost small auto" data-a="day" data-n="-1">◀</button>
    <div style="text-align:center"><b>${niceDate(cur)}</b>${cur === todayStr() ? ' (Aaj)' : ''}</div>
    <button class="ghost small auto" data-a="day" data-n="1">▶</button></div>
    <div class="bar" style="margin-top:10px"><i style="width:${st.pct}%"></i></div>
    <p class="muted">${st.done}/${st.total} done (${st.pct}%) · ${fmtMins(st.planned)} planned</p></div>`;

  h += `<form class="card" id="addForm"><h2>Naya task</h2>
    <input name="title" placeholder="Jaise: Physics Ch-3 padhna" required maxlength="80">
    <div class="row"><select name="cat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <input name="mins" type="number" min="5" max="600" value="30" aria-label="Minutes"></div>
    <button type="submit">Add karo</button></form>`;

  h += `<div class="card"><h2>Tasks</h2>`;
  h += d.tasks.length ? d.tasks.map(x => `<div class="task ${x.done ? 'done' : ''}">
    <input type="checkbox" data-a="tick" data-id="${x.id}" ${x.done ? 'checked' : ''}>
    <div class="t"><b>${esc(x.title)}</b><br><span class="muted">${CATS[x.cat] || ''} · ${x.mins} min</span></div>
    <button class="ghost small auto" data-a="edit" data-id="${x.id}">✏️</button>
    <button class="danger small auto" data-a="del" data-id="${x.id}">🗑️</button></div>`).join('')
    : `<p class="muted">Abhi koi task nahi. Upar se add karo (3-5 task kaafi hain).</p>`;
  h += `</div>`;

  h += `<div class="card"><h2>Din ka check-in</h2>
    <label>Kya miss hua?</label><input id="missed" value="${esc(d.missed)}" maxlength="200">
    <label>Kyun?</label><input id="why" value="${esc(d.why)}" maxlength="200">
    <button data-a="checkin">Save karo</button></div>`;
  return h;
}

function vProgress() {
  const t = todayStr();
  let h = `<div class="card"><h2>Pichle 7 din</h2>`;
  const cat = { study: 0, fitness: 0, skill: 0, habit: 0 };
  for (let i = 6; i >= 0; i--) {
    const d = shift(t, -i), st = stats(d);
    h += `<div class="muted">${niceDate(d)} · ${st.done}/${st.total} · ${fmtMins(st.doneMins)}</div><div class="bar" style="margin:4px 0 10px"><i style="width:${st.pct}%"></i></div>`;
    getDay(d).tasks.filter(x => x.done).forEach(x => { if (cat[x.cat] != null) cat[x.cat] += +x.mins || 0; });
  }
  h += `</div><div class="card"><h2>Category-wise (done time)</h2>`;
  h += Object.entries(cat).map(([k, v]) => `<p>${CATS[k]}: <b>${fmtMins(v)}</b></p>`).join('');
  h += `<p class="muted">Ye sirf tumhari saved entries se calculate hua hai. Charts aur trends Phase 4 me aayenge.</p></div>`;
  return h;
}

function vMore() {
  const items = [
    ['💪 Fitness (workout, PR, pull-ups)', 'Phase 2'], ['📚 Study (chapters, tests, revision)', 'Phase 2'],
    ['🛠️ Skills (roadmap, projects)', 'Phase 2'], ['🌿 Habits (sleep, paani, mood)', 'Phase 2'],
    ['🤖 AI Coach', 'Phase 3'], ['🎯 Goals', 'Phase 2']
  ];
  return `<div class="card"><h2>Aane wale modules</h2>` +
    items.map(i => `<div class="task"><div class="t">${i[0]}</div><span class="muted">${i[1]}</span></div>`).join('') +
    `<p class="muted">Ye abhi built nahi hain. Phase 1 me sirf Home, Aaj, Progress aur Settings kaam karte hain.</p></div>`;
}

function vSettings() {
  const s = state.settings;
  return `<div class="card"><h2>Profile</h2>
    <label>Naam</label><input id="sName" value="${esc(s.name)}" maxlength="30">
    <label>Board</label><select id="sBoard">${BOARDS.map(b => `<option ${b === s.board ? 'selected' : ''}>${b}</option>`).join('')}</select>
    <label>Exam date (pata ho tab)</label><input id="sExam" type="date" value="${esc(s.examDate)}">
    <label>Roz ka free time (ghante)</label><input id="sFree" type="number" min="0.5" max="14" step="0.5" value="${esc(s.freeHours)}">
    <button data-a="saveSettings">Save karo</button></div>
    <div class="card"><h2>Backup</h2>
    <p class="muted">Tumhara data sirf is browser me save hai (cloud me nahi). Browser data clear karne ya phone badalne par ud sakta hai. Har hafte backup lo.</p>
    <button data-a="export">Backup download karo</button>
    <p><label>Backup restore karo (.json file)</label><input type="file" id="imp" accept="application/json"></p>
    <button class="danger" data-a="reset">Saara data delete karo</button></div>`;
}

/* ---------- Render & events ---------- */
function render() {
  const views = { home: vHome, today: vToday, progress: vProgress, more: vMore, settings: vSettings };
  $('#view').innerHTML = views[view]();
  $('#nav').innerHTML = NAV.map(n => `<button data-a="go" data-v="${n[0]}" class="${n[0] === view ? 'on' : ''}"><span>${n[1]}</span>${n[2]}</button>`).join('');
  const f = $('#addForm');
  if (f) f.addEventListener('submit', onAdd);
  const imp = $('#imp');
  if (imp) imp.addEventListener('change', onImport);
}

function onAdd(e) {
  e.preventDefault();
  const f = e.target, title = f.title.value.trim();
  if (!title) return;
  const mins = Math.max(5, Math.min(600, parseInt(f.mins.value, 10) || 30));
  ensureDay(cur).tasks.push({ id: uid(), title, cat: f.cat.value, mins, done: false });
  save(); render();
}

function onImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data || typeof data.days !== 'object' || typeof data.settings !== 'object') throw new Error('bad');
      if (!confirm('Restore karne par abhi ka data replace ho jayega. Pakka?')) return;
      state = Object.assign(blank(), data);
      state.settings = Object.assign(blank().settings, data.settings);
      save(); alert('Restore ho gaya ✅'); render();
    } catch (err) { alert('Ye valid backup file nahi lag rahi.'); }
  };
  r.readAsText(file);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const a = el.dataset.a, id = el.dataset.id;
  if (a === 'tick') return; // handled in change
  if (a === 'go') { view = el.dataset.v; if (view === 'today') cur = todayStr(); render(); window.scrollTo(0, 0); }
  else if (a === 'day') { cur = shift(cur, +el.dataset.n); render(); }
  else if (a === 'del') {
    if (confirm('Ye task delete karu?')) { const d = ensureDay(cur); d.tasks = d.tasks.filter(x => x.id !== id); save(); render(); }
  } else if (a === 'edit') {
    const t = getDay(cur).tasks.find(x => x.id === id);
    if (!t) return;
    const title = prompt('Task ka naam:', t.title);
    if (title === null) return;
    const mins = prompt('Kitne minute?', t.mins);
    if (mins === null) return;
    t.title = title.trim() || t.title;
    t.mins = Math.max(5, Math.min(600, parseInt(mins, 10) || t.mins));
    save(); render();
  } else if (a === 'checkin') {
    const d = ensureDay(cur);
    d.missed = $('#missed').value.trim(); d.why = $('#why').value.trim();
    save(); alert('Check-in save ho gaya ✅');
  } else if (a === 'saveSettings') {
    const s = state.settings;
    s.name = $('#sName').value.trim(); s.board = $('#sBoard').value;
    s.examDate = $('#sExam').value;
    s.freeHours = Math.max(0.5, Math.min(14, parseFloat($('#sFree').value) || 4));
    save(); alert('Settings save ho gayi ✅');
  } else if (a === 'export') {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lifecoach-backup-' + todayStr() + '.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } else if (a === 'reset') {
    if (confirm('Saara data delete ho jayega. Pehle backup liya?') && confirm('Pakka delete karu?')) {
      state = blank(); save(); render();
    }
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset && el.dataset.a === 'tick') {
    const t = getDay(cur).tasks.find(x => x.id === el.dataset.id);
    if (t) { t.done = el.checked; save(); render(); }
  }
});

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
