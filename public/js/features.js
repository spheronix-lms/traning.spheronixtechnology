// SPHERONIX — interactive chapters: a day at Spheronix, the program finder
// and the AI admissions assistant.
import { svgIcon } from './icons.js?v=3';
import { TILES, ICON_ORDER, MAX_PICKS } from './interests.js?v=1';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollToSection(ctx, id, p, smooth) {
  const L = ctx.layout[id];
  if (!L) return;
  const y = L.top + L.len * p;
  const lenis = ctx.getLenis();
  if (lenis) lenis.scrollTo(y, smooth ? { duration: 1.2 } : { immediate: true, force: true });
  else scrollTo({ top: y, behavior: smooth && !reduced ? 'smooth' : 'auto' });
}

// ── A day at Spheronix ──────────────────────────────────────────────────────
export function createDay(ctx) {
  const items = ctx.content.day;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmt = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
  const start = toMin(items[0].time);
  const end = Math.max(toMin(items[items.length - 1].time) + 30, 18 * 60);
  const span = end - start;
  const used = new Set();
  const tileIdx = items.map((d, k) => {
    let i = ICON_ORDER.indexOf(d.icon);
    if (i < 0 || used.has(i)) i = ICON_ORDER.findIndex((_, j) => !used.has(j) && j >= k);
    used.add(i);
    return i;
  });
  const P0 = 0.07, P1 = 0.9;
  const frac = (min) => (min - start) / span;

  $('#dayTicks').innerHTML = items.map((d, k) => `
    <button class="day__tick" data-k="${k}" style="left:${(frac(toMin(d.time)) * 100).toFixed(2)}%" aria-label="${esc(d.time)} ${esc(d.title)}">
      <i></i><span class="mono">${esc(d.time)}</span><em>${esc(d.title)}</em></button>`).join('');

  let active = -1;
  function show(k) {
    active = k;
    const d = items[k];
    const next = items[k + 1] ? items[k + 1].time : fmt(end);
    $('#dayTime').textContent = `${d.time} — ${next}`;
    $('#dayTitle').textContent = d.title;
    $('#dayText').textContent = d.text;
    const card = $('#dayCard');
    card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    $$('.day__tick').forEach((t, i) => { t.classList.toggle('is-on', i === k); t.classList.toggle('is-past', i < k); });
  }

  function update(p) {
    const f = clamp((p - P0) / (P1 - P0));
    const minutes = start + f * span;
    let k = 0;
    items.forEach((d, i) => { if (toMin(d.time) <= minutes + 0.01) k = i; });
    if (k !== active) show(k);
    const shown = Math.floor(minutes / 5) * 5;
    const h24 = Math.floor(shown / 60);
    $('#dayClock').textContent = `${String(((h24 + 11) % 12) + 1).padStart(2, '0')}:${String(shown % 60).padStart(2, '0')}`;
    $('#dayAmPm').textContent = h24 < 12 ? 'AM' : 'PM';
    $('#dayHandle').style.left = `${(f * 100).toFixed(3)}%`;
    $('#dayHandleTime').textContent = fmt(shown);
    $('#dayFill').style.width = `${(f * 100).toFixed(3)}%`;
    $('#dayTrack').setAttribute('aria-valuetext', `${fmt(shown)}, ${items[k].title}`);
    const a0 = toMin(items[k].time), a1 = items[k + 1] ? toMin(items[k + 1].time) : end;
    $('#dayProgress').style.width = `${(clamp((minutes - a0) / (a1 - a0)) * 100).toFixed(2)}%`;
    ctx.getWorld()?.setDay(tileIdx, k, f);
  }

  // drag the time
  const track = $('#dayTrack');
  const fromX = (x) => { const r = $('.day__rail', track).getBoundingClientRect(); return clamp((x - r.left) / r.width); };
  const seek = (f, smooth) => scrollToSection(ctx, 'day', P0 + f * (P1 - P0), smooth);
  let dragging = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.day__tick')) return;
    dragging = true;
    track.setPointerCapture(e.pointerId);
    track.classList.add('is-dragging');
    seek(fromX(e.clientX), false);
  });
  track.addEventListener('pointermove', (e) => { if (dragging) seek(fromX(e.clientX), false); });
  const stop = () => { dragging = false; track.classList.remove('is-dragging'); };
  track.addEventListener('pointerup', stop);
  track.addEventListener('pointercancel', stop);
  $('#dayTicks').addEventListener('click', (e) => {
    const t = e.target.closest('.day__tick');
    if (t) seek(frac(toMin(items[Number(t.dataset.k)].time)) + 0.002, true);
  });
  track.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const k = clamp(active + step, 0, items.length - 1);
    seek(frac(toMin(items[k].time)) + 0.002, true);
  });

  return {
    update,
    // clicking an activity tile in 3D jumps the clock to that activity
    onTileClick(i) {
      if (ctx.state.sub !== 'day') return false;
      const k = tileIdx.indexOf(i);
      if (k < 0) return false;
      seek(frac(toMin(items[k].time)) + 0.002, true);
      return true;
    },
  };
}

