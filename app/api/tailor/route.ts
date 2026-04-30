import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 10;

// Zero-dependency PDF text extraction.
// Works for text-based PDFs by reading the raw bytes and pulling string
// literals out of PDF BT/ET (Begin Text / End Text) drawing blocks.
// Scanned or heavily-compressed PDFs will yield little text — callers
// should check the result length and surface a helpful error.
function extractRawPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const texts: string[] = [];

  // Primary pass: extract strings from BT … ET blocks
  const btEt = /BT([\s\S]*?)ET/g;
  let block: RegExpExecArray | null;
  while ((block = btEt.exec(raw)) !== null) {
    const strLiteral = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let s: RegExpExecArray | null;
    while ((s = strLiteral.exec(block[1])) !== null) {
      const text = s[1]
        .replace(/\\[nrt]/g, " ")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\")
        .trim();
      if (text) texts.push(text);
    }
  }

  // Fallback: if the BT/ET pass came up short (e.g. older PDF structure),
  // grab any run of 5+ printable ASCII characters instead.
  if (texts.join("").replace(/\s/g, "").length < 100) {
    texts.length = 0;
    const printable = /[ -~\t\r\n]{5,}/g;
    let m: RegExpExecArray | null;
    while ((m = printable.exec(raw)) !== null) {
      const chunk = m[0].trim();
      if (chunk.length >= 5) texts.push(chunk);
    }
  }

  return texts.join(" ").replace(/\s+/g, " ").trim();
}

async function extractText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractRawPdfText(buffer);
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
  const cvText = formData.get("cvText");

  if (typeof jobDescription !== "string" || !jobDescription.trim()) {
    return NextResponse.json(
      { error: "Job description is required." },
      { status: 400 }
    );
  }

  // Accept either a pasted CV text string or an uploaded file
  let cvContent: string;

  if (typeof cvText === "string" && cvText.trim()) {
    cvContent = cvText.trim();
  } else if (cvFile instanceof File) {
    try {
      cvContent = await extractText(cvFile);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not read the file.";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    if (!cvContent || cvContent.replace(/\s/g, "").length < 80) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from this PDF. It may be scanned or image-based. Please use the \"Paste CV text\" option instead.",
        },
        { status: 422 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Please upload a CV file or paste your CV text." },
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
${cvContent}`,
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
