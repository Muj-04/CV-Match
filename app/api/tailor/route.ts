import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 10;

// Zero-dependency PDF text extraction.
// Handles both PDF literal strings (text) and hex strings <4A6F...>,
// including UTF-16 BE (the encoding Word/Google Docs use for Unicode text).
function extractRawPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const texts: string[] = [];

  // Decode a PDF literal string — handles octal \ddd and common escapes.
  function decodeLiteral(s: string): string {
    return s
      .replace(/\\(\d{1,3})/g, (_, oct) =>
        String.fromCharCode(parseInt(oct, 8))
      )
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
  }

  // Decode a PDF hex string — handles plain ASCII, Latin-1, and UTF-16 BE.
  // Modern PDFs from Word / Google Docs store Unicode text as <FEFF...>.
  function decodeHex(hex: string): string {
    const h = hex.replace(/\s/g, "");
    if (!h) return "";
    // UTF-16 BE with BOM (FEFF) — most common for non-ASCII names & emails
    if (h.startsWith("FEFF") || h.startsWith("feff")) {
      let out = "";
      for (let i = 4; i + 3 < h.length; i += 4) {
        const cp = parseInt(h.slice(i, i + 4), 16);
        if (cp > 0) out += String.fromCodePoint(cp);
      }
      return out;
    }
    // Plain single-byte hex
    let out = "";
    for (let i = 0; i + 1 < h.length; i += 2) {
      const byte = parseInt(h.slice(i, i + 2), 16);
      if (byte >= 0x20) out += String.fromCharCode(byte);
    }
    return out;
  }

  // Primary pass: extract all strings from BT … ET drawing blocks.
  // Match both (literal) and <hex> forms.
  const btEt = /BT([\s\S]*?)ET/g;
  let block: RegExpExecArray | null;
  while ((block = btEt.exec(raw)) !== null) {
    const strPattern =
      /\(([^)\\]*(?:\\[\s\S][^)\\]*)*)\)|<([0-9a-fA-F\s]{4,})>/g;
    let s: RegExpExecArray | null;
    while ((s = strPattern.exec(block[1])) !== null) {
      const text = (
        s[1] !== undefined ? decodeLiteral(s[1]) : decodeHex(s[2])
      ).trim();
      // Skip pure numbers (positioning operands like "12.5")
      if (text && !/^\d+(\.\d+)?$/.test(text)) texts.push(text);
    }
  }

  // Fallback: if the BT/ET pass came up short (compressed / unusual PDF),
  // grab any run of 5+ printable ASCII characters from the raw bytes.
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
