// Spheronix Technology — Corporate Training website server
// Node (>= 22.5): static site, content API, applications (MongoDB Atlas),
// admin dashboard API and the AI admissions assistant (Google AI Studio / Gemini).
import http from 'node:http';
import crypto from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getContent, getDefaults, saveContent, resetContent } from './data/store.js';
import { answer, sanitizeHistory } from './data/assistant.js';
import {
  connectDb,
  getDbStatus,
  insertApplication,
  listApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  getOverview,
  getApplicationsCsv,
} from './data/db.js';
import { sendApplicantAlert, getMailStatus } from './data/mail.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 4300);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const STATUSES = ['new', 'contacted', 'enrolled', 'not-interested'];

// ── Helpers ─────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}
const json = (res, status, data, headers = {}) =>
  send(res, status, JSON.stringify(data), { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...headers });

async function readBody(req, limit = 16 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function readJson(req, limit) {
  try {
    return { data: JSON.parse(await readBody(req, limit)) };
  } catch (err) {
    return { error: err.status ? { status: err.status, msg: err.message } : { status: 400, msg: 'Invalid JSON' } };
  }
}

// Sliding-window rate limiter: `max` hits per `windowMs` per key.
function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
    return recent.length > max;
  };
}
const applyLimited = limiter(5, 10 * 60 * 1000);
const chatLimited = limiter(20, 10 * 60 * 1000);
const loginLimited = limiter(8, 15 * 60 * 1000);
const ipOf = (req) => req.socket.remoteAddress || 'unknown';

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
function validateApplication(input) {
  const data = {
    name: clean(input.name, 80),
    email: clean(input.email, 120).toLowerCase(),
    phone: clean(input.phone, 20),
    program: clean(input.program, 30),
    background: clean(input.background, 40),
    message: clean(input.message, 1000),
    source: clean(input.source, 40),
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Please enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = 'Please enter a valid email.';
  if (!/^[+\d][\d\s-]{8,18}$/.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
  if (!getContent().programs.some((p) => p.id === data.program)) errors.program = 'Please choose a program.';
  return { data, errors };
}

// ── Admin sessions ──────────────────────────────────────────────────────────
const sessions = new Map(); // id → expiry
const SESSION_MS = 8 * 60 * 60 * 1000;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
function cookies(req) {
  const raw = req.headers.cookie || '';
  const pairs = raw
    .split(';')
    .map((c) => c.trim().split('='))
    .filter((p) => p[0])
    .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]);
  return Object.fromEntries(pairs);
}
function isAdmin(req) {
  const auth = req.headers.authorization || '';
  if (ADMIN_TOKEN && auth.startsWith('Bearer ') && safeEqual(auth.slice(7), ADMIN_TOKEN)) return true;
  const sid = cookies(req).sx_admin;
  const exp = sid && sessions.get(sid);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(sid); return false; }
  return true;
}
// Mutating admin requests must carry this header: a cross-site form cannot set it.
const csrfOk = (req) => req.headers['x-requested-with'] === 'spheronix-admin' || (req.headers.authorization || '').startsWith('Bearer ');
const cookie = (value, maxAge) => `sx_admin=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`;

// ── Static files ────────────────────────────────────────────────────────────
async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/admin') rel = '/admin/';
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = path.resolve(PUBLIC_DIR, '.' + rel);
  const relative = path.relative(PUBLIC_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return send(res, 403, 'Forbidden');
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, req.method === 'HEAD' ? undefined : body, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
  } catch {
    const notFound = await readFile(path.join(PUBLIC_DIR, 'index.html'));
    send(res, 404, notFound, { 'Content-Type': MIME['.html'] });
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────
async function adminRoutes(req, res, pathname) {
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    if (!ADMIN_PASSWORD) return json(res, 503, { error: 'Admin login is disabled. Start the server with ADMIN_PASSWORD set.' });
    if (loginLimited(ipOf(req))) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const { data, error } = await readJson(req, 2048);
    if (error) return json(res, error.status, { error: error.msg });
    if (!safeEqual(data.password || '', ADMIN_PASSWORD)) return json(res, 401, { error: 'Wrong password.' });
    const sid = crypto.randomBytes(32).toString('hex');
    sessions.set(sid, Date.now() + SESSION_MS);
    return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(sid, SESSION_MS / 1000) });
  }
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    sessions.delete(cookies(req).sx_admin);
    return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
  }
  if (pathname === '/api/admin/me') return json(res, 200, { admin: isAdmin(req), loginEnabled: !!ADMIN_PASSWORD });

  if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' });
  if (req.method !== 'GET' && !csrfOk(req)) return json(res, 403, { error: 'Missing X-Requested-With header' });

  if (pathname === '/api/admin/overview' && req.method === 'GET') {
    try {
      const stats = await getOverview();
      return json(res, 200, {
        ...stats,
        dbStatus: getDbStatus(),
        mailStatus: getMailStatus(),
      });
    } catch (err) {
      console.error('Overview error:', err);
      return json(res, 500, { error: 'Failed to load overview data from MongoDB.' });
    }
  }

  if (pathname === '/api/admin/status' && req.method === 'GET') {
    return json(res, 200, { status: getDbStatus() });
  }

  if (pathname === '/api/admin/applications' && req.method === 'GET') {
    const u = new URL(req.url, 'http://x').searchParams;
    const term = clean(u.get('q'), 80);
    try {
      const applications = await listApplications({
        status: clean(u.get('status'), 20),
        program: clean(u.get('program'), 30),
        q: term,
      });
      return json(res, 200, {
        applications,
        statuses: STATUSES,
      });
    } catch (err) {
      console.error('List applications error:', err);
      return json(res, 500, { error: 'Database query failed.' });
    }
  }

  if (pathname === '/api/admin/applications.csv' && req.method === 'GET') {
    try {
      const csv = await getApplicationsCsv();
      return send(res, 200, csv, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="applications.csv"',
        'Cache-Control': 'no-store',
      });
    } catch (err) {
      console.error('CSV export error:', err);
      return json(res, 500, { error: 'Failed to generate CSV.' });
    }
  }

  const m = pathname.match(/^\/api\/admin\/applications\/([a-zA-Z0-9_-]+)$/);
  if (m) {
    const id = m[1];
    try {
      const row = await getApplication(id);
      if (!row) return json(res, 404, { error: 'Not found' });
      if (req.method === 'PATCH') {
        const { data, error } = await readJson(req, 8 * 1024);
        if (error) return json(res, error.status, { error: error.msg });
        const status = data.status ?? row.status;
        if (!STATUSES.includes(status)) return json(res, 422, { error: 'Unknown status' });
        const updated = await updateApplication(id, {
          status,
          notes: clean(data.notes ?? row.notes, 2000),
        });
        return json(res, 200, { application: updated });
      }
      if (req.method === 'DELETE') {
        await deleteApplication(id);
        return json(res, 200, { ok: true });
      }
    } catch (err) {
      console.error('Application detail/action error:', err);
      return json(res, 500, { error: 'Database operation failed.' });
    }
  }

  if (pathname === '/api/admin/content') {
    if (req.method === 'GET') return json(res, 200, { content: getContent(), defaults: getDefaults() });
    if (req.method === 'PUT') {
      const { data, error } = await readJson(req, 512 * 1024);
      if (error) return json(res, error.status, { error: error.msg });
      const result = saveContent(data.content);
      return result.ok ? json(res, 200, { ok: true, content: getContent() }) : json(res, 422, { error: 'Please fix these fields.', errors: result.errors });
    }
  }
  if (pathname === '/api/admin/content/reset' && req.method === 'POST') {
    resetContent();
    return json(res, 200, { ok: true, content: getContent() });
  }
  return json(res, 404, { error: 'Not found' });
}

