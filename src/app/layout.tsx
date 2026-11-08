import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "NexterLaw AI Readiness Snapshot",
  description:
    "Discover your law firm's AI governance maturity in minutes. Free CLEAR TRUST assessment powered by NexterLaw.",
  openGraph: {
    title: "NexterLaw AI Readiness Snapshot",
    description:
      "Free AI readiness assessment for UK law firms — powered by the CLEAR TRUST framework.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#0d1f3c' }}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
          style={{ backgroundColor: '#B8902A', color: '#0d1f3c' }}>
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
