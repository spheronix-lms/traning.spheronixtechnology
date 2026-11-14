# Spheronix Technology — Corporate Training website

A one-page, scroll-driven site for Spheronix corporate training: four programs
(AI-Integrated Full Stack, Embedded Systems & IoT, Generative AI, Data
Analysis), the 4 + 2 month B-School training model, placements, process and an
application form backed by a small API.

Design: one continuous WebGL world driven by scroll. A grid "planet" with
"+" markers, sixteen glossy blue icon tiles, six 3D placement screens and a
process route. Seven pinned chapters (Welcome → About → Placements → Process →
Studio → Apply) re-frame the camera and re-arrange the tiles. The type is
42dot Sans + Geist Mono, with a chapter indicator, chapter dots, focus-text
highlighting, decode/typing effects and a pixel-dissolve mobile menu.

## Run

Requires Node.js >= 22.5 and MongoDB (Atlas or local).

```bash
npm install          # installs dependencies (@google/genai, mongodb)
copy .env.example .env # Windows CMD (or cp on macOS/Linux)
npm start            # http://localhost:4300
```

| Variable | Needed for |
| :-- | :-- |
| `ADMIN_PASSWORD` | Signing in to the admin dashboard at `/admin` (disabled when unset) |
| `GEMINI_API_KEY` | The AI admissions assistant via Google AI Studio (shows a contact fallback when unset) |
| `MONGODB_URI` | MongoDB Atlas or local connection string (e.g. `mongodb+srv://...`) |
| `ADMIN_TOKEN` | Optional bearer token for scripts calling `/api/admin/*` |
| `COOKIE_SECURE=1` | Set when the site is served over HTTPS |

## Features

- **3D program finder** (chapter 05): visitors pick up to three interest tiles —
  in the 3D wall or the list — and get a matched program with a score breakdown.
  "Apply for this program" opens the form pre-filled and tags the application
  with `source = program finder`. Interest → program weights live in
  `public/js/interests.js`.
- **A day at Spheronix** (in Process): a 09:00 → 18:00 timeline driven by
  scroll. Drag the time handle, click a time, or use the arrow keys. The
  activity tiles follow a sun path and the sky changes through the day.
  Edit the schedule in the admin dashboard.
- **AI admissions assistant**: the "Ask admissions" button opens a chat that
  answers from the site content only (powered by Google AI Studio Gemini,
  streamed). It is told never to invent fees, dates, seats, salaries or job
  guarantees, and not to present sample placements as real. Server-side refusal
  fallback is enabled. Rate limit: 20 questions / 10 min / IP.
- **Admin dashboard** (`/admin`): overview charts, applications (search,
  filter, status, notes, delete, CSV export) and a content editor for every
  section of the site. Saves are validated; the previous version is backed up
  to `data/backups/` (last 20).

## Structure

```
server.js            Node http server: static files, content/apply/chat/admin APIs
data/content.js      Default site content (copied to data/content.json on first run)
data/store.js        Editable content store + validation + backups
data/assistant.js    AI admissions assistant (Anthropic SDK)
public/index.html    Pinned chapter sections (data-vh = scroll length, data-range = layer fades)
public/styles.css    Design system, chapter layers, dialogs, responsive rules
public/js/app.js     Renders content, scroll engine, layer/text animations, dialogs, form
public/js/features.js  Day timeline, program finder, assistant chat
public/js/world.js   Three.js world: planet grid, tiles, screens, route, shot timeline (KEYS)
public/js/interests.js  Finder interests + program weights (tile order)
public/js/icons.js   Shared 24×24 line icons (DOM + WebGL textures)
public/admin/        Admin dashboard (index.html, admin.js, admin.css)
db/spheronix.db      SQLite file, created on first run (git-ignored)
```

## API

| Method | Path | Notes |
| :-- | :-- | :-- |
| GET | `/api/content` | Current site content |
| POST | `/api/apply` | `{ name, email, phone, program, background?, message?, source? }` — validated, 5 / 10 min / IP |
| POST | `/api/chat` | `{ messages: [{role, content}] }` → server-sent events `{text}` … `{done}` |
| POST | `/api/admin/login` · `/logout` | Password login → HttpOnly, SameSite=Strict session cookie (8 h); 8 attempts / 15 min / IP |
| GET | `/api/admin/overview` · `/applications` · `/applications.csv` · `/content` | Admin only |
| PATCH / DELETE | `/api/admin/applications/:id` | Status + notes / delete. Mutations require `X-Requested-With: spheronix-admin` |
| PUT | `/api/admin/content` | Replace content (validated); `POST /api/admin/content/reset` restores defaults |

## Before going live

- **Replace the sample data.** `stats`, `placements`, `featured` and `companies`
  in `data/content.js` are fictional placeholders. Swap in real, consented
  student records and real hiring companies, then set `sampleNotice = false`.
- Set the real email, phone and address in `company` in `data/content.js`.
- Put the server behind HTTPS (nginx / Caddy / a PaaS), set `COOKIE_SECURE=1` and a strong `ADMIN_PASSWORD`.
- Add an `ANTHROPIC_API_KEY` to switch on the admissions assistant.
"# traning.spheronixtechnology" 
"# traning.spheronixtechnology" 