async function chat(req, res) {
  if (chatLimited(ipOf(req))) return json(res, 429, { error: 'Too many questions in a short time. Please wait a few minutes.' });
  const { data, error } = await readJson(req, 32 * 1024);
  if (error) return json(res, error.status, { error: error.msg });
  const messages = sanitizeHistory(data.messages);
  if (!messages) return json(res, 400, { error: 'Send a question.' });

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  };
  const result = await answer(getContent(), messages, (text) => {
    start();
    res.write(`data: ${JSON.stringify({ text })}\n\n`);
  });
  if (!started && !result.ok) return json(res, result.status, { error: result.error });
  start();
  res.write(result.ok ? 'data: {"done":true}\n\n' : `data: ${JSON.stringify({ error: result.error })}\n\n`);
  res.end();
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname === '/api/health') return json(res, 200, { ok: true, db: getDbStatus() });
    if (pathname === '/api/content' && req.method === 'GET') return json(res, 200, getContent());

    if (pathname === '/api/apply' && req.method === 'POST') {
      if (applyLimited(ipOf(req))) return json(res, 429, { error: 'Too many requests. Please try again later.' });
      const { data: input, error } = await readJson(req);
      if (error) return json(res, error.status, { error: error.msg });
      if (input.website) return json(res, 200, { ok: true }); // honeypot field for bots
      const { data, errors } = validateApplication(input);
      if (Object.keys(errors).length) return json(res, 422, { error: 'Please check the form.', fields: errors });

      try {
        const result = await insertApplication(data);

        // Send email alert to spheronixtechnology@gmail.com asynchronously
        sendApplicantAlert(data, result.id, getContent()).catch((err) => {
          console.error('Email alert delivery error:', err.message);
        });

        return json(res, 201, { ok: true, id: result.id });
      } catch (err) {
        console.error('Failed to save application to MongoDB:', err);
        return json(res, 500, { error: 'Failed to record application. Please verify MongoDB connection.' });
      }
    }

    if (pathname === '/api/chat' && req.method === 'POST') return chat(req, res);

    // legacy token-only listing
    if (pathname === '/api/applications' && req.method === 'GET') {
      if (!ADMIN_TOKEN || !isAdmin(req)) return json(res, 401, { error: 'Unauthorized' });
      const applications = await listApplications();
      return json(res, 200, { applications });
    }

    if (pathname.startsWith('/api/admin/')) return adminRoutes(req, res, pathname);
    if (pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) return json(res, 500, { error: 'Server error' });
    res.end();
  }
});

server.listen(PORT, async () => {
  console.log(`Spheronix training site running at http://localhost:${PORT}`);
  console.log(ADMIN_PASSWORD ? 'Admin dashboard: /admin' : 'ADMIN_PASSWORD not set — the admin dashboard login is disabled.');
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.log('GEMINI_API_KEY not set — the AI admissions assistant will show a fallback message.');
  }

  // Mail notification status
  const mailStatus = getMailStatus();
  if (mailStatus.configured) {
    console.log(`Email alerts: Active (sending to ${mailStatus.recipient})`);
  } else {
    console.log(`Email alerts: Ready (set SMTP_PASS in .env to deliver to ${mailStatus.recipient})`);
  }

  // Attempt initial database connection
  try {
    await connectDb();
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.warn(`MongoDB initial connection notice: ${err.message}.`);
  }
});
