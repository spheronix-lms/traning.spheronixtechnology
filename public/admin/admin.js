// SPHERONIX admin dashboard: overview, applications, site-content editor.
import { ICONS, svgIcon } from '/js/icons.js?v=3';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'spheronix-admin', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/admin/login') { showLogin(); throw new Error('Signed out'); }
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { body });
  return body;
}

let toastTimer = 0;
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast is-on${err ? ' err' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 2600);
}

// ── Auth ────────────────────────────────────────────────────────────────────
function showLogin(msg) {
  $('#app').hidden = true;
  $('#login').hidden = false;
  if (msg) $('#loginHint').textContent = msg;
  $('input[name=password]').focus();
}
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginError').textContent = '';
  try {
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: e.target.password.value }) });
    e.target.reset();
    start();
  } catch (err) {
    $('#loginError').textContent = err.message;
  }
});
$('#logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
  showLogin('Signed out.');
});

// ── Tabs ────────────────────────────────────────────────────────────────────
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (b.dataset.tab !== 'content' && dirty && !confirm('You have unsaved content changes. Leave without saving?')) return;
  $$('#tabs [data-tab]').forEach((x) => x.classList.toggle('is-active', x === b));
  $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
  ({ overview: loadOverview, applications: loadApplications, content: () => {} })[b.dataset.tab]();
});

// ── Overview ────────────────────────────────────────────────────────────────
let site = null; // saved content
async function loadOverview() {
  const o = await api('/api/admin/overview');
  const by = Object.fromEntries(o.byStatus.map((r) => [r.status, r.n]));
  $('#tiles').innerHTML = [
    ['Total applications', o.total], ['New', by.new || 0], ['Contacted', by.contacted || 0], ['Enrolled', by.enrolled || 0],
  ].map(([l, n]) => `<div class="tile"><span>${l}</span><b>${n}</b></div>`).join('');

  if (o.dbStatus) {
    const mDot = $('#mongoDot');
    const mText = $('#mongoText');
    if (mDot && mText) {
      if (o.dbStatus.connected) {
        mDot.className = 'db-dot is-ok';
        mText.textContent = `${o.dbStatus.uriType || 'MongoDB'}: Connected (${esc(o.dbStatus.dbName)})`;
      } else {
        mDot.className = 'db-dot is-bad';
        mText.textContent = `MongoDB: Disconnected (${esc(o.dbStatus.error || 'Connection pending')})`;
      }
    }
    const gDot = $('#geminiDot');
    const gText = $('#geminiText');
    if (gDot && gText) {
      if (o.dbStatus.geminiConfigured) {
        gDot.className = 'db-dot is-ok';
        gText.textContent = `Google AI Studio: Ready (${esc(o.dbStatus.geminiModel)})`;
      } else {
        gDot.className = 'db-dot is-warn';
        gText.textContent = 'Google AI Studio: Key not set (GEMINI_API_KEY in .env)';
      }
    }
  }

  if (o.mailStatus) {
    const mlDot = $('#mailDot');
    const mlText = $('#mailText');
    if (mlDot && mlText) {
      if (o.mailStatus.configured) {
        mlDot.className = 'db-dot is-ok';
        mlText.textContent = `Email Alerts: Active (${esc(o.mailStatus.recipient)})`;
      } else {
        mlDot.className = 'db-dot is-warn';
        mlText.textContent = `Email Alerts: Pending (Add SMTP_PASS in .env)`;
      }
    }
  }

  const counts = Object.fromEntries(o.byProgram.map((r) => [r.program, r.n]));
  const progs = site.programs.map((p) => ({ label: p.short, n: counts[p.id] || 0 }));
  const max = Math.max(1, ...progs.map((p) => p.n));
  $('#byProgram').innerHTML = progs.map((p) => `
    <div class="bar" title="${esc(p.label)}: ${p.n}"><span>${esc(p.label)}</span>
      <span class="bar__track"><i class="bar__fill" style="width:${(p.n / max) * 100}%"></i></span><b>${p.n}</b></div>`).join('');

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days.push({ d, n: o.byDay.find((r) => r.day === d)?.n || 0 });
  }
  const dmax = Math.max(1, ...days.map((d) => d.n));
  $('#byDay').innerHTML = days.map((d) => `
    <div class="col" tabindex="0" aria-label="${d.d}: ${d.n}"><i style="height:${(d.n / dmax) * 100}%"></i><span class="tip">${d.d.slice(5)} · ${d.n}</span></div>`).join('');
  $('#byDay').insertAdjacentHTML('afterend', '');
  const axis = $('#byDay').nextElementSibling?.classList.contains('axis') ? $('#byDay').nextElementSibling : null;
  const axisHtml = `<div class="axis"><span>${days[0].d.slice(5)}</span><span>Today</span></div>`;
  axis ? (axis.outerHTML = axisHtml) : $('#byDay').insertAdjacentHTML('afterend', axisHtml);
  $('#sampleWarn').hidden = !site.sampleNotice;
}

