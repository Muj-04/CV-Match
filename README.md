# CV Match: AI-Powered CV Tailoring

**Live:** https://cv-match-omega.vercel.app

CV Match rewrites your CV to fit a specific job description without inventing anything. Paste a job description and your CV (or upload it as a PDF). It reorders and rewrites your existing experience so the most relevant parts come first and match the job's wording.

## Features

- **Two tailoring modes**
  - **Honest:** a strict rewriter. Every bullet must come from your original CV. It never adds skills, tools, jobs or extra bullets, and never changes job titles.
  - **Hero:** bolder, achievement-focused wording with strong action verbs. It still has hard limits: no invented jobs, dates, skills or years of experience.
- **PDF upload:** extracts text from PDF CVs in the browser with PDF.js, and warns you when a design-template PDF (for example, from Canva) can't be read.
- **Match score:** compares the job description's keywords before and after tailoring.
- **Missing keywords:** lists important keywords from the job description that your CV doesn't mention, so you know what's genuinely missing.
- **Arabic and English:** answers in the same language as your CV, with right-to-left layout for Arabic.
- **PDF export:** download the tailored CV.
- **Free with no signup.** A public counter shows how many CVs have been tailored.

## How it works

1. `app/tailor/page.tsx` collects the job description, CV text and mode.
2. `POST /api/tailor` sends a mode-specific prompt to **Claude** (Anthropic API) with strict rules against fabrication.
3. The result is saved to **Supabase** (`cv_submissions`) for usage stats, and `GET /api/stats` returns the total count.
4. The client calculates the match score and missing keywords, then renders the CV with export options.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Anthropic SDK · Supabase · PDF.js · Vercel

## Running locally

```bash
npm install
```

Create `.env.local`:

```
ANTHROPIC_API_KEY=your_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

Then start the dev server and open http://localhost:3000:

```bash
npm run dev
```

---
Author: [Mujahed Alabed](https://github.com/Muj-04)
