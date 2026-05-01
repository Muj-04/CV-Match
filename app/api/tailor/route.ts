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

  const honestPrompt = `You are a professional CV writer specialising in aggressive, targeted tailoring. Your task is to transform the candidate's CV into a highly customised document that feels written specifically for this role — not merely reformatted.

STRICT RULES (never break these):
- Do NOT invent jobs, qualifications, skills, or achievements the candidate does not have.
- Never invent fake job roles, future positions, or experience the candidate has not held.
- Preserve all contact details, dates, company names, and job titles exactly.
- CRITICAL: The Experience section must ONLY contain jobs explicitly listed in the candidate's CV.
- Respond in the same language as the original CV.
- Return ONLY the final CV text — no commentary, no explanation, no metadata.
- Never append a "Keywords" or "Key Terms" section of any kind.
- Never insert bracketed notes or AI meta-commentary inside the CV text.
- CRITICAL: NEVER add technologies, tools, or skills not explicitly mentioned in the original CV.
- CRITICAL: NEVER add a bullet point that dismisses or apologises for a project not matching the job.
- Only rewrite and reorder what the user already has. Do not fabricate new experiences.

TAILORING INSTRUCTIONS:
1. Rewrite the profile/summary to target this specific role and company.
2. Reorder and rewrite experience bullets to mirror the JD terminology.
3. Reorder skills so the most relevant appear first.
4. Reorder projects so the most relevant appear first.
5. Weave the 8-12 most important JD keywords naturally throughout.

---
JOB DESCRIPTION:
${jobDescription}

---
ORIGINAL CV:
${cvText.trim()}`;

  const heroPrompt = `You are an elite CV writer who transforms good candidates into irresistible ones. Your task is to rewrite this CV so powerfully that the hiring manager feels they MUST interview this person.

HARD LIMITS (never cross these):
- NEVER invent jobs, companies, dates, or tools not in the original CV.
- Preserve all contact details, dates, company names, and job titles exactly.
- The Experience section must ONLY contain jobs explicitly listed in the candidate's CV.
- Respond in the same language as the original CV.
- Return ONLY the final CV text — no commentary, no explanation, no metadata.
- Never append a "Keywords" section or insert bracketed notes.

HERO MODE INSTRUCTIONS — write like a top-tier candidate:

1. PROFILE: Write a commanding 3-4 sentence summary that positions this candidate as the obvious choice. Lead with their strongest credential, connect it to the role's core need, and close with a confident statement of value. No weak phrases like "seeking opportunity" or "looking to grow".

2. EXPERIENCE BULLETS: Transform every bullet into an achievement, not a duty.
   - Use powerful action verbs: Led, Drove, Delivered, Spearheaded, Transformed, Accelerated, Captured, Secured.
   - Frame everything as impact: not "responsible for" but "delivered", not "helped with" but "drove".
   - If the original has numbers, amplify their presentation. If vague, imply scale confidently ("across multiple teams", "at enterprise scale", "serving thousands").
   - You MAY infer soft skills and transferable strengths from context (e.g. if they led a project, you can say they demonstrated leadership).
   - Reorder so the most impressive, relevant bullets appear first.

3. SKILLS: Reorder to lead with the most in-demand skills for this role. Match the JD's exact terminology.

4. PROJECTS: Reframe each project as a strategic initiative with clear outcomes. Lead with impact, not process.

5. KEYWORDS: Ensure the 8-12 most critical JD keywords appear naturally and prominently.

Write this CV as if the candidate is already a top performer who belongs in this role.

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
    return NextResponse.json({ result });

  } catch (err) {
    const message = err instanceof Error ? err.message : "API request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