// ── Applications ────────────────────────────────────────────────────────────
let statuses = [];
async function loadApplications() {
  const params = new URLSearchParams({ q: $('#fSearch').value, status: $('#fStatus').value, program: $('#fProgram').value });
  const { applications, statuses: st } = await api(`/api/admin/applications?${params}`);
  if (!statuses.length) {
    statuses = st;
    $('#fStatus').insertAdjacentHTML('beforeend', st.map((s) => `<option value="${s}">${label(s)}</option>`).join(''));
    $('#fProgram').insertAdjacentHTML('beforeend', site.programs.map((p) => `<option value="${esc(p.id)}">${esc(p.short)}</option>`).join(''));
  }
  const programName = Object.fromEntries(site.programs.map((p) => [p.id, p.short]));
  $('#empty').hidden = applications.length > 0;
  $('#rows').innerHTML = applications.map((a) => `
    <tr class="row" data-id="${a.id}">
      <td>${esc(a.created_at.slice(0, 10))}<small>${esc(a.created_at.slice(11, 16))}</small></td>
      <td>${esc(a.name)}<small><a href="mailto:${esc(a.email)}">${esc(a.email)}</a> · <a href="tel:${esc(a.phone.replace(/\s/g, ''))}">${esc(a.phone)}</a></small></td>
      <td>${esc(programName[a.program] || a.program)}${a.source ? `<small>via ${esc(a.source)}</small>` : ''}</td>
      <td>${esc(a.background || '—')}</td>
      <td><select data-status class="status-${esc(a.status)}" aria-label="Status">${statuses.map((s) => `<option value="${s}"${s === a.status ? ' selected' : ''}>${label(s)}</option>`).join('')}</select></td>
      <td><button class="btn btn--ghost btn--sm" data-toggle>Details</button></td>
    </tr>
    <tr class="detail" data-detail="${a.id}" hidden><td colspan="6">
      <div class="detail__grid">
        <div><h4>Message</h4><p>${esc(a.message || '—')}</p></div>
        <div><h4>Notes</h4><textarea data-notes rows="3" placeholder="Call notes, follow-ups…">${esc(a.notes)}</textarea>
          <div class="detail__actions"><button class="btn btn--primary btn--sm" data-save-notes>Save notes</button><button class="btn btn--danger btn--sm" data-delete>Delete</button></div></div>
      </div>
    </td></tr>`).join('');
}
const label = (s) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
let searchTimer = 0;
$('#fSearch').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadApplications, 250); });
$('#fStatus').addEventListener('change', loadApplications);
$('#fProgram').addEventListener('change', loadApplications);
$('#rows').addEventListener('click', async (e) => {
  const tr = e.target.closest('tr');
  const id = tr?.dataset.id || tr?.dataset.detail;
  if (!id) return;
  if (e.target.closest('[data-toggle]')) { const d = $(`[data-detail="${id}"]`); d.hidden = !d.hidden; }
  if (e.target.closest('[data-save-notes]')) {
    await api(`/api/admin/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ notes: $('[data-notes]', tr).value }) });
    toast('Notes saved');
  }
  if (e.target.closest('[data-delete]') && confirm('Delete this application permanently? This cannot be undone.')) {
    await api(`/api/admin/applications/${id}`, { method: 'DELETE' });
    toast('Application deleted');
    loadApplications();
  }
});
$('#rows').addEventListener('change', async (e) => {
  const sel = e.target.closest('[data-status]');
  if (!sel) return;
  const id = sel.closest('tr').dataset.id;
  await api(`/api/admin/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
  sel.className = `status-${sel.value}`;
  toast(`Marked as ${label(sel.value).toLowerCase()}`);
});

// ── Content editor ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'company', title: 'Company details', hint: 'Footer details. Also used by the AI admissions assistant.', keys: ['company', 'sampleNotice'] },
  { id: 'programs', title: 'Programs', hint: 'The four training programs: cards, month-by-month plans and the application form.' },
  { id: 'placements', title: 'Placements', hint: 'Every placed student. Program must match a program id; tier must match a company category.' },
  { id: 'featured', title: 'Featured stories', hint: 'Shown as the 3D screens in the Placements chapter (1–8). Pick students from Placements.' },
  { id: 'companies', title: 'Hiring companies', hint: 'Categories and company names, one per line.' },
  { id: 'stats', title: 'Stats', hint: 'Headline numbers in the “See all placements” dialog.' },
  { id: 'day', title: 'A day at Spheronix', hint: 'The day-in-the-life timeline. Keep activities in time order (24-hour HH:MM).' },
  { id: 'steps', title: 'Process steps', hint: 'Exactly three steps shown in the Process chapter.' },
  { id: 'layers', title: 'Studio layers', hint: 'The three stacked layers in the Studio panel.' },
  { id: 'capabilities', title: 'Studio benefits', hint: 'The benefit list in the Studio panel.' },
];
const LONG = new Set(['summary', 'story', 'quote', 'text', 'body', 'capstone', 'address', 'tagline']);
const TIERS = ['MNC', 'Mid-level', 'Startup', 'Non-tech'];
let draft = null, defaults = null, dirty = false, activeSection = 'company';

const getIn = (o, p) => p.reduce((a, k) => a?.[k], o);
function setIn(o, p, v) { const last = p[p.length - 1]; getIn(o, p.slice(0, -1))[last] = v; }
const human = (k) => String(k).replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const P = (path) => esc(JSON.stringify(path));
function blank(t) {
  if (Array.isArray(t)) return [];
  if (t && typeof t === 'object') return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, blank(v)]));
  return typeof t === 'number' ? 0 : typeof t === 'boolean' ? false : '';
}
function setDirty(v) { dirty = v; $('#dirty').hidden = !v; }

