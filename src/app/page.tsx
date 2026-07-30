'use client';

import { useState, useCallback } from 'react';
import {
  CLEAR_TRUST_DIMENSIONS,
  PRACTICE_TYPES,
  FIRM_SIZE_OPTIONS,
  EU_FACING_OPTIONS,
  SELF_ASSESSMENT_ANSWERS,
  FREE_EMAIL_DOMAINS,
  SCORE_BANDS,
} from '@/lib/constants';
import type {
  IntakeData,
  SelfAssessmentAnswers,
  SelfAssessmentAnswer,
  ReportStatusResponse,
  ClearTrustScores,
  GeneratedReportContent,
} from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'landing' | 'intake' | 'selfAssessment' | 'consent' | 'processing' | 'result';

const EMPTY_INTAKE: IntakeData = {
  firmName: '',
  firmWebsite: '',
  city: '',
  country: '',
  practiceTypes: [],
  firmSize: '',
  euFacing: '',
  workEmail: '',
};

const EMPTY_ANSWERS: SelfAssessmentAnswers = {
  compliance: '',
  literacy: '',
  explainability: '',
  accountability: '',
  rights: '',
  transparency: '',
  reliability: '',
  usageGovernance: '',
  security: '',
  traceability: '',
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const NAVY = '#1a3a6b';
const GOLD = '#B8902A';
const STEEL = '#5b7fa6';
const CARD_BORDER = '#e6dfd6';
const BODY = '#3d3a35';
const MUTED = '#7a746d';

// Result-page dark theme tokens
const R_BG = '#0d1f3c';
const R_CARD = '#132644';
const R_BORDER = 'rgba(184,144,42,0.20)';
const R_CREAM = '#ede8e0';
const R_BODY = '#9fb0c8';
const R_MUTED = '#5b7290';

// ─── Helper components ────────────────────────────────────────────────────────

function NLLogo({ size = 'md', dark = false }: { size?: 'sm' | 'md' | 'lg'; dark?: boolean }) {
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.4 : 1;
  const boxSize = Math.round(52 * scale);
  const titleSize = Math.round(28 * scale);
  const subtitleSize = Math.round(8.5 * scale);
  const gap = Math.round(14 * scale);

  return (
    <div className="flex items-center shrink-0" style={{ gap }}>
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: boxSize,
          height: boxSize,
          backgroundColor: dark ? R_CARD : NAVY,
          border: `2px solid ${GOLD}`,
          outline: `1px solid ${GOLD}`,
          outlineOffset: '-4px',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontFamily: 'var(--font-playfair)',
            fontWeight: 700,
            fontSize: Math.round(20 * scale),
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          NL
        </span>
      </div>
      <div className="flex flex-col" style={{ gap: Math.round(3 * scale) }}>
        <div
          style={{
            fontFamily: 'var(--font-playfair)',
            fontWeight: 700,
            fontSize: titleSize,
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}
        >
          <span style={{ color: dark ? R_CREAM : NAVY }}>NEXTER</span>
          <span style={{ color: GOLD }}>LAW</span>
        </div>
        <div
          style={{
            color: dark ? '#6b87a8' : STEEL,
            fontSize: subtitleSize,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 400,
            lineHeight: 1,
          }}
        >
          AI Governance&nbsp;&nbsp;·&nbsp;&nbsp;Ethics&nbsp;&nbsp;·&nbsp;&nbsp;Regulations
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current, total, dark }: { current: number; total: number; dark?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? 24 : 8,
            height: 8,
            backgroundColor: i + 1 <= current
              ? (dark ? GOLD : NAVY)
              : (dark ? 'rgba(184,144,42,0.25)' : CARD_BORDER),
          }}
        />
      ))}
    </div>
  );
}

function EmailWarning({ email }: { email: string }) {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (!domain || !FREE_EMAIL_DOMAINS.includes(domain)) return null;
  return (
    <p className="text-sm mt-1.5 flex items-center gap-1.5" style={{ color: '#b45309' }}>
      <span>⚠</span> We recommend using your work email address for accurate firm identification.
    </p>
  );
}

// ─── Score display ────────────────────────────────────────────────────────────

function ScoreGauge({ score, band, dark = false }: { score: number; band: string; dark?: boolean }) {
  const bandInfo = SCORE_BANDS.find(b => b.label === band) ?? SCORE_BANDS[1];
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-36 h-36 rounded-full flex flex-col items-center justify-center"
        style={{ border: `3px solid ${bandInfo.colour}`, backgroundColor: `${bandInfo.colour}${dark ? '1a' : '10'}` }}
      >
        <span
          style={{ color: dark ? R_CREAM : bandInfo.colour, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '3rem', lineHeight: 1 }}
        >
          {Math.round(score)}
        </span>
        <span className="text-xs mt-1" style={{ color: dark ? R_MUTED : MUTED }}>out of 100</span>
      </div>
      <Badge
        style={{ backgroundColor: bandInfo.colour, color: '#fff', letterSpacing: '0.05em' }}
        className="text-xs font-semibold uppercase px-4 py-1.5"
      >
        {bandInfo.displayName}
      </Badge>
    </div>
  );
}

