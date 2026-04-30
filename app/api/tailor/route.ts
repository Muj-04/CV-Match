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
          content: `You are an expert CV/resume tailoring specialist. Your job is to rewrite the candidate's CV so it is a strong match for the job description below.

Guidelines:
- Mirror keywords and phrases from the job description where they honestly apply to the candidate's experience.
- Reorder bullet points and sections to lead with the most relevant experience.
- Strengthen weak or generic bullet points using the context of the role.
- Do NOT invent experience or credentials the candidate does not have.
- Preserve every section of the original CV (contact info, education, projects, etc.).
- Respond in the same language as the original CV.
- Return ONLY the tailored CV text — no preamble, no explanation.

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