function field(key, value, path) {
  const wide = LONG.has(key) || Array.isArray(value) || (typeof value === 'string' && value.length > 70);
  const cls = `field${wide ? ' field--wide' : ''}`;
  if (typeof value === 'boolean') {
    return `<label class="field field--check field--wide"><input type="checkbox" data-path="${P(path)}" data-kind="bool"${value ? ' checked' : ''}/><span>${key === 'sampleNotice' ? 'Show the “sample placement data” note on the site' : human(key)}</span></label>`;
  }
  if (typeof value === 'number') return `<label class="${cls}"><span>${human(key)}</span><input type="number" data-path="${P(path)}" data-kind="number" value="${value}"/></label>`;
  if (Array.isArray(value)) {
    return `<label class="${cls}"><span>${human(key)} — one per line</span><textarea rows="${Math.min(8, Math.max(3, value.length + 1))}" data-path="${P(path)}" data-kind="lines">${esc(value.join('\n'))}</textarea></label>`;
  }
  if (key === 'icon') {
    return `<label class="${cls}"><span>Icon</span><span class="icon-pick"><i data-icon-preview>${svgIcon(value)}</i>
      <select data-path="${P(path)}" data-kind="text">${Object.keys(ICONS).map((n) => `<option${n === value ? ' selected' : ''}>${n}</option>`).join('')}</select></span></label>`;
  }
  const options = key === 'program' && path[0] === 'placements' ? draft.programs.map((p) => p.id)
    : key === 'tier' ? [...new Set([...Object.keys(draft.companies), ...TIERS])]
    : key === 'name' && path[0] === 'featured' ? draft.placements.map((p) => p.name) : null;
  if (options) {
    const opts = options.includes(value) ? options : [value, ...options];
    return `<label class="${cls}"><span>${human(key)}</span><select data-path="${P(path)}" data-kind="text">${opts.map((o) => `<option${o === value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  }
  if (LONG.has(key) || value.length > 90) {
    return `<label class="${cls}"><span>${human(key)}</span><textarea rows="3" data-path="${P(path)}" data-kind="text">${esc(value)}</textarea></label>`;
  }
  return `<label class="${cls}"><span>${human(key)}</span><input data-path="${P(path)}" data-kind="text" value="${esc(value)}"/></label>`;
}
const fieldsFor = (obj, path) => `<div class="fields">${Object.entries(obj).map(([k, v]) => field(k, v, [...path, k])).join('')}</div>`;

function itemTitle(it) {
  if (it.time) return `${it.time} · ${it.title}`;
  return it.name || it.title || it.label || it.topic || it.tag || (it.value !== undefined ? `${it.value}${it.suffix} ${it.label}` : '') || 'Untitled';
}

function renderSection() {
  const sec = SECTIONS.find((s) => s.id === activeSection);
  let body = '';
  if (sec.id === 'company') {
    body = fieldsFor(draft.company, ['company']) + `<div class="fields" style="margin-top:12px">${field('sampleNotice', draft.sampleNotice, ['sampleNotice'])}</div>`;
  } else if (sec.id === 'companies') {
    body = `<div class="items">${Object.entries(draft.companies).map(([cat, list], i) => `
      <details class="item" open><summary><span class="mono">${String(i + 1).padStart(2, '0')}</span><b>${esc(cat)}</b>
        <span class="tools"><button type="button" class="del" data-act="delcat" data-cat="${esc(cat)}" title="Remove category">✕</button></span></summary>
        <div class="item__body"><div class="fields">
          <label class="field"><span>Category</span><input data-cat-rename="${esc(cat)}" value="${esc(cat)}"/></label>
          ${field('companies', list, ['companies', cat])}
        </div></div></details>`).join('')}</div>
      <button class="btn btn--ghost add" type="button" data-act="addcat">+ Add category</button>`;
  } else {
    const list = draft[sec.id];
    body = `<div class="items">${list.map((it, i) => `
      <details class="item"${list.length <= 4 ? ' open' : ''}><summary><span class="mono">${String(i + 1).padStart(2, '0')}</span><b>${esc(itemTitle(it))}</b>
        <span class="tools">
          <button type="button" data-act="up" data-key="${sec.id}" data-i="${i}" title="Move up" aria-label="Move up">↑</button>
          <button type="button" data-act="down" data-key="${sec.id}" data-i="${i}" title="Move down" aria-label="Move down">↓</button>
          <button type="button" class="del" data-act="del" data-key="${sec.id}" data-i="${i}" title="Remove" aria-label="Remove">✕</button>
        </span></summary>
        <div class="item__body">${fieldsFor(it, [sec.id, i])}</div></details>`).join('')}</div>
      <button class="btn btn--ghost add" type="button" data-act="add" data-key="${sec.id}">+ Add ${sec.title.toLowerCase().replace(/s$/, '')}</button>`;
  }
  $('#contentForm').innerHTML = `<section><h3>${sec.title}</h3><p class="hint">${sec.hint}</p>${body}</section>`;
  $$('#contentNav button').forEach((b) => b.classList.toggle('is-active', b.dataset.sec === activeSection));
}

$('#contentNav').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sec]');
  if (!b) return;
  activeSection = b.dataset.sec;
  renderSection();
});
$('#contentForm').addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.catRename !== undefined) return;
  if (!el.dataset.path) return;
  const path = JSON.parse(el.dataset.path);
  const kind = el.dataset.kind;
  const v = kind === 'bool' ? el.checked : kind === 'number' ? Number(el.value) : kind === 'lines' ? el.value.split('\n').map((s) => s.trim()).filter(Boolean) : el.value;
  setIn(draft, path, v);
  setDirty(true);
  if (path[path.length - 1] === 'icon') el.closest('.icon-pick').querySelector('[data-icon-preview]').innerHTML = svgIcon(v);
  const item = el.closest('.item');
  if (item && typeof path[1] === 'number') item.querySelector('summary b').textContent = itemTitle(draft[path[0]][path[1]]);
});
$('#contentForm').addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.catRename === undefined) return;
  const from = el.dataset.catRename, to = el.value.trim();
  if (!to || to === from) return;
  if (draft.companies[to]) { toast('That category already exists', true); el.value = from; return; }
  draft.companies = Object.fromEntries(Object.entries(draft.companies).map(([k, v]) => [k === from ? to : k, v]));
  draft.placements.forEach((p) => { if (p.tier === from) p.tier = to; });
  setDirty(true);
  renderSection();
});
$('#contentForm').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  e.preventDefault();
  const { act, key } = b.dataset;
  const i = Number(b.dataset.i);
  const list = draft[key];
  if (act === 'add') list.push(blank(defaults[key][0]));
  if (act === 'del' && confirm('Remove this item?')) list.splice(i, 1);
  if (act === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
  if (act === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
  if (act === 'addcat') { let n = 'New category', k = 2; while (draft.companies[n]) n = `New category ${k++}`; draft.companies[n] = []; }
  if (act === 'delcat' && confirm(`Remove the “${b.dataset.cat}” category?`)) delete draft.companies[b.dataset.cat];
  setDirty(true);
  renderSection();
  if (act === 'add') { const items = $$('#contentForm .item'); items[items.length - 1].open = true; items[items.length - 1].scrollIntoView({ block: 'center' }); }
});