// ── Process route: stop cards ───────────────────────────────────────────────
export function createRoute(ctx) {
  const steps = ctx.content.steps;
  const stops = $$('.route__step');
  stops.forEach((el, i) => {
    const s = steps[i];
    if (s) $('.route__card', el).innerHTML = `<span class="mono">${esc(s.tag)} · STEP 0${i + 1}</span><b>${esc(s.title)}</b><p>${esc(s.body)}</p>`;
  });
  const setOpen = (el, open) => { el.classList.toggle('is-open', open); el.setAttribute('aria-expanded', String(open)); };
  stops.forEach((el) => {
    el.addEventListener('click', () => {
      const open = !el.classList.contains('is-open');
      stops.forEach((x) => setOpen(x, false));
      setOpen(el, open);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
      if (e.key === 'Escape') setOpen(el, false);
    });
    el.addEventListener('pointerleave', () => setOpen(el, false));
  });
}

// ── Process steps: clickable segments + tilt ────────────────────────────────
export function createSteps(ctx) {
  $$('.step__progress button').forEach((b, k) => b.addEventListener('click', () => scrollToSection(ctx, 'steps', (k + 0.12) / 3, true)));
  const step = $('#step');
  if (matchMedia('(hover: none)').matches || reduced) return;
  step.addEventListener('pointermove', (e) => {
    const r = step.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    step.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
    step.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
    step.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
    step.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  step.addEventListener('pointerleave', () => {
    step.style.setProperty('--rx', '0deg');
    step.style.setProperty('--ry', '0deg');
  });
}

// ── Details statement: resize handles + collaborator cursors ────────────────
export function createStatement() {
  const stmt = $('#statement');
  const frame = $('.statement__frame', stmt);
  let user = 1;
  let drag = null;
  $$('.statement__handle', stmt).forEach((h) => {
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      const r = frame.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      drag = { cx, cy, d0: Math.hypot(e.clientX - cx, e.clientY - cy), s0: user };
      stmt.classList.add('is-resizing');
    });
    h.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const d = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy);
      user = clamp(drag.s0 * (d / Math.max(20, drag.d0)), 0.55, 1.25);
    });
    const end = () => { drag = null; stmt.classList.remove('is-resizing'); };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  });
  frame.addEventListener('dblclick', () => { user = 1; });

  const cursors = $$('.collab__cursor', stmt);
  // resting points for each cursor, as fractions of the frame; they glide between them
  const PATHS = [
    [[0.12, 0.2], [0.58, 0.28], [0.9, 0.62], [0.46, 0.86], [0.2, 0.62]],
    [[0.86, 0.12], [0.34, 0.5], [0.7, 0.9], [0.98, 0.4], [0.62, 0.18]],
  ];
  return {
    scale: () => user,
    update(p, t) {
      const on = p > 0.18 && p < 0.86;
      stmt.classList.toggle('has-collab', on);
      if (!on || reduced) return;
      const w = frame.offsetWidth, h = frame.offsetHeight;
      cursors.forEach((c, i) => {
        const path = PATHS[i];
        const u = ((t * (0.16 + i * 0.05) + i * 0.37) % 1) * path.length;
        const a = path[Math.floor(u) % path.length], b = path[(Math.floor(u) + 1) % path.length];
        const k = u % 1;
        const e = k < 0.7 ? (1 - Math.cos((k / 0.7) * Math.PI)) / 2 : 1; // glide, then rest
        c.style.transform = `translate(${((a[0] + (b[0] - a[0]) * e) * w).toFixed(1)}px, ${((a[1] + (b[1] - a[1]) * e) * h).toFixed(1)}px)`;
        c.classList.toggle('is-click', k > 0.74 && k < 0.84);
      });
    },
  };
}

