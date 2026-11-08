'use client';

import { useEffect } from 'react';
import { CLEAR_TRUST_DIMENSIONS } from '@/lib/constants';
import { SITE, privacyHref } from '@/config/site';
import { track } from '@/lib/analytics';
import { NLLogo } from './ui';
import { GOLD, NAVY, BODY, R_BG, R_BODY, R_BORDER, R_CREAM, R_MUTED } from './theme';

const HERO_CSS = `
  @keyframes heroFadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes heroFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes heroBgZoom { from { transform: scale(1.07); } to { transform: scale(1); } }
  .hero-bg { animation: heroBgZoom 7s ease-out forwards; }
  @media (max-width: 767px) { .hero-bg { object-position: 18% 30%; } }
  @media (prefers-reduced-motion: reduce) {
    .hero-anim { animation-duration: 0.01ms !important; animation-delay: 0.01ms !important; }
    .hero-bg { animation: none !important; }
  }
`;

const fadeUp = (delay: number, duration = 0.8): React.CSSProperties => ({ animation: `heroFadeUp ${duration}s ease-out ${delay}s forwards`, opacity: 0 });
const fadeIn = (delay: number): React.CSSProperties => ({ animation: `heroFadeIn 0.7s ease-out ${delay}s forwards`, opacity: 0 });

