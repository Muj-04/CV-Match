"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvMode, setCvMode] = useState<"upload" | "paste">("upload");
  const [cvPastedText, setCvPastedText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cvReady = cvMode === "upload" ? !!cvFile : cvPastedText.trim().length > 0;
    if (!jobDescription.trim() || !cvReady) return;

    setLoading(true);
    setError("");
    setResult("");

    try {
      const body = new FormData();
      body.append("jobDescription", jobDescription);
      if (cvMode === "paste") {
        body.append("cvText", cvPastedText.trim());
      } else if (cvFile) {
        body.append("cv", cvFile);
      }

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

      if (!res.ok) {
        const msg = data.error ?? `Server error (${res.status})`;
        // Auto-switch to paste mode so the user can act immediately
        if (msg.includes("Paste text tab")) setCvMode("paste");
        throw new Error(msg);
      }
      setResult(data.result ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPdf() {
    const content = resultRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <!-- Empty title removes the browser's "Tailored CV" print header -->
  <title></title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { height: auto; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      max-width: 780px;
      margin: 0 auto;
      padding: 40px 48px;
      color: #111;
      line-height: 1.65;
      font-size: 13px;
    }
    h1 { font-size: 1.7em; font-weight: 700; margin: 0 0 0.2em; }
    h2 { font-size: 1.2em; font-weight: 600; margin: 1.4em 0 0.3em; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
    h3 { font-size: 1em; font-weight: 600; margin: 1em 0 0.2em; }
    p { margin: 0.4em 0; }
    ul, ol { padding-left: 1.4em; margin: 0.4em 0; }
    li { margin: 0.15em 0; }
    strong { font-weight: 600; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1.2em 0; }
    a { color: #111; text-decoration: none; }
    @media print {
      /* margin:0 removes the space the browser uses for its date/URL/page rows.
         body padding below provides the actual content margins instead. */
      @page { margin: 0; size: A4; }
      html, body { height: auto; margin: 0; padding: 1.5cm 2cm; }
      /* Prevent blank last page caused by trailing margin overflow */
      body > *:last-child,
      body > *:last-child > *:last-child {
        break-after: avoid !important;
        page-break-after: avoid !important;
        margin-bottom: 0 !important;
      }
    }
  </style>
</head>
<body>${content}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden animate-gradient bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
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
            <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
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
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90"
              >
                <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">
            See the difference
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Before */}
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6">
              <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-0.5 text-xs font-bold text-red-500 uppercase tracking-wide mb-4">
                Before
              </span>
              <p className="text-sm text-gray-500 leading-relaxed italic">
                "Responsible for managing social media accounts and creating content."
              </p>
            </div>
            {/* After */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">
                ✦ After
              </span>
              <p className="text-sm text-gray-800 leading-relaxed">
                "Grew LinkedIn engagement by <strong>47%</strong> and drove a{" "}
                <strong>3× increase</strong> in qualified leads by producing targeted
                content aligned with the company&apos;s B2B go-to-market strategy."
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
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-500/15 resize-y transition-all"
              />
            </div>

            {/* CV — upload or paste */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Your CV
                </label>
                {/* Mode toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCvMode("upload")}
                    className={`px-3 py-1.5 transition-colors ${
                      cvMode === "upload"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Upload file
                  </button>
                  <button
                    type="button"
                    onClick={() => setCvMode("paste")}
                    className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
                      cvMode === "paste"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Paste text
                  </button>
                </div>
              </div>

              {cvMode === "upload" ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center hover:border-indigo-400 hover:bg-indigo-50/40 transition-all"
                  >
                    {cvFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-9 w-9 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-800">{cvFile.name}</span>
                        <span className="text-xs text-gray-400">Click to change</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-10 w-10 text-gray-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-500 group-hover:text-indigo-600 transition-colors">
                          Upload your CV
                        </span>
                        <span className="text-xs text-gray-400">PDF or DOCX</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-2 text-xs text-amber-600">
                    💡 Tip: For best results, use the <button type="button" onClick={() => setCvMode("paste")} className="font-semibold underline underline-offset-2 hover:text-amber-700">Paste text tab</button> and paste your CV directly.
                  </p>
                </>
              ) : (
                <textarea
                  value={cvPastedText}
                  onChange={(e) => setCvPastedText(e.target.value)}
                  placeholder="Paste your CV text here — copy from Word, Google Docs, or any text editor…"
                  rows={10}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-500/15 resize-y transition-all"
                />
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                !jobDescription.trim() ||
                (cvMode === "upload" ? !cvFile : !cvPastedText.trim()) ||
                loading
              }
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            >
              {loading ? "Tailoring your CV…" : "✦  Tailor my CV"}
            </button>
          </form>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex flex-col items-center gap-3 py-6 text-gray-400">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
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
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gradient-to-r from-blue-600 to-violet-600">
              <div className="flex items-center gap-2 text-white">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold">Tailored CV</span>
              </div>
              <div className="flex items-center gap-2">
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
            <div
              ref={resultRef}
              className="px-4 py-4 sm:px-6 sm:py-6 prose prose-sm max-w-none text-gray-800
                prose-headings:font-semibold prose-headings:text-gray-900
                prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                prose-strong:text-gray-900 prose-li:my-0.5 prose-hr:border-gray-200"
            >
              <ReactMarkdown>{result}</ReactMarkdown>
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
