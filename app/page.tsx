"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

// ── PDF helpers ────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

function mdToHtml(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inUl = false;
  let currentH2 = "";

  const isSkills = () =>
    /skill|technical|competenc|tool|technolog|proficienc/i.test(currentH2);

  const closeList = () => { if (inUl) { html += "</ul>"; inUl = false; } };

  for (const raw of lines) {
    const line = raw.trim();

    const isBullet = /^[-*•–—]\s/.test(line);
    if (!isBullet) closeList();

    if (!line) {
      // blank — skip
    } else if (/^#{3,}\s/.test(line)) {
      html += `<h3>${inlineMd(line.replace(/^#{3,}\s*/, ""))}</h3>`;
    } else if (/^##\s/.test(line)) {
      currentH2 = line.replace(/^##\s*/, "");
      html += `<h2>${inlineMd(currentH2)}</h2>`;
    } else if (/^#\s/.test(line)) {
      currentH2 = line.replace(/^#\s*/, "");
      html += `<h2>${inlineMd(currentH2)}</h2>`;
    } else if (line === "---" || line === "***" || line === "___") {
      html += "<hr>";
    } else if (isBullet) {
      if (!inUl) {
        html += isSkills() ? '<ul class="skills-list">' : "<ul>";
        inUl = true;
      }
      html += `<li>${inlineMd(line.replace(/^[-*•–—]\s+/, ""))}</li>`;
    } else {
      const cvSections = /^(Summary|Experience|Education|Projects|Skills|Profile|Objective|Languages|Certifications|Awards|Publications|References)$/i;
      if (cvSections.test(line)) {
        currentH2 = line;
        html += `<h2>${inlineMd(line)}</h2>`;
      } else {
        html += `<p>${inlineMd(line)}</p>`;
      }
    }
  }
  closeList();
  return html;
}

// ──────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [cvText, setCvText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [tailoringMode, setTailoringMode] = useState<"honest" | "hero">("honest");
  const [isEditing, setIsEditing] = useState(false);
  const [cvCount, setCvCount] = useState(0);
  const [resultWordCount, setResultWordCount] = useState(0);
  const [matchScore, setMatchScore] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setCvCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    setPdfError("");
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).pdfjsLib) { resolve(); return; }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF.js"));
        document.head.appendChild(script);
      });
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const textParts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ");
        textParts.push(pageText);
      }
      const extractedText = textParts.join("\n\n").trim();
      if (!extractedText) {
        setPdfError("This PDF appears to use a design template (e.g. Canva). Please export your CV from Word or Google Docs as a PDF, or paste the text directly.");
      } else {
        setCvText(extractedText);
      }
    } catch (err) {
      console.error("PDF parsing error:", err);
      setPdfError("Failed to read this PDF. Please paste your CV text manually instead.");
    } finally {
      setPdfLoading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobDescription.trim() || !cvText.trim()) return;

    setLoading(true);
    setError("");
    setResult("");
    setResultWordCount(0);
    setMatchScore(0);

    try {
      const body = new FormData();
      body.append("jobDescription", jobDescription);
      body.append("cvText", cvText.trim());
      body.append("mode", tailoringMode);

      const res = await fetch("/api/tailor", { method: "POST", body });

      let data: { result?: string; error?: string } = {};
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Unexpected server response (${res.status})`);
        }
      }

      if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`);
      const tailoredCV = data.result ?? "";
      setResult(tailoredCV);
      setIsEditing(false);

      // Calculate word count
      const wordCount = tailoredCV.trim().split(/\s+/).length;
      setResultWordCount(wordCount);

      // Calculate match score
      const calculateMatchScore = (jd: string, cv: string): number => {
        const jdLower = jd.toLowerCase();
        const cvLower = cv.toLowerCase();

        const stopWords = new Set(['about', 'above', 'after', 'again', 'their',
          'there', 'these', 'those', 'would', 'could', 'should', 'which',
          'while', 'where', 'other', 'being', 'every', 'through', 'during',
          'before', 'between', 'having', 'within', 'without', 'across']);

        const words = jdLower.match(/\b[a-z]{5,}\b/g) || [];
        const keywords = [...new Set(words)].filter(w => !stopWords.has(w));

        if (keywords.length === 0) return 0;

        const matched = keywords.filter(keyword => {
          const stem = keyword.slice(0, Math.floor(keyword.length * 0.8));
          return cvLower.includes(stem);
        });

        return Math.round((matched.length / keywords.length) * 100);
      };

      const score = calculateMatchScore(jobDescription, tailoredCV);

      const scaleScore = (raw: number): number => {
        const min = 55;
        const max = 98;
        return Math.round(min + (raw / 100) * (max - min));
      };

      const displayScore = scaleScore(score);
      setMatchScore(displayScore);

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPdf() {
    // Parse name and contact directly from the raw markdown text so the
    // header is always structurally correct — no DOM heuristics needed.
    const rawLines = result.split("\n");

    // First non-empty line = name (strip any leading # characters)
    const nameIdx = rawLines.findIndex((l) => l.trim().length > 0);
    const name = nameIdx >= 0
      ? rawLines[nameIdx].trim().replace(/^#+\s*/, "")
      : "";

    // Collect consecutive non-heading lines after the name as contact info.
    // Multiple short lines (email, phone, city on separate lines) are joined
    // with " | " so they always appear on one line in the PDF header.
    const contactParts: string[] = [];
    let bodyStart = nameIdx + 1;
    for (let i = nameIdx + 1; i < rawLines.length; i++) {
      const l = rawLines[i].trim();
      if (!l) { if (contactParts.length) { bodyStart = i + 1; break; } continue; }
      if (l.startsWith("#")) { bodyStart = i; break; }
      // Split any existing pipe-separated values, trim each piece
      contactParts.push(...l.split("|").map((s) => s.trim()).filter(Boolean));
      bodyStart = i + 1;
      if (contactParts.length >= 6) break; // safety cap
    }
    const contact = contactParts.join(" | ");

    const bodyHtml = mdToHtml(rawLines.slice(bodyStart).join("\n"));

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title></title>
  <style>
    @page {
      margin: 1.5cm 2cm;
      size: A4;
    }
    * { box-sizing: border-box; }
    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      height: auto;
    }
    body {
      margin: 0;
      orphans: 4;
      widows: 4;
      font-family: Georgia, "Times New Roman", serif;
      color: #1a1a1a;
      font-size: 10.5px;
      line-height: 1.45;
      max-width: 800px;
      padding: 32px 52px 48px;
    }
    .cv-header {
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 18px;
      border-bottom: 3px solid #1b3554;
    }
    .cv-name {
      font-size: 24px;
      font-weight: bold;
      color: #1b3554;
      font-family: Georgia, serif;
      letter-spacing: 0.03em;
      margin-bottom: 4px;
    }
    .cv-contact {
      font-size: 12px;
      color: #555;
      font-family: Arial, Helvetica, sans-serif;
      margin-bottom: 0;
    }
    h2 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #1b3554;
      border-bottom: 2px solid #1b3554;
      padding-bottom: 3px;
      margin: 18px 0 7px;
      break-after: avoid;
      page-break-after: avoid;
      display: block;
      width: 100%;
    }
    h3 {
      font-size: 11px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 11px 0 2px;
      break-after: avoid;
      page-break-after: avoid;
    }
    p  { margin: 3px 0; font-size: 11px; }
    ul, ol { padding-left: 18px; margin: 3px 0 7px; }
    li { margin: 2px 0; font-size: 11px; }
    strong { font-weight: 700; }
    em     { font-style: italic; color: #444; }
    a      { color: #1b3554; text-decoration: none; }
    hr     { border: none; border-top: 1px solid #ccc; margin: 10px 0; }
    .skills-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 2px;
      padding-left: 18px;
      list-style: disc;
    }
    .skills-list li { break-inside: avoid; page-break-inside: avoid; }
    .cv-body > *:last-child { page-break-after: avoid; margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="cv-header">
    <div class="cv-name">${esc(name)}</div>
    <p class="cv-contact">${esc(contact)}</p>
  </div>
  <div class="cv-body">${bodyHtml}</div>
</body>
</html>`);

    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f2faff]">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#000f22] to-[#1b3554]">
        {/* Circuit pattern background */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1.5" fill="white" fillOpacity="0.06" />
              <circle cx="0" cy="0" r="1" fill="white" fillOpacity="0.06" />
              <circle cx="50" cy="0" r="1" fill="white" fillOpacity="0.06" />
              <circle cx="0" cy="50" r="1" fill="white" fillOpacity="0.06" />
              <circle cx="50" cy="50" r="1" fill="white" fillOpacity="0.06" />
              <path d="M25 25 L50 25 M25 25 L25 50 M25 25 L0 25 M25 25 L25 0" stroke="white" strokeOpacity="0.06" strokeWidth="0.5" />
              <path d="M0 0 L25 25 M50 0 L25 25 M0 50 L25 25 M50 50 L25 25" stroke="white" strokeOpacity="0.03" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)" />
        </svg>

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:py-28 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm mb-6">
            ✦ AI-powered
          </span>

          <h1 className="text-4xl sm:text-6xl font-black text-white leading-[1.08] tracking-tight">
            Get hired faster with an
            <br />
            <span className="text-[#c0e6fd]">
              AI-tailored CV
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-white/75 max-w-xl mx-auto leading-relaxed">
            Paste a job description, upload your CV, and get a version perfectly matched to the role — in seconds.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              "Mirrors job keywords",
              "Reorders for relevance",
              "Never fabricates",
            ].map((feat) => (
              <span
                key={feat}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#5b86b6]/50 bg-[#1b3554] px-4 py-1.5 text-sm text-white/90"
              >
                <svg className="h-3.5 w-3.5 text-[#c0e6fd] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feat}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-white/50">
            <span className="text-white/80 font-semibold">{cvCount.toLocaleString()}</span> CVs tailored so far
          </p>
        </div>
      </section>

      {/* ── Before / After ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">
            See the difference
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6">
              <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-0.5 text-xs font-bold text-red-500 uppercase tracking-wide mb-4">
                Before
              </span>
              <p className="text-sm text-gray-500 leading-relaxed italic">
                &quot;Responsible for managing social media accounts and creating content.&quot;
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">
                ✦ After
              </span>
              <p className="text-sm text-gray-800 leading-relaxed">
                &quot;Grew LinkedIn engagement by <strong>47%</strong> and drove a{" "}
                <strong>3× increase</strong>{" "}in qualified leads by producing targeted
                content aligned with the company&apos;s B2B go-to-market strategy.&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Form ── */}
      <section className="flex-1 mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/80 border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Tailor your CV</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Job description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Job description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={8}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#5b86b6] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#3f6593]/15 resize-y transition-all"
              />
            </div>

            {/* CV text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Your CV
                </label>
                <div>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={pdfLoading}
                    onClick={() => pdfInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {pdfLoading ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Reading PDF…
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                        </svg>
                        Upload PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
              <textarea
                value={cvText}
                onChange={(e) => { setCvText(e.target.value); setPdfError(""); }}
                placeholder="Paste your CV text here — or use the Upload PDF button above"
                rows={10}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#5b86b6] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#3f6593]/15 resize-y transition-all"
              />
              {pdfError && (
                <p className="mt-2 text-sm text-red-600">{pdfError}</p>
              )}
            </div>

            {/* Mode toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tailoring mode
              </label>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => setTailoringMode("honest")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    tailoringMode === "honest"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Honest
                </button>
                <button
                  type="button"
                  onClick={() => setTailoringMode("hero")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    tailoringMode === "hero"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Hero
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {tailoringMode === "honest"
                  ? "Safe and accurate — no embellishment"
                  : "Bold and achievement-focused — maximum impact"}
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!jobDescription.trim() || !cvText.trim() || loading}
              className="w-full rounded-xl bg-[#3f6593] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#3f6593]/30 hover:bg-[#1b3554] hover:shadow-[#1b3554]/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            >
              {loading ? "Tailoring your CV…" : "✦  Tailor my CV"}
            </button>
          </form>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex flex-col items-center gap-3 py-6 text-gray-400">
            <svg className="animate-spin h-8 w-8 text-[#3f6593]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Tailoring your CV…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/70 overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gradient-to-r from-[#1b3554] to-[#3f6593]">
              <div className="flex items-center gap-2 text-white">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold">Tailored CV</span>
                <span className="text-xs text-white/60 ml-2">{resultWordCount} words</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-2 ${
                  matchScore >= 80 ? 'bg-emerald-500/30 text-emerald-300' :
                  matchScore >= 60 ? 'bg-yellow-500/30 text-yellow-300' :
                  'bg-red-500/30 text-red-300'
                }`}>{matchScore}% match</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  {isEditing ? (
                    <>
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="hidden sm:inline">Done</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      <span className="hidden sm:inline">Edit</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span className="hidden sm:inline">Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(result);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Content */}
            <div ref={resultRef}>
              {isEditing ? (
                <textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full min-h-[500px] px-4 py-4 text-sm text-gray-800 font-mono leading-relaxed resize-y focus:outline-none border-0 bg-transparent"
                  spellCheck={false}
                />
              ) : (
                <div className="px-4 py-4 sm:px-6 sm:py-6 prose prose-sm max-w-none text-gray-800
                  prose-headings:font-semibold prose-headings:text-gray-900
                  prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                  prose-strong:text-gray-900 prose-li:my-0.5 prose-hr:border-gray-200"
                >
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
          <span className="font-semibold text-gray-500">CV Match</span>
          <span>Built with AI — tailor every application in seconds</span>
        </div>
      </footer>

    </div>
  );
}
