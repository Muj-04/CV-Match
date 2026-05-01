@AGENTS.md

---

# CV Match — Project Context for AI Agents

## What This Project Is

**CV Match** is a single-page web app that helps job seekers tailor their CV to a specific job description using AI. The user pastes a job description and their CV text, clicks a button, and receives a rewritten CV that mirrors the JD's terminology, reorders bullets by relevance, and surfaces the right keywords — without fabricating anything.

Built as a weekend side project by Mujahed. Target audience: Arabic and English speakers applying to competitive roles.

---

## Tech Stack

| Technology | Version | Why |
|---|---|---|
| **Next.js** | 16 (App Router) | Chosen for API routes (avoids a separate backend), file-based routing, and Vercel deployment |
| **TypeScript** | 5 | Type safety, autocomplete |
| **Tailwind CSS** | v4 | Utility-first styling; v4 uses CSS-variable config — no `tailwind.config.js` |
| **React** | 19 | Bundled with Next.js 16 |
| **react-markdown** | 10 | Renders the AI-returned markdown CV in the browser result panel |
| **@tailwindcss/typography** | 0.5 | `prose` classes for nicely typeset markdown output |
| **Groq API** | via `openai` SDK | See "Anthropic API situation" below. Uses `llama-3.1-8b-instant` |
| **openai SDK** | 6 | Used as a compatibility shim to talk to Groq's OpenAI-compatible endpoint |

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Paste job description | **Done** | Textarea, validated |
| Paste CV text | **Done** | Textarea only — file upload was removed (see below) |
| AI tailoring via API | **Done** | Calls Groq → llama-3.1-8b-instant |
| Result display (markdown) | **Done** | ReactMarkdown with prose classes |
| Copy to clipboard | **Done** | Button in result header bar |
| Download as PDF | **Done** | Custom `mdToHtml` renderer + `window.open` + print dialog |
| Auth / accounts | **Not started** | Planned for a future weekend |
| Payments / usage limits | **Not started** | Planned for a future weekend |
| History / saved CVs | **Not started** | Planned for a future weekend |
| Arabic-specific UX (RTL) | **Not started** | Prompt already says "respond in same language as original CV" |

---

## Known Issues & What Was Tried

### PDF File Upload — Removed Entirely

Multiple approaches were attempted to let users upload a PDF file:

1. `pdf-parse` v2 (`PDFParse` class API) — worked locally, broke on Vercel due to native bundling
2. `pdfjs-dist` legacy build — dynamic import dance, still Vercel incompatible
3. `mammoth` for DOCX support — same bundling problems
4. Raw BT/ET text extraction (pure regex on PDF bytes) — extracted garbage text for most real CVs
5. Added `serverExternalPackages: ["pdf-parse"]` to `next.config.ts` — helped locally, not enough for Vercel serverless

**Resolution:** Removed all file upload UI and libraries. Users now paste CV text directly. This is simpler, universally compatible, and avoids the copy-protection issues that silently break PDF text extraction.

### PDF Download Quality

The "Download PDF" button went through many iterations:

- Early version had the browser printing its own header/footer (URL, date) over the CV
- Blank second page caused by body height being set to 100vh
- Skills section looked cramped — fixed with a 2-column CSS grid (`skills-list` class)
- Name/contact block was parsed from DOM (fragile) — switched to parsing raw markdown lines directly
- Em-dash and en-dash bullets weren't recognised — fixed regex in `mdToHtml`
- `@page` margins, `print-color-adjust: exact`, `orphans`/`widows` all had to be set explicitly

Current state: robust A4 layout, navy header with name + contact on one line, section headers with underline rule, skills in 2-col grid.

### AI Hallucination / Prompt Iteration

The prompt was rewritten many times to stop the model from:

- Inventing job roles that don't exist in the original CV
- Upgrading job titles (e.g. turning "Customer Service Rep" into "Senior Customer Success Manager")
- Adding "Self-Employed" or "Freelance" modifiers to roles that weren't labelled that way
- Appending a "Keywords" section (ATS stuffing, not useful to readers)
- Inserting bracketed AI meta-commentary like `(Added to match JD)`

**Current approach:** A `STRICT RULES` block at the top of the system prompt with `CRITICAL:` prefixes on the most important rules. Seems stable.

---

## Anthropic API Situation

The original plan was to use **Claude (claude-sonnet-4-6)** via the Anthropic API. This is reflected in `.env.local.example` which still references `ANTHROPIC_API_KEY`, and in the memory files that describe the project as using `claude-sonnet-4-6`.

**What happened:** The Anthropic API credits ran out / there is a billing issue. A support ticket was filed. No resolution yet as of 2026-05-01.

**Current workaround:** The app now calls **Groq** (`api.groq.com/openai/v1`) using the OpenAI SDK pointed at Groq's base URL, running `llama-3.1-8b-instant`. The env variable is `GROQ_API_KEY`.

**When Anthropic credits are restored:** Switch `route.ts` back to the Anthropic SDK (`anthropic` package), replace the `openai` client with `Anthropic`, and change the model to `claude-sonnet-4-6`. The prompt can stay the same — it was written for Claude anyway.

---

## Important Decisions Made

1. **Paste-only input (no file upload).** Attempted 5 different PDF/DOCX parsing strategies; all broke in production (Vercel serverless). Paste is simpler, more reliable, and works for all file types the user might have.

2. **Custom `mdToHtml` instead of a library for PDF rendering.** Gives precise control over the HTML structure that goes into the print window. A general-purpose markdown library would produce elements that are hard to style consistently across browsers' print engines.

3. **`window.open` + `print()` for PDF export.** Avoids server-side PDF generation libraries (Puppeteer, PDFKit) which are heavyweight and have their own Vercel issues. The tradeoff is that the browser adds UI chrome briefly and the result quality depends on the browser's print renderer — acceptable for a CV.

4. **Groq as temporary AI backend.** `openai` SDK already in the project (was added for something else), so switching to Groq only required changing the `baseURL` and `model`. Makes it trivial to swap back to Claude or any other OpenAI-compatible API.

5. **Single-file UI (`app/page.tsx`).** Kept everything in one file for the first version. When auth, history, and payment flows are added this will need to be split into components.

6. **No `tailwind.config.js`.** Tailwind v4 uses a `@import "tailwindcss"` in CSS and CSS variables for theming. Do not try to create a `tailwind.config.js` — it is not used in v4.

---

## Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
GROQ_API_KEY=your-groq-key-here
# ANTHROPIC_API_KEY=your-anthropic-key-here  # for when credits are restored
```

> **Note:** `.env.local.example` currently has a real Anthropic API key value in it — this should be replaced with a placeholder like `sk-ant-YOUR-KEY-HERE` to avoid accidentally committing credentials.

---

## Running Locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Key Files

- `app/page.tsx` — entire UI: form, result display, PDF download logic, `mdToHtml` renderer
- `app/api/tailor/route.ts` — POST handler; reads `GROQ_API_KEY`, calls Groq via OpenAI SDK
- `next.config.ts` — minimal config (`serverExternalPackages` is currently empty)
- `.env.local` — `GROQ_API_KEY` (gitignored)
- `.env.local.example` — template (commit, but replace real keys with placeholders)
