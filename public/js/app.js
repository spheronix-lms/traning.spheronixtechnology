// SPHERONIX — content rendering, scroll engine and interactions.
import { svgIcon } from './icons.js?v=3';
import { createDay, createFinder, createAsk, createRoute, createSteps, createStatement } from './features.js?v=3';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const CHAPTERS = ['Welcome', 'About', 'Placements', 'Process', 'Studio', 'Finder', 'Apply'];
const CHAPTER_IDS = ['welcome', 'about', 'work', 'process', 'studio', 'finder', 'contact'];
const PROGRAM_COLORS = {
  fullstack: ['#0b1d4a', '#2a6df0'],
  embedded: ['#052a2e', '#0e8f88'],
  genai: ['#170c3a', '#6a3cf0'],
  data: ['#3a1606', '#e2701c'],
};
const AVATAR = { fullstack: ['#5aa0ff', '#1652c4'], embedded: ['#3fd0c9', '#137a8a'], genai: ['#a98bff', '#4b2fc4'], data: ['#ffb05a', '#d1601a'] };
const ARROW = '<svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
const CHECK = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7"/></svg>';

// Must match world.js
const EX_START = 0.12;

let content = null;
let featured = [];

// ── Render ──────────────────────────────────────────────────────────────────
function render(c) {
  content = c;
  const programById = Object.fromEntries(c.programs.map((p) => [p.id, p]));
  featured = c.featured
    .map((f) => ({ ...c.placements.find((p) => p.name === f.name), story: f.story }))
    .filter((f) => f.name);

  // feature cards (4 programs)
  $('#featureCards').innerHTML = c.programs.map((p, i) => `
    <article class="feature-card" data-card="${i}">
      <div class="feature-card__inner">
        <div class="feature-card__face">
          <div class="feature-card__visual"><span class="feature-card__index">${p.no}</span><span class="icon-tile">${svgIcon(p.icon)}</span></div>
          <div class="feature-card__words">
            <h3 class="feature-card__title">${esc(p.short === 'Full Stack + AI' ? 'AI Full Stack' : p.short)}</h3>
            <p class="feature-card__body">${esc(p.summary)}</p>
            <div class="feature-card__tags">${p.tags.slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
          </div>
          <button class="feature-card__more" data-flip>Month by month ${ARROW}</button>
        </div>
        <div class="feature-card__back">
          <span class="feature-card__index" style="position:static">${p.no} · 4 + 2 MONTHS</span>
          <h4>${esc(p.title)}</h4>
          <ol>${p.months.map((m) => `<li>${esc(m)}</li>`).join('')}<li>Live company project + letter of experience</li></ol>
          <p class="feature-card__cap"><b>Capstone.</b> ${esc(p.capstone)}</p>
          <button class="feature-card__more" data-flip>Back ${ARROW}</button>
        </div>
      </div>
    </article>`).join('');

  // exhibits
  const w = (1 - EX_START) / featured.length;
  $('#exhibits').innerHTML = featured.map((f, i) => {
    const s = EX_START + i * w;
    const range = [s + w * 0.1, s + w * 0.22, s + w * 0.74, s + w * 0.86].map((v) => v.toFixed(4)).join(',');
    return `
    <div class="scene__layer exhibit-layer container" data-range="${range}" data-exhibit="${i}">
      <div class="exhibit-copy">
        <div class="exhibit-copy__labels">
          <span class="award"><span class="award__mark">${String(i + 1).padStart(2, '0')}</span><span class="award__text">${esc(programById[f.program]?.short || '')}</span></span>
          <span class="award award--blue"><span class="award__mark">${CHECK}</span><span class="award__text">${esc(f.tier)} · ${esc(f.pkg)}</span></span>
        </div>
        <h3 class="exhibit-copy__name">${esc(f.name)}</h3>
        <p class="exhibit-copy__summary">${esc(f.story)}</p>
        <p class="exhibit-copy__meta">${esc(f.role)} · ${esc(f.company)} · ${esc(f.batch)}</p>
        <button class="exhibit-copy__link" data-placements>View all placements →</button>
      </div>
    </div>`;
  }).join('');
  $('#sampleNote').hidden = !c.sampleNotice;
  $('#sampleNote2').hidden = !c.sampleNotice;

  // studio
  $('#layerStack').innerHTML = [...c.layers].reverse().map((l, k) => {
    const i = c.layers.length - 1 - k;
    const icons = [['cursor', 'layers', 'eye', 'grid', 'chat'], ['code', 'nodes', 'box', 'chip', 'wifi'], ['briefcase', 'cap', 'arrow', 'chart', 'users']][i];
    const tiles = Array.from({ length: 10 }, (_, j) => `<span class="layer-stack__tile" style="--d:${j * 40}ms">${svgIcon(icons[j % 5])}</span>`).join('');
    return `<div class="layer-stack__slot" data-slot="${i}">
      <div class="layer-stack__plane">${tiles}</div>
      <div class="layer-stack__label"><span class="label"><span class="label__index">${l.no}</span><span class="label__text">${esc(l.label)}</span></span><small>${esc(l.sub)}</small></div>
    </div>`;
  }).join('');
  $('#capabilities').innerHTML = c.capabilities.map((cap) => `
    <div class="capability-row"><span class="icon-tile icon-tile--sm">${svgIcon(cap.icon)}</span><div><h4>${esc(cap.title)}</h4><p>${esc(cap.text)}</p></div></div>`).join('');

  // contact
  $('#company').innerHTML = `
    <span>${c.programs.map((p) => esc(p.short)).join(' · ')}</span>
    <span>${esc(c.company.name)} · ${esc(c.company.address)}</span>
    <span><a href="mailto:${esc(c.company.email)}">${esc(c.company.email)}</a> · <a href="tel:${esc(c.company.phone.replace(/\s/g, ''))}">${esc(c.company.phone)}</a></span>
    <span>© ${new Date().getFullYear()} ${esc(c.company.name)}</span>`;

  // form programs
  $('#programRadios').innerHTML = c.programs.map((p, i) => `
    <label class="radio"><input type="radio" name="program" value="${p.id}" ${i === 0 ? 'checked' : ''}/><span>${esc(p.title)}</span></label>`).join('');

  // placements dialog
  $('#stats').innerHTML = c.stats.map((s) => `<div class="stat"><b><span data-count="${s.value}">0</span><i>${esc(s.suffix)}</i></b><span>${esc(s.label)}</span></div>`).join('');
  const tiers = ['All', 'MNC', 'Mid-level', 'Startup', 'Non-tech'];
  $('#filters').innerHTML = tiers.map((t, i) => {
    const n = t === 'All' ? c.placements.length : c.placements.filter((p) => p.tier === t).length;
    return `<button class="chip${i ? '' : ' is-active'}" data-filter="${t}">${t}<span class="n">${n}</span></button>`;
  }).join('');
  $('#students').innerHTML = c.placements.map((s) => {
    const [a, b] = AVATAR[s.program] || AVATAR.fullstack;
    return `<article class="student" data-tier="${esc(s.tier)}">
      <div class="student__top"><span class="avatar" style="--a:${a};--b:${b}">${esc(s.name.split(' ').map((x) => x[0]).join(''))}</span>
      <div><div class="student__name">${esc(s.name)}</div><div class="student__role">${esc(s.role)}</div></div></div>
      <div class="student__co"><span>${esc(s.company)}</span><span class="mono">${esc(s.tier.toUpperCase())}</span></div>
      <p class="student__quote">“${esc(s.quote)}”</p>
      <div class="student__foot"><span>${esc((programById[s.program]?.short || '').toUpperCase())} · ${esc(s.batch)}</span><b>${esc(s.pkg)}</b></div>
    </article>`;
  }).join('');
  $('#companies').innerHTML = Object.entries(c.companies).map(([k, v]) => `
    <div class="companies__row"><span class="mono">${esc(k.toUpperCase())}</span><span>${v.map(esc).join(' · ')}</span></div>`).join('');

  // chapter dots
  $('#chapterDots').innerHTML = CHAPTERS.map((n, i) => `
    <button class="chapter-dots__item" data-dot="${i}" aria-label="${n}"><span class="chapter-dots__name">${String(i).padStart(2, '0')} ${n}</span><span class="chapter-dots__mark"></span></button>`).join('');
}