function DimensionBar({ name, letter, score, dark = false }: { name: string; letter: string; score: number; dark?: boolean }) {
  const pct = Math.round(score);
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#f87171';
  const trackColor = dark ? 'rgba(255,255,255,0.07)' : CARD_BORDER;
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: dark ? GOLD : NAVY, color: dark ? '#0d1f3c' : '#fff', borderRadius: 2 }}
      >
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-medium truncate" style={{ color: dark ? R_CREAM : BODY }}>{name}</span>
          <span className="font-bold ml-2 shrink-0" style={{ color }}>{pct}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [step, setStep] = useState<Step>('landing');
  const [intake, setIntake] = useState<IntakeData>(EMPTY_INTAKE);
  const [answers, setAnswers] = useState<SelfAssessmentAnswers>(EMPTY_ANSWERS);
  const [consent, setConsent] = useState(false);
  const [_submissionId, setSubmissionId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportStatusResponse | null>(null);
  const [intakeErrors, setIntakeErrors] = useState<Partial<Record<keyof IntakeData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pollProgress, setPollProgress] = useState(0);

  const validateIntake = useCallback((): boolean => {
    const errs: Partial<Record<keyof IntakeData, string>> = {};
    if (!intake.firmName.trim()) errs.firmName = 'Firm name is required.';
    if (!intake.firmWebsite.trim()) errs.firmWebsite = 'Firm website is required.';
    if (!intake.city.trim()) errs.city = 'City is required.';
    if (!intake.country.trim()) errs.country = 'Country is required.';
    if (intake.practiceTypes.length === 0) errs.practiceTypes = 'Select at least one practice type.';
    if (!intake.firmSize) errs.firmSize = 'Please select your firm size.';
    if (!intake.euFacing) errs.euFacing = 'Please answer the EU question.';
    if (!intake.workEmail.trim()) {
      errs.workEmail = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intake.workEmail)) {
      errs.workEmail = 'Please enter a valid email address.';
    }
    setIntakeErrors(errs);
    return Object.keys(errs).length === 0;
  }, [intake]);

  const allAnswered = CLEAR_TRUST_DIMENSIONS.every(d => answers[d.key] !== '');

  const handleSubmit = useCallback(async () => {
    if (!consent) return;
    setSubmitError(null);
    setStep('processing');
    setPollProgress(10);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake, selfAssessment: answers, consentGiven: true }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Submission failed. Please try again.');
      }

      const data: { submissionId: string } = await res.json();
      setSubmissionId(data.submissionId);

      let progress = 20;
      const poll = async () => {
        try {
          const r = await fetch(`/api/report/${data.submissionId}`);
          const status: ReportStatusResponse = await r.json();
          progress = Math.min(progress + 15, 90);
          setPollProgress(progress);
          if (status.status === 'COMPLETE') {
            setPollProgress(100);
            setReportData(status);
            setStep('result');
          } else if (status.status === 'FAILED') {
            setSubmitError(status.error ?? 'Report generation failed. Please try again.');
            setStep('consent');
          } else {
            setTimeout(poll, 3000);
          }
        } catch {
          setSubmitError('Network error while checking report status. Please try again.');
          setStep('consent');
        }
      };
      setTimeout(poll, 2000);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong.');
      setStep('consent');
    }
  }, [intake, answers, consent]);

  // ─── Landing ───────────────────────────────────────────────────────────────

  if (step === 'landing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: R_BG }}>

        {/* ── Full-bleed hero section ── */}
        <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Background image — slow zoom on load */}
          <img
            src="/hero.webp"
            alt=""
            aria-hidden="true"
            className="hero-bg"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              zIndex: 0,
            }}
          />

          {/* Dark overlay ~45% */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,12,26,0.46)', zIndex: 1 }} />

          {/* Bottom-fade gradient to R_BG */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to bottom, transparent, rgba(13,31,60,0.97))', zIndex: 2 }} />

          {/* Animation keyframes */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes heroFadeUp {
              from { opacity: 0; transform: translateY(22px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes heroFadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes heroBgZoom {
              from { transform: scale(1.07); }
              to   { transform: scale(1); }
            }
            .hero-bg { animation: heroBgZoom 7s ease-out forwards; }
            @media (max-width: 767px) {
              .hero-bg { object-position: 18% 30%; }
            }
            @media (prefers-reduced-motion: reduce) {
              .hero-anim { animation-duration: 0.01ms !important; animation-delay: 0.01ms !important; }
              .hero-bg   { animation: none !important; }
            }
          `}} />

          {/* Header */}
          <header
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-5 flex justify-between items-center max-w-6xl mx-auto w-full"
          >
            <NLLogo dark />
            <span className="text-xs hidden sm:block uppercase tracking-widest" style={{ color: R_MUTED }}>
              Free · UK Law Firms · No Sales Call
            </span>
          </header>
          <div style={{ position: 'relative', zIndex: 10, height: 1, backgroundColor: 'rgba(184,144,42,0.15)' }} />
          <div style={{ position: 'relative', zIndex: 10, height: 2, background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />

          {/* Hero content — centred over the image */}
          <main
            style={{ position: 'relative', zIndex: 10, flex: 1 }}
            className="flex flex-col items-center justify-center px-5 py-16 sm:py-20 mx-auto w-full max-w-3xl"
          >

            {/* Eyebrow pill */}
            <div
              className="hero-anim"
              style={{ animation: 'heroFadeUp 0.7s ease-out 0ms forwards', opacity: 0 }}
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                style={{
                  backgroundColor: 'rgba(184,144,42,0.12)',
                  color: GOLD,
                  border: '1px solid rgba(184,144,42,0.3)',
                  borderRadius: 2,
                }}
              >
                AI Readiness Snapshot · Free · 3 minutes
              </div>
            </div>

            {/* Heading — forced two-line break */}
            <h1
              className="hero-anim"
              style={{
                animation: 'heroFadeUp 0.8s ease-out 0.12s forwards',
                opacity: 0,
                fontFamily: 'var(--font-playfair)',
                color: R_CREAM,
                fontWeight: 700,
                fontSize: 'clamp(0.95rem, 3.8vw, 3.0rem)',
                lineHeight: 1.1,
                textAlign: 'center',
                marginTop: 24,
              }}
            >
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>What AI is your firm actually using</span>
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>and can you evidence control of it?</span>
            </h1>

            {/* Gold ornamental divider */}
            <div
              className="hero-anim flex items-center gap-4"
              style={{
                animation: 'heroFadeIn 0.7s ease-out 0.26s forwards',
                opacity: 0,
                width: '100%',
                maxWidth: '16rem',
                marginTop: 24,
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(184,144,42,0.25)' }} />
              <div style={{ width: 32, height: 2, backgroundColor: GOLD }} />
              <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(184,144,42,0.25)' }} />
            </div>

            {/* Sub-heading */}
            <p
              className="hero-anim"
              style={{
                animation: 'heroFadeUp 0.8s ease-out 0.34s forwards',
                opacity: 0,
                fontSize: '1rem',
                lineHeight: 1.75,
                color: R_BODY,
                maxWidth: '30rem',
                textAlign: 'center',
                marginTop: 20,
              }}
            >
              Get your free AI Readiness Snapshot. We score your firm across our CLEAR TRUST framework — ten dimensions of AI control — and show you where the regulatory exposure lies.
            </p>

            {/* Framework info card */}
            <div
              className="hero-anim w-full text-left"
              style={{ animation: 'heroFadeUp 0.8s ease-out 0.44s forwards', opacity: 0, marginTop: 28 }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(19,38,68,0.80)',
                  border: `1px solid ${R_BORDER}`,
                  borderLeft: `3px solid ${GOLD}`,
                  borderRadius: 2,
                  padding: '18px 22px',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3em',
                    color: GOLD,
                    marginBottom: 10,
                  }}
                >
                  About the CLEAR TRUST Framework
                </p>
                <p style={{ fontSize: '0.8125rem', lineHeight: 1.75, color: R_BODY }}>
                  This assessment is structured around the{' '}
                  <strong style={{ color: R_CREAM }}>CLEAR TRUST Framework</strong> — NexterLaw&apos;s
                  proprietary methodology for evaluating AI governance maturity in legal practice.
                  Your firm is assessed across ten defined dimensions: Compliance, Literacy,
                  Explainability, Accountability, Rights, Transparency, Reliability, Usage Governance,
                  Security, and Traceability.
                </p>
              </div>
            </div>

            {/* Primary CTA */}
            <div
              className="hero-anim"
              style={{ animation: 'heroFadeUp 0.7s ease-out 0.56s forwards', opacity: 0, marginTop: 32 }}
            >
              <button
                onClick={() => setStep('intake')}
                className="inline-flex items-center gap-3 px-10 py-4 text-base font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: GOLD, color: '#0d1f3c', borderRadius: 2 }}
              >
                Get Your Free Snapshot
                <span>→</span>
              </button>
            </div>

            {/* Steps — white cards */}
            <div
              className="hero-anim grid grid-cols-3 gap-3 w-full"
              style={{
                animation: 'heroFadeIn 0.7s ease-out 0.68s forwards',
                opacity: 0,
                marginTop: 36,
                maxWidth: '28rem',
              }}
            >
              {[
                { num: '01', label: '5 firm details' },
                { num: '02', label: '10 quick questions' },
                { num: '03', label: 'Personalised PDF report' },
              ].map(item => (
                <div
                  key={item.num}
                  className="flex flex-col items-center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderTop: `3px solid ${GOLD}`,
                    borderRadius: 4,
                    padding: '16px 10px',
                    gap: 8,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: NAVY,
                      fontFamily: 'var(--font-playfair)',
                      lineHeight: 1,
                    }}
                  >
                    {item.num}
                  </span>
                  <span style={{ fontSize: '0.68rem', textAlign: 'center', lineHeight: 1.4, color: BODY, fontWeight: 500 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

          </main>

        </section>

        {/* Footer */}
        <footer
          className="px-6 py-5 text-center text-xs max-w-3xl mx-auto w-full"
          style={{ borderTop: `1px solid ${R_BORDER}`, color: R_MUTED }}
        >
          This Snapshot is general information, not legal or regulatory advice. © NexterLaw ·{' '}
          <a href="https://nexterlaw.com" className="underline" style={{ color: GOLD }}>
            nexterlaw.com
          </a>
        </footer>

      </div>
    );
  }

  // ─── Intake ────────────────────────────────────────────────────────────────

  if (step === 'intake') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: R_BG }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <img src="/hero.webp" alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.07 }} />
        </div>

        <header className="px-6 py-4 flex justify-between items-center max-w-6xl mx-auto w-full" style={{ position: 'relative', zIndex: 10 }}>
          <NLLogo dark />
          <StepIndicator current={1} total={3} dark />
        </header>
        <div style={{ position: 'relative', zIndex: 10, height: 1, backgroundColor: 'rgba(184,144,42,0.15)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: 2, background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 33%, ${NAVY} 100%)` }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full" style={{ position: 'relative', zIndex: 10 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>Step 01 of 03</p>
          <h2 className="mb-1" style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25 }}>
            Tell us about your firm
          </h2>
          <p className="mb-8" style={{ color: R_BODY }}>This information personalises your AI Readiness Snapshot.</p>

          <div className="p-8 space-y-6" style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 2 }}>

            <div>
              <Label htmlFor="firmName" className="text-sm font-semibold mb-1.5 block" style={{ color: R_CREAM }}>
                Firm name <span style={{ color: GOLD }}>*</span>
              </Label>
              <Input
                id="firmName"
                value={intake.firmName}
                onChange={e => setIntake(p => ({ ...p, firmName: e.target.value }))}
                placeholder="e.g. Smith & Partners LLP"
                style={{ borderColor: intakeErrors.firmName ? '#f87171' : R_BORDER, borderRadius: 2, backgroundColor: 'rgba(13,31,60,0.6)', color: R_CREAM }}
              />
              {intakeErrors.firmName && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{intakeErrors.firmName}</p>}
            </div>

            <div>
              <Label htmlFor="firmWebsite" className="text-sm font-semibold mb-1.5 block" style={{ color: R_CREAM }}>
                Firm website <span style={{ color: GOLD }}>*</span>
              </Label>
              <Input
                id="firmWebsite"
                value={intake.firmWebsite}
                onChange={e => setIntake(p => ({ ...p, firmWebsite: e.target.value }))}
                placeholder="https://www.yourfirm.co.uk"
                style={{ borderColor: intakeErrors.firmWebsite ? '#f87171' : R_BORDER, borderRadius: 2, backgroundColor: 'rgba(13,31,60,0.6)', color: R_CREAM }}
              />
              {intakeErrors.firmWebsite && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{intakeErrors.firmWebsite}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-sm font-semibold mb-1.5 block" style={{ color: R_CREAM }}>
                  City <span style={{ color: GOLD }}>*</span>
                </Label>
                <Input
                  id="city"
                  value={intake.city}
                  onChange={e => setIntake(p => ({ ...p, city: e.target.value }))}
                  placeholder="London"
                  style={{ borderColor: intakeErrors.city ? '#f87171' : R_BORDER, borderRadius: 2, backgroundColor: 'rgba(13,31,60,0.6)', color: R_CREAM }}
                />
                {intakeErrors.city && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{intakeErrors.city}</p>}
              </div>
              <div>
                <Label htmlFor="country" className="text-sm font-semibold mb-1.5 block" style={{ color: R_CREAM }}>
                  Country <span style={{ color: GOLD }}>*</span>
                </Label>
                <Input
                  id="country"
                  value={intake.country}
                  onChange={e => setIntake(p => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. United Kingdom"
                  style={{ borderColor: intakeErrors.country ? '#f87171' : R_BORDER, borderRadius: 2, backgroundColor: 'rgba(13,31,60,0.6)', color: R_CREAM }}
                />
                {intakeErrors.country && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{intakeErrors.country}</p>}
              </div>
            </div>

            <div className="h-px" style={{ backgroundColor: R_BORDER }} />

            <div>
              <Label className="text-sm font-semibold block mb-0.5" style={{ color: R_CREAM }}>
                Practice type(s) <span style={{ color: GOLD }}>*</span>{' '}
                <span className="font-normal text-xs" style={{ color: R_MUTED }}>(select all that apply)</span>
              </Label>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRACTICE_TYPES.map(pt => {
                  const checked = intake.practiceTypes.includes(pt.slug);
                  return (
                    <label
                      key={pt.slug}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
                      style={{
                        border: `1px solid ${checked ? GOLD : R_BORDER}`,
                        borderRadius: 2,
                        backgroundColor: checked ? 'rgba(184,144,42,0.10)' : 'rgba(13,31,60,0.4)',
                      }}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={v => {
                          setIntake(p => ({
                            ...p,
                            practiceTypes: v
                              ? [...p.practiceTypes, pt.slug]
                              : p.practiceTypes.filter(s => s !== pt.slug),
                          }));
                        }}
                        className="shrink-0"
                      />
                      <span className="text-sm" style={{ color: checked ? GOLD : R_BODY }}>{pt.label}</span>
                    </label>
                  );
                })}
              </div>
              {intakeErrors.practiceTypes && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{intakeErrors.practiceTypes}</p>}
            </div>

            <div>
              <Label className="text-sm font-semibold block mb-0.5" style={{ color: R_CREAM }}>
                Firm size <span style={{ color: GOLD }}>*</span>
              </Label>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FIRM_SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntake(p => ({ ...p, firmSize: opt.value }))}
                    className="px-3 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      border: `1px solid ${intake.firmSize === opt.value ? GOLD : R_BORDER}`,
                      borderRadius: 2,
                      backgroundColor: intake.firmSize === opt.value ? GOLD : 'rgba(13,31,60,0.4)',
                      color: intake.firmSize === opt.value ? R_BG : R_BODY,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {intakeErrors.firmSize && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{intakeErrors.firmSize}</p>}
            </div>

            <div>
              <Label className="text-sm font-semibold block mb-0.5" style={{ color: R_CREAM }}>
                Do you act for EU-based clients or handle EU-market work? <span style={{ color: GOLD }}>*</span>
              </Label>
              <div className="mt-3 flex gap-2">
                {EU_FACING_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntake(p => ({ ...p, euFacing: opt.value }))}
                    className="flex-1 px-3 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      border: `1px solid ${intake.euFacing === opt.value ? GOLD : R_BORDER}`,
                      borderRadius: 2,
                      backgroundColor: intake.euFacing === opt.value ? GOLD : 'rgba(13,31,60,0.4)',
                      color: intake.euFacing === opt.value ? R_BG : R_BODY,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {intakeErrors.euFacing && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{intakeErrors.euFacing}</p>}
            </div>

            <div className="h-px" style={{ backgroundColor: R_BORDER }} />

            <div>
              <Label htmlFor="workEmail" className="text-sm font-semibold mb-1.5 block" style={{ color: R_CREAM }}>
                Work email <span style={{ color: GOLD }}>*</span>
              </Label>
              <Input
                id="workEmail"
                type="email"
                value={intake.workEmail}
                onChange={e => setIntake(p => ({ ...p, workEmail: e.target.value }))}
                placeholder="you@yourfirm.co.uk"
                style={{ borderColor: intakeErrors.workEmail ? '#f87171' : R_BORDER, borderRadius: 2, backgroundColor: 'rgba(13,31,60,0.6)', color: R_CREAM }}
              />
              <EmailWarning email={intake.workEmail} />
              {intakeErrors.workEmail && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{intakeErrors.workEmail}</p>}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep('landing')}
              className="flex-1 px-6 py-3 text-sm font-medium"
              style={{ border: `1px solid ${R_BORDER}`, borderRadius: 2, backgroundColor: 'transparent', color: R_CREAM }}
            >
              ← Back
            </button>
            <button
              onClick={() => { if (validateIntake()) setStep('selfAssessment'); }}
              className="flex-1 px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: R_BG, borderRadius: 2 }}
            >
              Continue →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ─── Self-assessment ───────────────────────────────────────────────────────

  if (step === 'selfAssessment') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: R_BG }}>
        {/* Subtle ambient background image */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <img
            src="/hero.webp"
            alt="" aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.07 }}
          />
        </div>

        <header
          className="px-6 py-4 flex justify-between items-center max-w-6xl mx-auto w-full"
          style={{ position: 'relative', zIndex: 10 }}
        >
          <NLLogo dark />
          <StepIndicator current={2} total={3} dark />
        </header>
        <div style={{ position: 'relative', zIndex: 10, height: 1, backgroundColor: 'rgba(184,144,42,0.15)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: 2, background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full" style={{ position: 'relative', zIndex: 10 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>Step 02 of 03</p>
          <h2 className="mb-1" style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25 }}>
            Ten quick questions
          </h2>
          <p className="mb-6" style={{ color: R_BODY }}>These answers drive your personalised CLEAR TRUST score.</p>

          <div
            className="flex items-start gap-3 px-4 py-3 mb-8 text-sm"
            style={{ backgroundColor: 'rgba(184,144,42,0.08)', border: `1px solid ${R_BORDER}`, borderRadius: 2, color: R_CREAM }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: GOLD }}>◆</span>
            <p>
              Most firms answer <strong>No</strong> or <strong>Not sure</strong> to several of these — that is exactly why the Snapshot exists.
            </p>
          </div>

          <div className="space-y-3">
            {CLEAR_TRUST_DIMENSIONS.map((dim, i) => {
              const answer = answers[dim.key];
              const leftBorder = answer
                ? answer === 'YES' ? '#16a34a' : answer === 'NO' ? '#dc2626' : '#d97706'
                : NAVY;
              return (
                <div
                  key={dim.key}
                  className="p-5"
                  style={{
                    backgroundColor: R_CARD,
                    border: `1px solid ${R_BORDER}`,
                    borderLeft: `3px solid ${leftBorder}`,
                    borderRadius: 2,
                  }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="flex items-center justify-center shrink-0 mt-0.5"
                      style={{ width: 28, height: 28, backgroundColor: GOLD, borderRadius: 2 }}
                    >
                      <span style={{ color: R_BG, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>
                        {dim.letter}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: GOLD }}>
                        {dim.name} · Q{i + 1}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: R_CREAM }}>{dim.question}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-10">
                    {SELF_ASSESSMENT_ANSWERS.map(opt => {
                      const sel = answer === opt.value;
                      const selStyle =
                        opt.value === 'YES'
                          ? { borderColor: '#16a34a', bg: '#f0fdf4', color: '#15803d' }
                          : opt.value === 'NO'
                          ? { borderColor: '#dc2626', bg: '#fef2f2', color: '#b91c1c' }
                          : { borderColor: '#d97706', bg: '#fffbeb', color: '#b45309' };
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswers(p => ({ ...p, [dim.key]: opt.value as SelfAssessmentAnswer }))}
                          className="flex-1 py-2 text-sm font-medium transition-colors"
                          style={{
                            border: `1px solid ${sel ? selStyle.borderColor : R_BORDER}`,
                            borderRadius: 2,
                            backgroundColor: sel ? selStyle.bg : 'rgba(13,31,60,0.6)',
                            color: sel ? selStyle.color : R_BODY,
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep('intake')}
              className="flex-1 px-6 py-3 text-sm font-medium"
              style={{ border: `1px solid ${R_BORDER}`, borderRadius: 2, backgroundColor: 'transparent', color: R_CREAM }}
            >
              ← Back
            </button>
            <button
              onClick={() => { if (allAnswered) setStep('consent'); }}
              className="flex-1 px-6 py-3 text-sm font-semibold"
              style={{
                backgroundColor: allAnswered ? GOLD : 'rgba(184,144,42,0.35)',
                borderRadius: 2,
                cursor: allAnswered ? 'pointer' : 'not-allowed',
                color: allAnswered ? R_BG : 'rgba(237,232,224,0.45)',
              }}
            >
              Continue →
            </button>
          </div>
          {!allAnswered && (
            <p className="text-center text-sm mt-3" style={{ color: R_MUTED }}>Please answer all questions to continue.</p>
          )}
        </main>
      </div>
    );
  }

  // ─── Consent ───────────────────────────────────────────────────────────────

  if (step === 'consent') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: R_BG }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <img src="/hero.webp" alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.07 }} />
        </div>

        <header className="px-6 py-4 flex justify-between items-center max-w-6xl mx-auto w-full" style={{ position: 'relative', zIndex: 10 }}>
          <NLLogo dark />
          <StepIndicator current={3} total={3} dark />
        </header>
        <div style={{ position: 'relative', zIndex: 10, height: 1, backgroundColor: 'rgba(184,144,42,0.15)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: 2, background: `linear-gradient(90deg, ${GOLD} 0%, ${NAVY} 100%)` }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full flex flex-col justify-center" style={{ position: 'relative', zIndex: 10 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>Step 03 of 03</p>

          <div className="p-8" style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 2 }}>
            <h2 className="mb-2" style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25 }}>
              Almost there
            </h2>
            <p className="mb-6" style={{ color: R_BODY }}>
              Your personalised Snapshot is ready to generate. Please read and confirm the following before we proceed.
            </p>

            <div
              className="p-5 text-sm leading-relaxed mb-6"
              style={{ backgroundColor: 'rgba(184,144,42,0.08)', border: `1px solid ${R_BORDER}`, borderRadius: 2, color: R_BODY }}
            >
              <p className="font-semibold mb-2" style={{ color: GOLD }}>Important Notice</p>
              <p>
                This AI Readiness Snapshot is provided as <strong style={{ color: R_CREAM }}>general information only</strong>. It does not constitute legal, regulatory, or professional advice, and no adviser–client relationship is created by using this tool. The Snapshot is not a substitute for professional advice tailored to your firm&apos;s specific circumstances.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={v => setConsent(v === true)}
                className="mt-0.5 shrink-0"
              />
              <span className="text-sm" style={{ color: R_CREAM }}>
                I understand this Snapshot is general information, not legal or regulatory advice, and I consent to NexterLaw contacting me about the results.{' '}
                <a href="#" className="underline" style={{ color: GOLD }}>Privacy notice</a>.
              </span>
            </label>

            {submitError && (
              <div
                className="mt-4 p-4 text-sm"
                style={{ backgroundColor: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)', borderRadius: 2, color: '#f87171' }}
              >
                {submitError}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep('selfAssessment')}
                className="flex-1 px-6 py-3 text-sm font-medium"
                style={{ border: `1px solid ${R_BORDER}`, borderRadius: 2, backgroundColor: 'transparent', color: R_CREAM }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!consent}
                className="flex-1 px-6 py-3 text-sm font-semibold"
                style={{
                  backgroundColor: consent ? GOLD : 'rgba(184,144,42,0.35)',
                  borderRadius: 2,
                  cursor: consent ? 'pointer' : 'not-allowed',
                  color: consent ? R_BG : 'rgba(237,232,224,0.45)',
                }}
              >
                Generate My Snapshot →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Processing ────────────────────────────────────────────────────────────

  if (step === 'processing') {
    const stages = [
      { pct: 20, label: 'Saving your details…' },
      { pct: 40, label: 'Computing your CLEAR TRUST scores…' },
      { pct: 60, label: 'Retrieving regulatory knowledge base…' },
      { pct: 75, label: 'Generating your personalised report…' },
      { pct: 90, label: 'Finalising your PDF…' },
      { pct: 100, label: 'Done!' },
    ];
    const stage = stages.findLast(s => pollProgress >= s.pct) ?? stages[0];

    const clearTrust = [
      { letter: 'C', word: 'Compliance' },
      { letter: 'L', word: 'Literacy' },
      { letter: 'E', word: 'Explainability' },
      { letter: 'A', word: 'Accountability' },
      { letter: 'R', word: 'Rights' },
      { letter: 'T', word: 'Transparency' },
      { letter: 'R', word: 'Reliability' },
      { letter: 'U', word: 'Usage Governance' },
      { letter: 'S', word: 'Security' },
      { letter: 'T', word: 'Traceability' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: R_BG }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}} />
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <img src="/hero.webp" alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.07 }} />
        </div>

        <div className="px-6 py-5 flex justify-center" style={{ position: 'relative', zIndex: 10, borderBottom: `1px solid ${R_BORDER}` }}>
          <NLLogo dark />
        </div>
        <div style={{ position: 'relative', zIndex: 10, height: 2, background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" style={{ position: 'relative', zIndex: 10 }}>
          <div className="w-full max-w-2xl">

            <div className="flex items-center gap-4 mb-12">
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(184,144,42,0.15)', borderRadius: 2 }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: GOLD, borderTopColor: 'transparent' }}
                />
              </div>
              <div>
                <p className="font-bold text-lg leading-tight" style={{ color: R_CREAM, fontFamily: 'var(--font-playfair)' }}>
                  Building your AI Readiness Snapshot
                </p>
                <p className="text-sm mt-0.5" style={{ color: R_BODY }}>{stage.label}</p>
              </div>
            </div>

            {/* FRAMEWORK heading + gold rule */}
            <div className="text-center mb-10">
              <p style={{ color: GOLD, fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 10 }}>
                Framework
              </p>
              <div style={{ width: 60, height: 1, backgroundColor: GOLD, margin: '0 auto' }} />
            </div>

            {/* CLEAR / TRUST two-column grid */}
            <div className="grid grid-cols-2 gap-x-16 mb-10">
              {/* Left column: C L E A R */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {clearTrust.slice(0, 5).map((dim, i) => (
                  <div
                    key={i}
                    className="flex items-center"
                    style={{ gap: 16, opacity: 0, animation: 'fadeInUp 0.45s ease forwards', animationDelay: `${i * 0.22}s` }}
                  >
                    <div
                      style={{ width: 70, height: 70, backgroundColor: GOLD, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <span style={{ color: R_BG, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 38, lineHeight: 1 }}>
                        {dim.letter}
                      </span>
                    </div>
                    <span style={{ color: GOLD, fontSize: 20, lineHeight: 1, flexShrink: 0 }}>—</span>
                    <span style={{ color: R_CREAM, fontSize: 17, fontWeight: 400 }}>{dim.word}</span>
                  </div>
                ))}
              </div>
              {/* Right column: T R U S T */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {clearTrust.slice(5).map((dim, i) => (
                  <div
                    key={i}
                    className="flex items-center"
                    style={{ gap: 16, opacity: 0, animation: 'fadeInUp 0.45s ease forwards', animationDelay: `${(i + 5) * 0.22}s` }}
                  >
                    <div
                      style={{ width: 70, height: 70, backgroundColor: GOLD, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <span style={{ color: R_BG, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 38, lineHeight: 1 }}>
                        {dim.letter}
                      </span>
                    </div>
                    <span style={{ color: GOLD, fontSize: 20, lineHeight: 1, flexShrink: 0 }}>—</span>
                    <span style={{ color: R_CREAM, fontSize: 17, fontWeight: 400 }}>{dim.word}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-center mb-6 leading-relaxed" style={{ color: R_MUTED }}>
              Your report is being generated using the{' '}
              <span className="font-semibold" style={{ color: R_CREAM }}>CLEAR TRUST Framework</span>{' '}
              — NexterLaw&apos;s proprietary methodology for assessing AI governance maturity. Your responses are evaluated against the framework&apos;s ten dimensions and criteria to produce your personalised findings.
            </p>

            <Progress value={pollProgress} className="h-0.5" />
            <p className="text-xs mt-2 text-center" style={{ color: R_MUTED }}>This takes around 30–60 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────────────

  if (step === 'result' && reportData) {
    const scores = reportData.scores as ClearTrustScores;
    const report = reportData.report as GeneratedReportContent;

    const parseParas = (text: string) =>
      text.split(/\n+/).filter(s => s.trim().length > 10);

    const RegLabel = ({ children }: { children: React.ReactNode }) => (
      <p style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 8, color: 'inherit' }}>
        {children}
      </p>
    );

    const SectionHeader = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
      <div style={{ borderBottom: `1px solid ${R_BORDER}`, padding: '20px 32px 16px' }}>
        <p style={{ color: GOLD, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 5 }}>
          {eyebrow}
        </p>
        <h2 style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.2rem', margin: 0, lineHeight: 1.3 }}>
          {title}
        </h2>
      </div>
    );

    return (
      <div className="min-h-screen" style={{ backgroundColor: R_BG }}>

        {/* Header */}
        <header
          className="px-6 py-4 flex justify-between items-center"
          style={{ backgroundColor: R_BG, borderBottom: `1px solid ${R_BORDER}` }}
        >
          <NLLogo dark />
          {reportData.pdfUrl && (
            <a
              href={reportData.pdfUrl}
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: '#0d1f3c', borderRadius: 2 }}
            >
              ↓ Download PDF
            </a>
          )}
        </header>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />

        <main className="max-w-4xl mx-auto px-6 py-10 space-y-4">

          {/* Score hero */}
          <section style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
            <SectionHeader eyebrow="CLEAR TRUST Score" title={intake.firmName} />
            <div className="p-8">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <ScoreGauge score={scores.headline} band={scores.band} dark />
                <div className="flex-1 w-full space-y-4">
                  {scores.dimensions.map(d => (
                    <DimensionBar key={d.key} name={d.name} letter={d.letter} score={d.score} dark />
                  ))}
                </div>
              </div>
              {report?.scoreNarrative && (
                <div className="mt-6 pt-6 space-y-3" style={{ borderTop: `1px solid ${R_BORDER}` }}>
                  {parseParas(report.scoreNarrative).map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: R_BODY }}>{para}</p>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* About this report */}
          <section style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 4, padding: '24px 32px' }}>
            <p style={{ color: GOLD, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
              About This Report
            </p>
            <h2 style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.1rem', marginBottom: 12, lineHeight: 1.35 }}>
              Generated Using the CLEAR TRUST Framework
            </h2>
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.75, color: R_BODY }}>
              This report has been generated using the <strong style={{ color: R_CREAM }}>CLEAR TRUST Framework</strong> — NexterLaw&apos;s proprietary methodology for evaluating AI governance maturity in legal practice. Your organisation has been assessed against ten dimensions: Compliance, Literacy, Explainability, Accountability, Rights, Transparency, Reliability, Usage Governance, Security, and Traceability. All scores, findings, and recommendations presented here are derived directly from the framework&apos;s evaluation criteria and reflect your firm&apos;s responses to the self-assessment questionnaire.
            </p>
          </section>

          {/* Regulatory map */}
          {report?.regulatoryMap && (
            <section style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
              <SectionHeader eyebrow="Regulatory Framework" title="Your Regulatory Pressure Map" />
              <div className="p-5 space-y-3">

                {report.regulatoryMap.sra && (
                  <div style={{ backgroundColor: 'rgba(78,136,199,0.07)', border: '1px solid rgba(78,136,199,0.18)', borderLeft: '3px solid #4e88c7', borderRadius: 2, padding: '14px 18px', color: '#4e88c7' }}>
                    <RegLabel>SRA Expectations</RegLabel>
                    {parseParas(report.regulatoryMap.sra).map((para, i, arr) => (
                      <p key={i} style={{ color: R_BODY, fontSize: '0.8125rem', lineHeight: 1.7, marginBottom: i < arr.length - 1 ? 8 : 0 }}>{para}</p>
                    ))}
                  </div>
                )}

                {report.regulatoryMap.ukGdpr && (
                  <div style={{ backgroundColor: 'rgba(91,127,166,0.07)', border: '1px solid rgba(91,127,166,0.18)', borderLeft: `3px solid ${STEEL}`, borderRadius: 2, padding: '14px 18px', color: STEEL }}>
                    <RegLabel>UK GDPR / ICO</RegLabel>
                    {parseParas(report.regulatoryMap.ukGdpr).map((para, i, arr) => (
                      <p key={i} style={{ color: R_BODY, fontSize: '0.8125rem', lineHeight: 1.7, marginBottom: i < arr.length - 1 ? 8 : 0 }}>{para}</p>
                    ))}
                  </div>
                )}

                {report.regulatoryMap.pii && (
                  <div style={{ backgroundColor: 'rgba(184,144,42,0.07)', border: 'rgba(184,144,42,0.22) solid 1px', borderLeft: `3px solid ${GOLD}`, borderRadius: 2, padding: '14px 18px', color: GOLD }}>
                    <RegLabel>Professional Indemnity Insurance</RegLabel>
                    {parseParas(report.regulatoryMap.pii).map((para, i, arr) => (
                      <p key={i} style={{ color: R_BODY, fontSize: '0.8125rem', lineHeight: 1.7, marginBottom: i < arr.length - 1 ? 8 : 0 }}>{para}</p>
                    ))}
                  </div>
                )}

                {report.regulatoryMap.clientProcurement && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderLeft: '3px solid rgba(158,180,210,0.5)', borderRadius: 2, padding: '14px 18px', color: '#8a9bb0' }}>
                    <RegLabel>Client Procurement Pressure</RegLabel>
                    {parseParas(report.regulatoryMap.clientProcurement).map((para, i, arr) => (
                      <p key={i} style={{ color: R_BODY, fontSize: '0.8125rem', lineHeight: 1.7, marginBottom: i < arr.length - 1 ? 8 : 0 }}>{para}</p>
                    ))}
                  </div>
                )}

                {report.regulatoryMap.euAiAct && (
                  <div style={{ backgroundColor: 'rgba(184,144,42,0.09)', border: '1px solid rgba(184,144,42,0.28)', borderLeft: '3px solid #c9a030', borderRadius: 2, padding: '14px 18px', color: '#c9a030' }}>
                    <RegLabel>EU AI Act (Applicable)</RegLabel>
                    {parseParas(report.regulatoryMap.euAiAct).map((para, i, arr) => (
                      <p key={i} style={{ color: R_BODY, fontSize: '0.8125rem', lineHeight: 1.7, marginBottom: i < arr.length - 1 ? 8 : 0 }}>{para}</p>
                    ))}
                  </div>
                )}

              </div>
            </section>
          )}

          {/* Shadow AI */}
          {report?.shadowAi && (
            <section style={{ backgroundColor: 'rgba(180,83,9,0.07)', border: '1px solid rgba(180,83,9,0.2)', borderLeft: '3px solid #d97706', borderRadius: 4, padding: '24px 32px' }}>
              <p style={{ color: '#d97706', fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                Risk Profile
              </p>
              <h2 style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.1rem', marginBottom: 14, lineHeight: 1.35 }}>
                Shadow AI: The Question Most Firms Cannot Answer
              </h2>
              <div className="space-y-3">
                {parseParas(report.shadowAi).map((para, i) => (
                  <p key={i} style={{ fontSize: '0.8125rem', lineHeight: 1.75, color: R_BODY }}>{para}</p>
                ))}
              </div>
            </section>
          )}

          {/* Opportunities */}
          {report?.opportunities?.length > 0 && (
            <section style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
              <SectionHeader eyebrow="Opportunities" title="Top AI Opportunities for Your Practice" />
              <div className="p-5 space-y-3">
                {report.opportunities.slice(0, 3).map((opp, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', gap: 16, padding: '16px 18px', backgroundColor: 'rgba(184,144,42,0.06)', border: '1px solid rgba(184,144,42,0.14)', borderRadius: 2 }}
                  >
                    <div
                      style={{ width: 42, height: 42, backgroundColor: GOLD, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <span style={{ color: '#0d1f3c', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 14 }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <p style={{ color: R_CREAM, fontSize: '0.875rem', fontWeight: 600, marginBottom: 5 }}>{opp.title}</p>
                      <p style={{ color: R_BODY, fontSize: '0.8125rem', lineHeight: 1.65 }}>{opp.benefit}</p>
                      {opp.toolCategory && (
                        <p style={{ color: R_MUTED, fontSize: '0.75rem', marginTop: 5, fontStyle: 'italic' }}>e.g. {opp.toolCategory}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Exposures */}
          {report?.exposures?.length > 0 && (
            <section style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
              <SectionHeader eyebrow="Risk Assessment" title="Top Exposure Areas" />
              <div className="p-5 space-y-3">
                {report.exposures.slice(0, 3).map((exp, i) => {
                  const sev = exp.severity;
                  const sevColor = sev === 'HIGH' ? '#f87171' : sev === 'MEDIUM' ? '#fbbf24' : '#94a3b8';
                  const sevBg = sev === 'HIGH' ? 'rgba(248,113,113,0.07)' : sev === 'MEDIUM' ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)';
                  const sevBorder = sev === 'HIGH' ? 'rgba(248,113,113,0.18)' : sev === 'MEDIUM' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.07)';
                  return (
                    <div
                      key={i}
                      style={{ display: 'flex', gap: 16, padding: '16px 18px', backgroundColor: sevBg, border: `1px solid ${sevBorder}`, borderLeft: `3px solid ${sevColor}`, borderRadius: 2 }}
                    >
                      <div
                        style={{ width: 42, height: 42, backgroundColor: sevColor, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <span style={{ color: sev === 'LOW' ? '#1e293b' : '#0d1f3c', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 14 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <p style={{ color: R_CREAM, fontSize: '0.875rem', fontWeight: 600 }}>{exp.title}</p>
                          <span style={{ color: sevColor, border: `1px solid ${sevColor}50`, borderRadius: 2, padding: '2px 6px', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {exp.severity}
                          </span>
                        </div>
                        <p style={{ color: R_BODY, fontSize: '0.8125rem', lineHeight: 1.65 }}>{exp.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${R_BORDER}`, paddingTop: 24, paddingBottom: 16 }}>
            <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: R_MUTED, letterSpacing: '0.04em', lineHeight: 1.7 }}>
              CLEAR TRUST is a proprietary framework by Dr. Siamak Goudarzi / NexterLaw.
              <br />
              This Snapshot is general information, not legal or regulatory advice. © NexterLaw
            </p>
          </div>

        </main>
      </div>
    );
  }

  return null;
}
