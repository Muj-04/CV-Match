"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#eef3f9]">

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

          {/* Hero CTA */}
          <div className="mt-10">
            <Link
              href="/tailor"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-[#1b3554] shadow-lg hover:bg-[#c0e6fd] transition-all"
            >
              Tailor my CV
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-12">
            How it works
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: "Paste the job",
                desc: "Copy any job description and paste it in"
              },
              {
                step: 2,
                title: "Upload your CV",
                desc: "Paste text or upload a PDF directly"
              },
              {
                step: 3,
                title: "Get your match",
                desc: "Claude rewrites your CV to fit the role perfectly"
              }
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#1b3554] text-white text-lg font-bold mb-4">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ── */}
      <section className="bg-[#eef3f9] border-b border-gray-200">
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

      {/* ── Testimonials ── */}
      <section className="bg-[#eef3f9]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-12">
            What users say
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { quote: "Secured 3 interviews in a week!", name: "Alex P.", initials: "AP" },
              { quote: "My CV now makes sense.", name: "Sarah J.", initials: "SJ" },
              { quote: "Landed my dream job. Highly recommend!", name: "James L.", initials: "JL" }
            ].map(({ quote, name, initials }) => (
              <div key={name} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#1b3554] text-white text-sm font-bold">
                    {initials}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{name}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">&quot;{quote}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Big CTA ── */}
      <section className="bg-[#1b3554]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to land your next role?
          </h2>
          <p className="text-base sm:text-lg text-white/70 mb-8 max-w-xl mx-auto">
            Tailor your CV to any job in seconds — free, no signup needed.
          </p>
          <Link
            href="/tailor"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-[#1b3554] shadow-lg hover:bg-[#c0e6fd] transition-all"
          >
            Tailor my CV
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-[#eef3f9]">
        <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
          <span className="font-semibold text-gray-500">CV Match</span>
          <span>Built with AI — tailor every application in seconds</span>
        </div>
      </footer>

    </div>
  );
}