$('#saveContent').addEventListener('click', async () => {
  $('#contentErrors').hidden = true;
  try {
    const { content } = await api('/api/admin/content', { method: 'PUT', body: JSON.stringify({ content: draft }) });
    site = content; draft = structuredClone(content);
    setDirty(false);
    toast('Saved — the website is updated');
  } catch (err) {
    const list = err.body?.errors || [err.message];
    $('#contentErrors').innerHTML = `<b>${esc(err.message)}</b><ul>${list.map((x) => `<li>${esc(x.replace(/^content\./, ''))}</li>`).join('')}</ul>`;
    $('#contentErrors').hidden = false;
    toast('Not saved — check the errors', true);
  }
});
$('#resetContent').addEventListener('click', async () => {
  if (!confirm('Replace ALL site content with the original defaults? The current version is backed up on the server.')) return;
  const { content } = await api('/api/admin/content/reset', { method: 'POST' });
  site = content; draft = structuredClone(content);
  setDirty(false);
  renderSection();
  toast('Content reset to defaults');
});
addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });

// ── Boot ────────────────────────────────────────────────────────────────────
async function start() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  const c = await api('/api/admin/content');
  site = c.content; defaults = c.defaults; draft = structuredClone(site);
  $('#contentNav').innerHTML = SECTIONS.map((s) => `<button type="button" data-sec="${s.id}">${s.title}</button>`).join('');
  renderSection();
  loadOverview();
}

(async () => {
  const me = await fetch('/api/admin/me', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({}));
  if (me.admin) start();
  else if (!me.loginEnabled) {
    showLogin();
    $('#loginHint').textContent = 'Admin login is disabled. Set ADMIN_PASSWORD in the server’s .env file and restart it.';
    $('#loginForm button').disabled = true;
  } else showLogin();
})();
