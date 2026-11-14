// AI admissions assistant — answers questions about Spheronix training using
// only the site content. Powered by Google AI Studio (Gemini).
// Streams the reply back to the browser.
import { GoogleGenAI } from '@google/genai';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let client = null;

function getClient() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!apiKey) return null;
  return (client ??= new GoogleGenAI({ apiKey }));
}

const RULES = `You are the admissions assistant on the Spheronix Technology corporate-training website.
You talk with prospective students (often final-year students or recent graduates in India) and their parents.

How to answer:
- Use only the facts in <site_content>. If the answer is not there — fees, EMI, batch dates, seats, eligibility cut-offs, salaries, refund rules — say the admissions team will confirm it, and suggest the "Apply now" button or the contact email. Never guess or invent numbers, dates, companies or guarantees.
- Never promise a job or a package. Spheronix offers job assistance, not guaranteed placement.
- When <site_content> marks placement data as sample data, do not quote those names, companies or numbers as real results. Say that real placement records are shared by the admissions team.
- Keep replies short: 2–5 sentences, or a few bullets for lists. Plain text, no headings, no markdown tables.
- Be warm and direct. Reply in the language the user writes in.
- If someone asks for help unrelated to Spheronix training, briefly say you can only help with questions about the programs and admissions.
- When it helps, end by pointing to a next step: a program's month-by-month plan on the site, the program finder, or "Apply now".`;

function siteFacts(c) {
  const program = Object.fromEntries(c.programs.map((p) => [p.id, p.title]));
  const lines = [];
  lines.push(`Company: ${c.company.name}. Contact: ${c.company.email}, ${c.company.phone}. Address: ${c.company.address}.`);
  lines.push('Format: 6 months in total — 4 months of B-School style training with day-to-day practical work, then 2 months working on live Spheronix company projects. After 6 months students receive a letter of experience and job assistance. Hiring partners include MNCs, mid-level companies, startups and non-tech companies.');
  lines.push('\nPrograms:');
  for (const p of c.programs) {
    lines.push(`- ${p.title} (${p.short}): ${p.summary} Tools: ${p.tags.join(', ')}. Month by month: ${p.months.map((m, i) => `M${i + 1} ${m}`).join('; ')}; M5–M6 live company project. Capstone: ${p.capstone}`);
  }
  lines.push('\nHow the training works:');
  c.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.tag} — ${s.title} ${s.body}`));
  lines.push('\nA typical training day:');
  c.day.forEach((d) => lines.push(`${d.time} ${d.title}: ${d.text}`));
  lines.push('\nWhat is included:');
  c.capabilities.forEach((x) => lines.push(`- ${x.title}: ${x.text}`));
  lines.push(`\nPlacement data is ${c.sampleNotice ? 'SAMPLE DATA (not real records)' : 'real'}:`);
  c.placements.forEach((p) => lines.push(`- ${p.name}, ${program[p.program]}, ${p.role} at ${p.company} (${p.tier}), ${p.pkg}, batch ${p.batch}`));
  lines.push(`Hiring company categories: ${Object.entries(c.companies).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' | ')}`);
  return lines.join('\n');
}

const clean = (v, max) => String(v ?? '').slice(0, max);

/** Validates the browser-sent history: alternating user/assistant turns, user last. */
export function sanitizeHistory(input) {
  if (!Array.isArray(input)) return null;
  const msgs = input.slice(-12)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: clean(m.content.trim(), 1500) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const out = [];
  for (const m of msgs) {
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1] = m;
    else out.push(m);
  }
  return out.length && out[out.length - 1].role === 'user' ? out : null;
}

/**
 * Streams an answer using Google AI Studio (Gemini). Calls onText(delta) for each text chunk.
 * Resolves to { ok: true } or { ok: false, status, error }.
 */
export async function answer(content, messages, onText) {
  const ai = getClient();
  if (!ai) {
    return { ok: false, status: 503, error: 'The assistant is not configured yet. Please set GEMINI_API_KEY in .env.' };
  }

  try {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const systemInstruction = `${RULES}\n\n<site_content>\n${siteFacts(content)}\n</site_content>`;

    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 1500,
        temperature: 0.3,
      },
    });

    let hasText = false;
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        hasText = true;
        onText(text);
      }
    }

    if (!hasText) {
      onText('Sorry, I couldn’t process that. Please ask about Spheronix training programs or admissions.');
    }

    return { ok: true };
  } catch (err) {
    console.error('Gemini Assistant error:', err?.message || err);

    const msg = String(err?.message || '');
    const status = err?.status || err?.code;

    if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('apiKey')) {
      return { ok: false, status: 503, error: 'The assistant API key is invalid or not configured yet.' };
    }
    if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
      return { ok: false, status: 429, error: 'The assistant is busy right now. Please try again in a minute.' };
    }
    return { ok: false, status: 502, error: 'The assistant is temporarily unavailable. Please try again shortly.' };
  }
}