// ── Program finder ──────────────────────────────────────────────────────────
export function createFinder(ctx) {
  const programs = ctx.content.programs;
  let picks = [];
  let result = null;

  $('#finderChips').innerHTML = TILES.map((t, i) => `
    <button class="finder__chip" data-i="${i}" aria-pressed="false"><i>${svgIcon(t.icon)}</i><span>${esc(t.label)}</span></button>`).join('');

  function sync() {
    $$('.finder__chip').forEach((c) => c.setAttribute('aria-pressed', String(picks.includes(Number(c.dataset.i)))));
    $('#finderCount').textContent = `${picks.length} / ${MAX_PICKS}`;
    $('#finderGo').disabled = picks.length === 0;
    ctx.getWorld()?.setFinder(picks, !!result);
  }

  function toggle(i) {
    if (result) return;
    if (picks.includes(i)) picks = picks.filter((x) => x !== i);
    else if (picks.length < MAX_PICKS) picks.push(i);
    else {
      picks = [...picks.slice(1), i]; // keep the newest three
    }
    sync();
  }

  function decide() {
    const scores = programs.map((p) => ({ p, s: picks.reduce((sum, i) => sum + (TILES[i].w[p.id] || 0), 0) }));
    const total = scores.reduce((a, b) => a + b.s, 0) || 1;
    const best = scores.reduce((a, b) => (b.s > a.s ? b : a), scores[0]);
    result = best.p;
    const picked = picks.map((i) => TILES[i].label.replace(/^\w/, (c) => c.toLowerCase()).replace(/^(ai|iot)\b/i, (m) => m.toUpperCase()));
    const list = picked.length > 1 ? `${picked.slice(0, -1).join(', ')} and ${picked[picked.length - 1]}` : picked[0];
    $('#resultTitle').textContent = result.title;
    $('#resultWhy').textContent = `You picked ${list}. ${result.summary}`;
    $('#resultMeter').innerHTML = scores
      .map(({ p, s }) => ({ p, pct: Math.round((s / total) * 100) }))
      .map(({ p, pct }) => `<div class="finder__bar${p === result ? ' is-best' : ''}"><span>${esc(p.short)}</span><span class="finder__track"><i style="width:${pct}%"></i></span><b>${pct}%</b></div>`)
      .join('');
    $('#finderPanel').hidden = true;
    $('#finderResult').hidden = false;
    sync();
  }

  function reset() {
    picks = [];
    result = null;
    $('#finderPanel').hidden = false;
    $('#finderResult').hidden = true;
    sync();
  }

  $('#finderChips').addEventListener('click', (e) => {
    const c = e.target.closest('.finder__chip');
    if (c) toggle(Number(c.dataset.i));
  });
  $('#finderGo').addEventListener('click', decide);
  $('#resultAgain').addEventListener('click', reset);
  $('#resultApply').addEventListener('click', () => ctx.openApply(result?.id, 'program finder'));

  return {
    // called by the 3D world when a tile is clicked; true = handled here
    onTileClick(i) {
      if (ctx.state.sub !== 'finder' || result) return false;
      toggle(i);
      return true;
    },
    sync,
  };
}

// ── AI admissions assistant ─────────────────────────────────────────────────
export function createAsk(ctx) {
  const KEY = 'sx-ask-history';
  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { history = []; }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-20))); } catch { /* storage unavailable */ } };
  const panel = $('#askPanel'), log = $('#askLog'), input = $('#askInput'), openBtn = $('#askOpen');
  let busy = false;

  const bubble = (role, text) => {
    const el = document.createElement('div');
    el.className = `ask-msg ask-msg--${role}`;
    el.textContent = text;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };
  function renderAll() {
    log.innerHTML = '';
    bubble('assistant', `Hi! I can answer questions about Spheronix programs, the 6-month training, the daily schedule and admissions.`);
    history.forEach((m) => bubble(m.role, m.content));
    $('#askSuggest').hidden = history.length > 0;
  }

  function open(v) {
    panel.hidden = !v;
    openBtn.setAttribute('aria-expanded', String(v));
    document.body.classList.toggle('ask-open', v);
    if (v) { renderAll(); setTimeout(() => input.focus(), 50); }
  }
  openBtn.addEventListener('click', () => open(panel.hidden));
  $('#askClose').addEventListener('click', () => { open(false); openBtn.focus(); });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { open(false); openBtn.focus(); } });
  $('#askSuggest').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
  $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    input.value = '';
    $('#askSuggest').hidden = true;
    history.push({ role: 'user', content: text });
    bubble('user', text);
    const out = bubble('assistant', '');
    out.classList.add('is-typing');
    let reply = '';
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }) });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw Object.assign(new Error(body.error || 'The assistant is unavailable right now.'), { status: res.status });
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const msg = JSON.parse(line.slice(5));
          if (msg.text) { reply += msg.text; out.classList.remove('is-typing'); out.textContent = reply; log.scrollTop = log.scrollHeight; }
          if (msg.error) throw new Error(msg.error);
        }
      }
      if (!reply) throw new Error('No answer came back. Please try again.');
      history.push({ role: 'assistant', content: reply });
      save();
    } catch (err) {
      history.pop(); // drop the unanswered question so the history stays valid
      out.classList.remove('is-typing');
      out.classList.add('ask-msg--error');
      const email = ctx.content.company.email;
      out.textContent = err.status === 503
        ? `The assistant isn’t switched on yet. Email ${email} or tap “Apply now” and the admissions team will call you.`
        : `${err.message} You can also email ${email}.`;
    } finally {
      busy = false;
      input.focus();
    }
  }
}