export function Landing({ onStart }: { onStart: () => void }) {
  useEffect(() => track('landing_view'), []);
  const dimensionList = CLEAR_TRUST_DIMENSIONS.map(d => d.name).join(', ').replace(/, ([^,]*)$/, ', and $1');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: R_BG }}>
      <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.webp" alt="" aria-hidden="true" className="hero-bg" fetchPriority="high"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,12,26,0.46)', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to bottom, transparent, rgba(13,31,60,0.97))', zIndex: 2 }} />
        <style dangerouslySetInnerHTML={{ __html: HERO_CSS }} />

        <header style={{ position: 'relative', zIndex: 10 }} className="px-4 sm:px-6 py-5 flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <span className="text-xs hidden sm:block uppercase tracking-widest" style={{ color: R_MUTED }}>Free · No obligation</span>
        </header>
        <div style={{ position: 'relative', zIndex: 10, height: 1, backgroundColor: 'rgba(184,144,42,0.15)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: 2, background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />

        <main id="main" style={{ position: 'relative', zIndex: 10, flex: 1 }} className="flex flex-col items-center justify-center px-4 sm:px-5 py-14 sm:py-20 mx-auto w-full max-w-3xl">
          <div className="hero-anim" style={fadeUp(0, 0.7)}>
            <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-center"
              style={{ backgroundColor: 'rgba(184,144,42,0.12)', color: GOLD, border: '1px solid rgba(184,144,42,0.3)', borderRadius: 2 }}>
              AI Readiness Snapshot · Free · 3 minutes
            </div>
          </div>

          <h1 className="hero-anim" style={{
            ...fadeUp(0.12), fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700,
            fontSize: 'clamp(1.55rem, 4.2vw, 3.0rem)', lineHeight: 1.15, textAlign: 'center', marginTop: 24,
          }}>
            <span className="block sm:whitespace-nowrap">What AI is your firm actually using</span>
            <span className="block sm:whitespace-nowrap">and can you evidence control of it?</span>
          </h1>

          <div className="hero-anim flex items-center gap-4" style={{ ...fadeIn(0.26), width: '100%', maxWidth: '16rem', marginTop: 24 }} aria-hidden="true">
            <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(184,144,42,0.25)' }} />
            <div style={{ width: 32, height: 2, backgroundColor: GOLD }} />
            <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(184,144,42,0.25)' }} />
          </div>

          <p className="hero-anim" style={{ ...fadeUp(0.34), fontSize: '1rem', lineHeight: 1.75, color: R_BODY, maxWidth: '30rem', textAlign: 'center', marginTop: 20 }}>
            Get your free AI Readiness Snapshot. We score your firm across our CLEAR TRUST framework — ten dimensions of AI control — and show you where the regulatory exposure lies.
          </p>

          <div className="hero-anim w-full text-left" style={{ ...fadeUp(0.44), marginTop: 28 }}>
            <div style={{ backgroundColor: 'rgba(19,38,68,0.80)', border: `1px solid ${R_BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 2, padding: '18px 22px', backdropFilter: 'blur(6px)' }}>
              <h2 style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3em', color: GOLD, marginBottom: 10 }}>
                About the CLEAR TRUST Framework
              </h2>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.75, color: R_BODY }}>
                This assessment is structured around the <strong style={{ color: R_CREAM }}>CLEAR TRUST Framework</strong> — NexterLaw&apos;s
                proprietary methodology for evaluating AI governance maturity in legal practice. Your firm is assessed across ten
                defined dimensions: {dimensionList}.
              </p>
            </div>
          </div>

          <div className="hero-anim" style={{ ...fadeUp(0.56, 0.7), marginTop: 32 }}>
            <button
              type="button"
              onClick={() => { track('start_click'); onStart(); }}
              className="inline-flex items-center gap-3 px-10 py-4 text-base font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ backgroundColor: GOLD, color: R_BG, borderRadius: 2, outlineColor: R_CREAM }}
            >
              Get Your Free Snapshot <span aria-hidden="true">→</span>
            </button>
          </div>

          <ol className="hero-anim grid grid-cols-3 gap-2 sm:gap-3 w-full" style={{ ...fadeIn(0.68), marginTop: 36, maxWidth: '28rem' }}>
            {[
              { num: '01', label: '10 quick questions' },
              { num: '02', label: '4 firm details' },
              { num: '03', label: 'Instant PDF report' },
            ].map(item => (
              <li key={item.num} className="flex flex-col items-center" style={{
                backgroundColor: 'rgba(255,255,255,0.95)', borderTop: `3px solid ${GOLD}`, borderRadius: 4,
                padding: '16px 8px', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: NAVY, fontFamily: 'var(--font-playfair)', lineHeight: 1 }} aria-hidden="true">{item.num}</span>
                <span style={{ fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.4, color: BODY, fontWeight: 500 }}>{item.label}</span>
              </li>
            ))}
          </ol>
        </main>
      </section>

      {/* Trust block (spec §2) */}
      <section aria-label="Who created the Snapshot" className="px-4 sm:px-6 py-10 max-w-3xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center gap-5 p-5 sm:p-6" style={{ backgroundColor: 'rgba(19,38,68,0.80)', border: `1px solid ${R_BORDER}`, borderRadius: 2 }}>
          {SITE.trust.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={SITE.trust.photoUrl} alt="Dr Siamak Goudarzi" width={88} height={88} style={{ borderRadius: '50%', border: `2px solid ${GOLD}`, objectFit: 'cover' }} />
          ) : (
            <div aria-hidden="true" className="shrink-0 flex items-center justify-center" style={{ width: 88, height: 88, borderRadius: '50%', border: `2px solid ${GOLD}`, color: GOLD, fontFamily: 'var(--font-playfair)', fontSize: 30, fontWeight: 700 }}>SG</div>
          )}
          <div className="text-center sm:text-left">
            <p style={{ color: R_CREAM, fontSize: '0.95rem', lineHeight: 1.6 }}>{SITE.trust.creatorLine}.</p>
            {SITE.trust.sampleReportUrl && (
              <a href={SITE.trust.sampleReportUrl} className="inline-block mt-2 text-sm font-semibold underline" style={{ color: GOLD }}>
                See a sample report (fictional firm) →
              </a>
            )}
          </div>
        </div>
      </section>

      <footer className="px-4 sm:px-6 py-5 text-center text-xs max-w-3xl mx-auto w-full" style={{ borderTop: `1px solid ${R_BORDER}`, color: R_MUTED, lineHeight: 1.8 }}>
        This Snapshot is general information, not legal or regulatory advice. {SITE.brandLine}.
        <br />
        © NexterLaw · <a href={privacyHref()} className="underline" style={{ color: GOLD }}>Privacy notice</a> ·{' '}
        <a href="https://nexterlaw.com" className="underline" style={{ color: GOLD }}>nexterlaw.com</a>
      </footer>
    </div>
  );
}
