import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const jobDescription = formData.get("jobDescription");
  const cvText = formData.get("cvText");
  const mode = formData.get("mode");

  if (typeof jobDescription !== "string" || !jobDescription.trim()) {
    return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  }
  if (typeof cvText !== "string" || !cvText.trim()) {
    return NextResponse.json({ error: "Please paste your CV text." }, { status: 400 });
  }

  const isHeroMode = mode === "hero";

  const honestPrompt = `You are a professional CV writer. Your only job is to rewrite and reorder the candidate's existing CV to better match the job description. You are NOT allowed to add anything new.

ABSOLUTE RULES — these override everything else:
- Every single word in the output must come from the original CV. No exceptions.
- NEVER add any skill, tool, technology, framework, or methodology that does not appear word-for-word in the original CV.
- NEVER add: RAG, Docker, AWS, FastAPI, REST API, PostgreSQL, vector databases, containerisation, orchestration, model evaluation, feedback loops, or ANY other term from the job description unless it is already in the original CV.
- NEVER rewrite a bullet to imply the candidate did something they did not do.
- NEVER add new categories to the skills section.
- NEVER rename or upgrade job titles.
- NEVER add jobs that are not in the original CV.
- Preserve all contact details, dates, company names, and job titles exactly.
- Return ONLY the final CV text. No commentary, no notes, no metadata.
- Respond in the same language as the original CV.
- Never repeat the same bullet point twice within the same job entry. Each bullet must be meaningfully different from every other bullet in the same role.

WHAT YOU ARE ALLOWED TO DO:
- Reorder bullet points within a role so the most relevant ones appear first.
- Rewrite existing bullets using stronger action verbs, as long as the meaning stays true.
- Reorder skills so the most relevant to the JD appear first.
- Reorder projects so the most relevant appear first.
- Rewrite the summary/profile using only information already present in the CV.
- Match capitalisation and spelling of skills to how the JD writes them, only if the skill already exists in the CV.

---
JOB DESCRIPTION:
${jobDescription}

---
ORIGINAL CV:
${cvText.trim()}`;

  const heroPrompt = `You are an elite CV writer who makes candidates sound like top-tier professionals. Your job is to rewrite the candidate's CV to be bold, confident, and achievement-focused — while respecting hard limits on fabrication.

HARD LIMITS — never break these regardless of anything else:
- NEVER invent jobs, companies, dates, or job titles not in the original CV.
- NEVER add skills, tools, or technologies not explicitly in the original CV skills section. No RAG, Docker, AWS, FastAPI, REST API, PostgreSQL, vector databases, or any other JD keyword unless already in the original CV.
- NEVER add new skill categories that don't exist in the original.
- Preserve all contact details, dates, company names, and job titles exactly.
- Return ONLY the final CV text. No commentary, no notes, no metadata.
- Respond in the same language as the original CV.
- NEVER claim years of experience that are not stated in the original CV. If the original CV does not mention a specific number of years, do not invent one in the profile/summary.
- NEVER claim expertise in specific techniques (fine-tuning, LoRA, RAG, RLHF etc.) that are not explicitly listed in the original CV skills section, even in the summary or profile.

WHAT YOU ARE ENCOURAGED TO DO:
- Use powerful, confident action verbs: engineered, spearheaded, architected, delivered, drove, led, optimised.
- Imply scale and impact from context — if they handled customer calls, they handled high-volume operations.
- Reframe tasks as achievements — not "responsible for" but "delivered", "improved", "built".
- Write the profile as a top-tier candidate who is exactly right for this role.
- Surface every transferable skill and strength that can honestly be inferred from their experience.
- Reorder everything — bullets, skills, projects — so the most relevant appears first.
- Make every bullet sound like it had business impact.
- Weave the 8-12 most important JD keywords naturally throughout, but only where they honestly apply to existing experience.

---
JOB DESCRIPTION:
${jobDescription}

---
ORIGINAL CV:
${cvText.trim()}`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: isHeroMode ? heroPrompt : honestPrompt
        }
      ]
    });

    const result = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );
      await supabase.from('cv_submissions').insert({
        job_description: jobDescription,
        original_cv: cvText.trim(),
        tailored_cv: result,
        mode: formData.get('mode') === 'hero' ? 'hero' : 'honest'
      });
    } catch (dbErr) {
      console.error('DB save failed (non-blocking):', dbErr);
    }

    return NextResponse.json({ result });

  } catch (err) {
    const message = err instanceof Error ? err.message : "API request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
