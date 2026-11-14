// Editable site content.
//
// The defaults live in content.js. On first run they are copied to
// data/content.json, which the admin dashboard edits. Every save is validated
// against the shape of the defaults and the previous version is backed up to
// data/backups/ (last 20 kept).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { content as defaults } from './content.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.CONTENT_PATH || path.join(DIR, 'content.json');
const BACKUPS = path.join(path.dirname(FILE), 'backups');
const ICONS = new Set(['code', 'chip', 'spark', 'chart', 'cursor', 'layers', 'cap', 'briefcase', 'wifi', 'rocket', 'eye', 'users', 'db', 'wave', 'chat', 'grid', 'arrow', 'box', 'nodes', 'check']);

let current = load();

function load() {
  if (!existsSync(FILE)) {
    writeFileSync(FILE, JSON.stringify(defaults, null, 2));
    return structuredClone(defaults);
  }
  const saved = JSON.parse(readFileSync(FILE, 'utf8'));
  // new top-level sections added to the defaults later are filled in
  for (const k of Object.keys(defaults)) if (!(k in saved)) saved[k] = structuredClone(defaults[k]);
  return saved;
}

export const getContent = () => current;
export const getDefaults = () => defaults;

// ── Validation ──────────────────────────────────────────────────────────────
// The new value must have the same shape as the defaults: same keys on
// objects, same item shape in arrays, same primitive types.
function shape(value, template, at, errors) {
  if (errors.length > 20) return;
  const t = Array.isArray(template) ? 'array' : template === null ? 'null' : typeof template;
  const v = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (t !== v) return errors.push(`${at}: expected ${t}, got ${v}`);
  if (t === 'string' && value.length > 3000) errors.push(`${at}: text is too long (max 3000 characters)`);
  if (t === 'number' && !Number.isFinite(value)) errors.push(`${at}: not a number`);
  if (t === 'array') {
    if (value.length > 300) errors.push(`${at}: too many items (max 300)`);
    if (template.length) value.forEach((item, i) => shape(item, template[0], `${at}[${i}]`, errors));
  }
  if (t === 'object') {
    const keys = Object.keys(template);
    for (const k of keys) {
      if (!(k in value)) errors.push(`${at}.${k}: missing`);
      else shape(value[k], template[k], `${at}.${k}`, errors);
    }
    for (const k of Object.keys(value)) if (!keys.includes(k) && !isOpenObject(at)) errors.push(`${at}.${k}: unknown field`);
  }
}
// `companies` is a map of category → names, so its keys are free-form.
const isOpenObject = (at) => at === 'content.companies';

export function validate(next) {
  const errors = [];
  if (!next || typeof next !== 'object' || Array.isArray(next)) return ['content must be an object'];
  for (const k of Object.keys(defaults)) {
    if (!(k in next)) { errors.push(`content.${k}: missing`); continue; }
    if (k === 'companies') {
      if (typeof next.companies !== 'object' || Array.isArray(next.companies) || !next.companies) errors.push('content.companies: expected object');
      else for (const [cat, list] of Object.entries(next.companies)) shape(list, ['x'], `content.companies.${cat}`, errors);
      continue;
    }
    shape(next[k], defaults[k], `content.${k}`, errors);
  }
  if (errors.length) return errors;

  // cross-field rules
  const ids = next.programs.map((p) => p.id);
  ids.forEach((id, i) => { if (!/^[a-z0-9-]{2,30}$/.test(id)) errors.push(`content.programs[${i}].id: use 2–30 lowercase letters, digits or dashes`); });
  if (new Set(ids).size !== ids.length) errors.push('content.programs: program ids must be unique');
  if (!next.programs.length) errors.push('content.programs: at least one program is required');
  next.programs.forEach((p, i) => { if (!ICONS.has(p.icon)) errors.push(`content.programs[${i}].icon: unknown icon "${p.icon}"`); });
  next.placements.forEach((p, i) => { if (!ids.includes(p.program)) errors.push(`content.placements[${i}].program: "${p.program}" is not a program id`); });
  const names = new Set(next.placements.map((p) => p.name));
  next.featured.forEach((f, i) => { if (!names.has(f.name)) errors.push(`content.featured[${i}].name: "${f.name}" is not in placements`); });
  if (next.featured.length < 1 || next.featured.length > 8) errors.push('content.featured: choose between 1 and 8 featured placements');
  if (next.steps.length !== 3) errors.push('content.steps: exactly 3 steps are required');
  next.day.forEach((d, i) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) errors.push(`content.day[${i}].time: use HH:MM (24-hour)`);
    if (!ICONS.has(d.icon)) errors.push(`content.day[${i}].icon: unknown icon "${d.icon}"`);
  });
  if (next.day.length < 2) errors.push('content.day: at least 2 activities are required');
  const times = next.day.map((d) => d.time);
  if (times.join() !== [...times].sort().join()) errors.push('content.day: activities must be in time order');
  next.capabilities.forEach((c, i) => { if (!ICONS.has(c.icon)) errors.push(`content.capabilities[${i}].icon: unknown icon "${c.icon}"`); });
  return errors;
}

export function saveContent(next) {
  const errors = validate(next);
  if (errors.length) return { ok: false, errors };
  mkdirSync(BACKUPS, { recursive: true });
  if (existsSync(FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(path.join(BACKUPS, `content-${stamp}.json`), readFileSync(FILE));
    readdirSync(BACKUPS).filter((f) => f.endsWith('.json')).sort().slice(0, -20).forEach((f) => unlinkSync(path.join(BACKUPS, f)));
  }
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2));
  renameSync(tmp, FILE);
  current = next;
  return { ok: true };
}

export function resetContent() {
  return saveContent(structuredClone(defaults));
}
