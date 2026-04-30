import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set. See .env.local.example." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const jobDescription = formData.get("jobDescription");
  const cvText = formData.get("cvText");

  if (typeof jobDescription !== "string" || !jobDescription.trim()) {
    return NextResponse.json(
      { error: "Job description is required." },
      { status: 400 }
    );
  }

  if (typeof cvText !== "string" || !cvText.trim()) {
    return NextResponse.json(
      { error: "Please paste your CV text." },
      { status: 400 }
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>;
  try {
    completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are a professional CV writer specialising in aggressive, targeted tailoring. Your task is to transform the candidate's CV into a highly customised document that feels written specifically for this role — not merely reformatted.

STRICT RULES (never break these):
- Do NOT invent jobs, qualifications, skills, or achievements the candidate does not have.
- Preserve all contact details, dates, company names, and job titles exactly.
- Respond in the same language as the original CV.
- Return ONLY the final CV text — no commentary, no explanation, no metadata.
- Never append a "Keywords" or "Key Terms" section of any kind.
- Never insert bracketed notes, parenthetical comments, or AI meta-commentary inside the CV text (e.g. "(Removed project X because…)", "Note: tailored for…", "[Added to match JD]"). The output must read as a clean human-written CV with zero AI artefacts.

TAILORING INSTRUCTIONS — apply every one of these:

1. PROFILE / OBJECTIVE SECTION
   - If one exists, rewrite it completely. If not, add one at the top (after contact info).
   - It must explicitly name the target job title and, if the company name appears in the job description, name the company.
   - Open with the candidate's strongest matching credentials, then connect them directly to the role's core requirements using the job description's exact language.
   - 3–5 sentences maximum. No filler phrases ("results-driven", "team player", "passionate about").

2. EXPERIENCE BULLETS
   - Reorder bullet points within each role so the most relevant ones appear first.
   - Rewrite each bullet to mirror the terminology, action verbs, and keywords from the job description wherever they honestly apply.
   - Quantify impact wherever the original CV provides numbers; if the original is vague, keep it vague — do not fabricate metrics.
   - Cut or compress bullets about responsibilities irrelevant to this role.
   - Move the most relevant past role to the top if chronological order is not strictly required.

3. SKILLS / TECHNICAL SECTION
   - Reorder skills so the ones most mentioned in the job description appear first.
   - Use the exact spelling and capitalisation the job description uses (e.g. if JD says "React.js" not "ReactJS", match it).

4. PROJECTS SECTION (if present)
   - Reorder projects so the most relevant to this role appear first.
   - Rewrite project descriptions to use the job description's vocabulary and highlight the outcomes most relevant to the role.

5. EDUCATION & CERTIFICATIONS
   - If the job description calls out specific qualifications or certifications the candidate holds, bold or surface them prominently.

6. KEYWORDS
   - Do a final pass: identify the 8–12 most important keywords/phrases in the job description and confirm each one appears naturally at least once in the tailored CV — woven into context, not stuffed in a list.

---
JOB DESCRIPTION:
${jobDescription}

---
ORIGINAL CV:
${cvText.trim()}`,
        },
      ],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Groq API request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const result = completion.choices[0]?.message?.content ?? "";

  return NextResponse.json({ result });
}
