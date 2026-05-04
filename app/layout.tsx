import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CV Match — AI-Powered CV Tailoring",
  description: "Tailor your CV to any job description in seconds using AI. Mirrors job keywords, reorders for relevance, never fabricates. Free to use, no signup needed.",
  keywords: ["CV tailoring", "resume builder", "AI resume", "job application", "CV optimization", "ATS optimization"],
  openGraph: {
    title: "CV Match — AI-Powered CV Tailoring",
    description: "Tailor your CV to any job description in seconds. Never fabricates. Free to use.",
    url: "https://cv-match-omega.vercel.app",
    siteName: "CV Match",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CV Match — AI-Powered CV Tailoring",
    description: "Tailor your CV to any job in seconds. Free, no signup needed.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