// ── Text effects ────────────────────────────────────────────────────────────
function prepareFocusText(el) {
  const units = [];
  const out = [];
  const walk = (node, live) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { out.push(' '); return; }
          if (live) { out.push(`<span class="focus-text__live" data-u="${units.length}"><span>${esc(part)}</span></span>`); units.push('live'); }
          else { out.push(`<span class="focus-text__word" data-u="${units.length}">${esc(part)}</span>`); units.push('word'); }
        });
      } else if (n.nodeName === 'BR') out.push('<br />');
      else if (n.nodeName === 'EM') walk(n, true);
    });
  };
  walk(el, false);
  el.innerHTML = out.join('');
  return { els: $$('[data-u]', el), count: units.length };
}
function updateFocusText(ft, r) {
  const n = r * (ft.count + 1);
  ft.els.forEach((w, k) => {
    const d = n - k;
    if (w.classList.contains('focus-text__live')) {
      w.style.setProperty('--box', smooth(0, 0.6, d).toFixed(3));
      w.style.setProperty('--txt', smooth(0.6, 1.1, d).toFixed(3));
      w.style.opacity = smooth(-1.4, 0, d).toFixed(3) * 0.2 + (d > 0 ? 0.8 : 0);
    } else {
      const o = smooth(-1.6, 0.2, d);
      w.style.opacity = (0.12 + o * 0.88).toFixed(3);
      w.style.filter = o < 0.99 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none';
    }
  });
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#+*<>';
function decode(el) {
  const final = el.dataset.final ?? el.textContent;
  el.dataset.final = final;
  if (reduced) { el.textContent = final; return; }
  const start = performance.now();
  const dur = Math.min(1600, 500 + final.length * 5);
  cancelAnimationFrame(el._raf);
  const tick = (t) => {
    const p = clamp((t - start) / dur);
    const settled = Math.floor(p * final.length);
    let s = final.slice(0, settled);
    for (let i = settled; i < Math.min(final.length, settled + 8); i++) s += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = s;
    if (p < 1) el._raf = requestAnimationFrame(tick);
    else el.textContent = final;
  };
  el._raf = requestAnimationFrame(tick);
}

function typeLines(lines, els) {
  els.forEach((e) => (e.textContent = ''));
  cancelAnimationFrame(typeLines.raf);
  const all = lines.join('\n');
  const start = performance.now();
  const tick = (t) => {
    const n = reduced ? all.length : Math.floor((t - start) / 24);
    let used = 0;
    lines.forEach((line, i) => {
      const k = clamp(n - used, 0, line.length);
      const cursor = n >= used && n < used + line.length + 1 ? '<i class="type-lines__cursor"></i>' : '';
      els[i].innerHTML = esc(line.slice(0, k)) + cursor;
      used += line.length + 1;
    });
    if (n < all.length + 30) typeLines.raf = requestAnimationFrame(tick);
    else els[els.length - 1].innerHTML = esc(lines[lines.length - 1]) + '<i class="type-lines__cursor"></i>';
  };
  typeLines.raf = requestAnimationFrame(tick);
}

function countUp(el) {
  const target = Number(el.dataset.count);
  const start = performance.now();
  const tick = (t) => {
    const p = reduced ? 1 : clamp((t - start) / 1400);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString('en-IN');
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Scroll engine ───────────────────────────────────────────────────────────
const sections = $$('section.scene');
const layout = {};
function measure() {
  const vh = innerHeight;
  sections.forEach((s) => { s.style.height = `${(Number(s.dataset.vh) / 100) * vh}px`; });
  sections.forEach((s) => {
    const top = s.offsetTop, h = s.offsetHeight, len = Math.max(1, h - vh);
    layout[s.id] = { top, h, len, start: top / vh, len_: len / vh };
  });
}
const worldLayout = () => Object.fromEntries(Object.entries(layout).map(([k, v]) => [k, { start: v.start, len: v.len_ }]));

let layers = [];
function collectLayers() {
  layers = $$('[data-range]').map((el) => {
    const [a, b, c, d] = el.dataset.range.split(',').map(Number);
    return { el, sec: el.closest('section').id, a, b, c, d, live: false, onEnter: null };
  });
}
function layerAmount(L, p) {
  const fin = L.a < 0 ? 1 : smooth(L.a, L.b, p);
  const fout = L.c < 0 ? 1 : 1 - smooth(L.c, L.d, p);
  return { o: Math.min(fin, fout), dir: fin < 1 ? 1 : -1 };
}

// ── App state ───────────────────────────────────────────────────────────────
let lenis = null;
let world = null;
let focus = null;
let day = null;
let statement = null;
let finder = null;
let stepIndex = -1;
let chapterIndex = -1;
const state = { u: 0, sec: {}, sub: 'welcome', chapter: 'welcome', layout: {} };

function chapterOf(id) {
  return ({ welcome: 0, about: 1, work: 2, process: 3, steps: 3, details: 3, day: 3, studio: 4, finder: 5, contact: 6 })[id] ?? 0;
}

function update() {
  const y = scrollY;
  const vh = innerHeight;
  state.u = y / vh;
  let sub = sections[0].id;
  for (const s of sections) {
    const L = layout[s.id];
    state.sec[s.id] = clamp((y - L.top) / L.len);
    if (y >= L.top - vh * 0.5) sub = s.id;
  }
  state.sub = sub;
  const chap = chapterOf(sub);
  state.chapter = CHAPTER_IDS[chap];
  state.layout = worldLayout();

  // layers
  for (const L of layers) {
    const p = state.sec[L.sec];
    const near = y > layout[L.sec].top - vh && y < layout[L.sec].top + layout[L.sec].h;
    const { o, dir } = near ? layerAmount(L, p) : { o: 0, dir: 1 };
    const live = o > 0.001;
    if (live !== L.live) {
      L.live = live;
      L.el.classList.toggle('is-live', live);
      if (live) $$('.decode', L.el).forEach(decode);
    }
    if (!live) continue;
    const k = 1 - o;
    L.el.style.opacity = o.toFixed(3);
    L.el.style.transform = k > 0.001 ? `translate3d(0, ${(dir * k * 48).toFixed(1)}px, 0)` : 'none';
    L.el.style.filter = k > 0.01 ? `blur(${(k * 12).toFixed(1)}px)` : 'none';
  }

  // about: focus text + cards
  const pa = state.sec.about;
  if (focus) updateFocusText(focus, smooth(0.27, 0.56, pa));
  $$('.feature-card').forEach((card, k) => {
    const t = smooth(0.7 + k * 0.01, 0.765 + k * 0.01, pa);
    card.style.setProperty('--y', `${((1 - t) * 160).toFixed(1)}px`);
    card.style.setProperty('--o', t.toFixed(3));
    card.style.setProperty('--glass', (1 - smooth(0.88, 0.95, pa) * 0.86).toFixed(3));
  });

  // route labels
  if (world && (sub === 'process' || sub === 'steps')) {
    const routeLayer = $('#route');
    const pr = state.sec.process;
    const amt = layerAmount({ a: 0.1, b: 0.16, c: 0.84, d: 0.95 }, pr).o;
    routeLayer.style.opacity = amt;
    const drawn = world.routeProgress();
    $$('.route__step').forEach((el, i) => {
      const pt = world.projectNode(i);
      const half = el.offsetWidth / 2 + 12;
      el.style.left = `${clamp(pt.x, half, innerWidth - half)}px`;
      el.style.top = `${clamp(pt.y, 80, innerHeight - 120)}px`;
      el.classList.toggle('is-on', pt.on && drawn >= [0.17, 0.5, 0.83][i]);
    });
  }

  // steps
  const ps = state.sec.steps;
  const idx = Math.min(2, Math.floor(ps * 3));
  if (idx !== stepIndex && content) setStep(idx);
  $$('.step__progress i').forEach((bar, k) => (bar.style.width = `${clamp(ps * 3 - k) * 100}%`));

  // details statement
  const pd = state.sec.details;
  const z = smooth(0.08, 0.55, pd);
  const sc = lerp(0.22, 1, z) * (statement ? statement.scale() : 1);
  $('#statement').style.transform = `scale(${sc.toFixed(4)})`;
  $('#readout').textContent = `${Math.round(sc * 100)}%`;
  statement?.update(pd, performance.now() / 1000);

  // studio stack + rows
  const pst = state.sec.studio;
  const spread = smooth(0.48, 0.62, pst);
  $$('.layer-stack__slot').forEach((slot) => {
    const i = Number(slot.dataset.slot);
    slot.style.transform = `translateY(${((1 - i) * lerp(26, 104, spread)).toFixed(1)}px)`;
  });
  $$('.capability-row').forEach((row, k) => {
    const t = smooth(0.5 + k * 0.018, 0.56 + k * 0.018, pst);
    row.style.setProperty('--o', t.toFixed(3));
    row.style.setProperty('--y', `${((1 - t) * 18).toFixed(1)}px`);
  });

  // chapter UI + theme
  if (chap !== chapterIndex) {
    chapterIndex = chap;
    const no = String(chap).padStart(2, '0');
    $('#indIndex').textContent = no;
    $('#indName').textContent = CHAPTERS[chap];
    $('#menuChip').textContent = no;
    $('#menuName').textContent = CHAPTERS[chap];
    const ind = $('.indicator');
    ind.classList.remove('flip'); void ind.offsetWidth; ind.classList.add('flip');
    $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', Number(a.dataset.nav) === chap));
    $$('[data-dot]').forEach((d) => d.classList.toggle('is-active', Number(d.dataset.dot) === chap));
  }
  const pw = state.sec.work;
  document.body.classList.toggle('is-light', sub === 'work' && pw > 0.006 && pw < 0.985);

  // cursor CTA visibility
  cursor.zone = sub === 'work' && pw > EX_START && pw < 0.99;

  // a day at Spheronix
  day?.update(state.sec.day);
}

function setStep(i) {
  stepIndex = i;
  const s = content.steps[i];
  $('#stepNo').textContent = String(i + 1).padStart(2, '0');
  $('#stepTag').textContent = s.tag;
  $('#stepTitle').textContent = s.title;
  $('#stepBody').textContent = s.body;
  const step = $('#step');
  step.classList.remove('swap'); void step.offsetWidth; step.classList.add('swap');
  typeLines(s.lines, $$('.type-lines__line'));
}

// ── Cursor CTA ──────────────────────────────────────────────────────────────
const cursor = { x: -200, y: -200, sx: -200, sy: -200, zone: false };
function setupCursor() {
  const el = $('#cursorCta');
  if (matchMedia('(hover: none)').matches) return;
  addEventListener('pointermove', (e) => { cursor.x = e.clientX; cursor.y = e.clientY; }, { passive: true });
  const loop = () => {
    cursor.sx += (cursor.x - cursor.sx) * 0.18;
    cursor.sy += (cursor.y - cursor.sy) * 0.18;
    el.style.transform = `translate3d(${cursor.sx}px, ${cursor.sy}px, 0)`;
    const overScreen = cursor.zone && cursor.x > innerWidth * 0.38 && !document.querySelector('dialog[open]') && !(world && world.hoveredTile() >= 0);
    el.classList.toggle('is-on', overScreen);
    document.body.style.cursor = overScreen ? 'pointer' : '';
    requestAnimationFrame(loop);
  };
  loop();
  addEventListener('click', (e) => {
    if (!el.classList.contains('is-on')) return;
    if (e.target.closest('a,button,dialog')) return;
    openPlacements();
  });
}

// ── Navigation ──────────────────────────────────────────────────────────────
const TARGETS = { welcome: ['welcome', 0], about: ['about', 0.08], work: ['work', 0.05], process: ['process', 0.3], studio: ['studio', 0.15], finder: ['finder', 0.3], contact: ['contact', 1] };
function goTo(id) {
  const [sec, p] = TARGETS[id] || [id, 0];
  const L = layout[sec];
  if (!L) return;
  const y = L.top + L.len * p;
  if (lenis) lenis.scrollTo(y, { duration: 2.2 });
  else scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
}

function setupNav() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    e.preventDefault();
    toggleMenu(false);
    goTo(id);
  });
  $('#chapterDots').addEventListener('click', (e) => {
    const d = e.target.closest('[data-dot]');
    if (d) goTo(CHAPTER_IDS[Number(d.dataset.dot)]);
  });
  $('#menuButton').addEventListener('click', () => toggleMenu($('#mobileMenu').classList.contains('is-closed')));
}

