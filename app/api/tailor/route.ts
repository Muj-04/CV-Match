import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 10;

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamic import of the legacy build — the only pdfjs-dist build that works
  // in Node.js serverless (no DOMMatrix / browser globals required).
  const { getDocument, GlobalWorkerOptions } = await import(
    "pdfjs-dist/legacy/build/pdf.mjs" as string
  ) as typeof import("pdfjs-dist");

  // Disable the web worker — not available in a serverless Lambda.
  GlobalWorkerOptions.workerSrc = "";

  const data = new Uint8Array(buffer);
  const pdf = await getDocument({ data, useWorkerFetch: false }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => "str" in item)
      .map((item) => (item as { str: string }).str)
      .join(" ");
    pages.push(pageText);
    page.cleanup();
  }

  await pdf.cleanup();
  return pages.join("\n").trim();
}

async function extractText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfText(buffer);
  }

  if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
}

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
  const cvFile = formData.get("cv");

  if (typeof jobDescription !== "string" || !jobDescription.trim()) {
    return NextResponse.json(
      { error: "Job description is required." },
      { status: 400 }
    );
  }
  if (!(cvFile instanceof File)) {
    return NextResponse.json({ error: "CV file is required." }, { status: 400 });
  }

  let cvText: string;
  try {
    cvText = await extractText(cvFile);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not read the file.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  if (!cvText) {
    return NextResponse.json(
      {
        error:
          "No text found in the file. For PDFs, make sure it is not a scanned image.",
      },
      { status: 422 }
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
${cvText}`,
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