// pixel-dissolve mobile menu
let menuAnim = 0;
function toggleMenu(open) {
  const menu = $('#mobileMenu');
  const isOpen = !menu.classList.contains('is-closed');
  if (open === isOpen) return;
  $('#menuButton').setAttribute('aria-expanded', String(open));
  const cv = $('#menuPixels');
  const dpr = Math.min(devicePixelRatio, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const g = cv.getContext('2d');
  const cell = 28 * dpr;
  const cols = Math.ceil(cv.width / cell), rows = Math.ceil(cv.height / cell);
  const order = Array.from({ length: cols * rows }, (_, i) => i).sort(() => Math.random() - 0.5);
  const start = performance.now();
  const dur = reduced ? 1 : 520;
  if (open) { menu.classList.remove('is-closed'); lenis?.stop(); }
  cancelAnimationFrame(menuAnim);
  const tick = (t) => {
    const p = clamp((t - start) / dur);
    const n = Math.floor(order.length * (open ? p : 1 - p));
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#05070c';
    for (let i = 0; i < n; i++) { const k = order[i]; g.fillRect((k % cols) * cell, Math.floor(k / cols) * cell, cell + 1, cell + 1); }
    if (p < 1) menuAnim = requestAnimationFrame(tick);
    else if (!open) { menu.classList.add('is-closed'); lenis?.start(); }
  };
  if (!open) menu.classList.add('is-closing');
  menuAnim = requestAnimationFrame(tick);
  if (!open) setTimeout(() => menu.classList.remove('is-closing'), dur);
}

// ── Dialogs + form ──────────────────────────────────────────────────────────
function openDialog(d) {
  toggleMenu(false);
  d.showModal();
  lenis?.stop();
}
function openApply(programId, source) {
  const form = $('#applyForm');
  if (programId) { const r = $(`input[name=program][value="${CSS.escape(programId)}"]`, form); if (r) r.checked = true; }
  form.elements.source.value = source || '';
  $('#formStatus').textContent = '';
  openDialog($('#applyDialog'));
}
function openPlacements() {
  const d = $('#placementsDialog');
  openDialog(d);
  $$('[data-count]', d).forEach(countUp);
}
function setupCardTilt() {
  if (matchMedia('(hover: none)').matches || reduced) return;
  $('#featureCards').addEventListener('pointermove', (e) => {
    const card = e.target.closest('.feature-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty('--tx', `${(-y * 8).toFixed(2)}deg`);
    card.style.setProperty('--ty', `${(x * 10).toFixed(2)}deg`);
  });
  $('#featureCards').addEventListener('pointerout', (e) => {
    const card = e.target.closest('.feature-card');
    if (card && !card.contains(e.relatedTarget)) { card.style.setProperty('--tx', '0deg'); card.style.setProperty('--ty', '0deg'); }
  });
}

function setupDialogs() {
  $$('dialog').forEach((d) => {
    d.addEventListener('close', () => lenis?.start());
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-apply]')) { e.preventDefault(); openApply(null, ''); }
    if (e.target.closest('[data-placements]')) { e.preventDefault(); openPlacements(); }
    const flip = e.target.closest('[data-flip]');
    if (flip) flip.closest('.feature-card').classList.toggle('is-flipped');
  });
  $('#filters').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $$('#filters .chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    const f = chip.dataset.filter;
    $$('#students .student').forEach((s) => (s.hidden = !(f === 'All' || s.dataset.tier === f)));
  });

  const form = $('#applyForm');
  const status = $('#formStatus');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $$('[data-err]', form).forEach((el) => (el.textContent = ''));
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    status.className = 'form__status';
    status.textContent = 'Sending…';
    try {
      const res = await fetch('/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        Object.entries(body.fields || {}).forEach(([k, m]) => { const el = $(`[data-err="${k}"]`, form); if (el) el.textContent = m; });
        throw new Error(body.error || 'Something went wrong.');
      }
      status.className = 'form__status ok';
      status.textContent = 'Application received. Our admissions team will call you within 2 working days.';
      form.reset();
      $('input[name=program]', form).checked = true;
    } catch (err) {
      status.className = 'form__status err';
      status.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
}

// ── Boot ────────────────────────────────────────────────────────────────────
async function boot() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  try {
    const res = await fetch('/api/content');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    render(await res.json());
  } catch (err) {
    console.error('Could not load content', err);
  }

  focus = prepareFocusText($('#focusText'));
  measure();
  collectLayers();
  setupNav();
  setupDialogs();
  setupCursor();
  setupCardTilt();
  const ctx = { content, layout, state, getLenis: () => lenis, getWorld: () => world, openApply };
  if (content) {
    day = createDay(ctx);
    finder = createFinder(ctx);
    createAsk(ctx);
    createRoute(ctx);
  }
  createSteps(ctx);
  statement = createStatement();

  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 1, touchMultiplier: 1.4 });
    window.__lenis = lenis;
  }

  // fonts first: the 3D placement screens are drawn with them
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  try {
    const { createWorld } = await import('./world.js?v=8');
    world = createWorld($('#world'), { featured, programColors: PROGRAM_COLORS, tip: $('#tileTip'), onTileClick: (i) => finder?.onTileClick(i) || day?.onTileClick(i) });
    finder?.sync();
  } catch (err) {
    console.error('WebGL unavailable', err);
    document.body.classList.add('no-webgl');
  }

  addEventListener('resize', () => { measure(); });
  document.body.classList.remove('is-loading');
  requestAnimationFrame(() => document.body.classList.add('is-ready'));

  const loop = (t) => {
    lenis?.raf(t);
    update();
    world?.render(state);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
