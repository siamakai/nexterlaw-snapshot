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
const PAGE_BG = '#f9f7f4';
const CARD_BORDER = '#e6dfd6';
const BODY = '#3d3a35';
const MUTED = '#7a746d';

// ─── Helper components ────────────────────────────────────────────────────────

function NLLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
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
          backgroundColor: NAVY,
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
          <span style={{ color: NAVY }}>NEXTER</span>
          <span style={{ color: GOLD }}>LAW</span>
        </div>
        <div
          style={{
            color: STEEL,
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

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? 24 : 8,
            height: 8,
            backgroundColor: i + 1 <= current ? NAVY : CARD_BORDER,
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

function ScoreGauge({ score, band }: { score: number; band: string }) {
  const bandInfo = SCORE_BANDS.find(b => b.label === band) ?? SCORE_BANDS[1];
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-36 h-36 rounded-full flex flex-col items-center justify-center"
        style={{ border: `3px solid ${bandInfo.colour}`, backgroundColor: `${bandInfo.colour}10` }}
      >
        <span
          style={{ color: bandInfo.colour, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '3rem', lineHeight: 1 }}
        >
          {Math.round(score)}
        </span>
        <span className="text-xs mt-1" style={{ color: MUTED }}>out of 100</span>
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

function DimensionBar({ name, letter, score }: { name: string; letter: string; score: number }) {
  const pct = Math.round(score);
  const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: NAVY, borderRadius: 2 }}
      >
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-medium truncate" style={{ color: BODY }}>{name}</span>
          <span className="font-bold ml-2 shrink-0" style={{ color }}>{pct}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: CARD_BORDER }}>
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
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE_BG }}>
        <header className="px-6 py-5 flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <span className="text-xs hidden sm:block uppercase tracking-widest" style={{ color: MUTED }}>
            Free · UK Law Firms · No Sales Call
          </span>
        </header>
        <div className="w-full h-px" style={{ backgroundColor: CARD_BORDER }} />
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-3xl mx-auto w-full gap-8">
          <div
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: `${NAVY}0d`, color: NAVY, border: `1px solid ${NAVY}25`, borderRadius: 2 }}
          >
            AI Readiness Snapshot · Free · 3 minutes
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-playfair)',
              color: NAVY,
              fontWeight: 700,
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              lineHeight: 1.2,
              maxWidth: 680,
            }}
          >
            What AI is your firm actually using — and can you evidence control of it?
          </h1>

          <div className="flex items-center gap-4 w-full max-w-xs mx-auto">
            <div className="flex-1 h-px" style={{ backgroundColor: CARD_BORDER }} />
            <div className="w-8 h-0.5" style={{ backgroundColor: GOLD }} />
            <div className="flex-1 h-px" style={{ backgroundColor: CARD_BORDER }} />
          </div>

          <p className="text-lg max-w-xl leading-relaxed" style={{ color: MUTED }}>
            Get your free AI Readiness Snapshot. We score your firm across our CLEAR TRUST framework — ten dimensions of AI control — and show you where the regulatory exposure lies.
          </p>

          <div
            className="text-left text-sm w-full max-w-xl p-6"
            style={{
              backgroundColor: '#fff',
              border: `1px solid ${CARD_BORDER}`,
              borderLeft: `3px solid ${GOLD}`,
              borderRadius: 2,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>
              About the CLEAR TRUST Framework
            </p>
            <p className="leading-relaxed" style={{ color: MUTED }}>
              This assessment is structured around the{' '}
              <strong style={{ color: NAVY }}>CLEAR TRUST Framework</strong> — NexterLaw&apos;s
              proprietary methodology for evaluating AI governance maturity in legal practice.
              Your firm is assessed across ten defined dimensions: Compliance, Literacy,
              Explainability, Accountability, Rights, Transparency, Reliability, Usage Governance,
              Security, and Traceability. The report, scores, findings, and recommendations are all
              based on the framework&apos;s criteria and evaluation methodology.
            </p>
          </div>

          <button
            onClick={() => setStep('intake')}
            className="inline-flex items-center gap-3 px-10 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: NAVY, borderRadius: 2 }}
          >
            Get Your Free Snapshot
            <span style={{ color: GOLD }}>→</span>
          </button>

          <div
            className="grid grid-cols-3 gap-6 w-full max-w-lg pt-8 mt-2"
            style={{ borderTop: `1px solid ${CARD_BORDER}` }}
          >
            {[
              { num: '01', label: '5 firm details' },
              { num: '02', label: '10 quick questions' },
              { num: '03', label: 'Personalised PDF report' },
            ].map(item => (
              <div key={item.num} className="flex flex-col items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: GOLD, fontFamily: 'var(--font-playfair)' }}>
                  {item.num}
                </span>
                <span className="text-sm" style={{ color: MUTED }}>{item.label}</span>
              </div>
            ))}
          </div>
        </main>

        <footer
          className="px-6 py-5 text-center text-xs max-w-3xl mx-auto w-full"
          style={{ borderTop: `1px solid ${CARD_BORDER}`, color: MUTED }}
        >
          This Snapshot is general information, not legal or regulatory advice. © NexterLaw ·{' '}
          <a href="https://nexterlaw.com" className="underline" style={{ color: NAVY }}>nexterlaw.com</a>
        </footer>
      </div>
    );
  }

  // ─── Intake ────────────────────────────────────────────────────────────────

  if (step === 'intake') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE_BG }}>
        <header className="px-6 py-4 bg-white flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <StepIndicator current={1} total={3} />
        </header>
        <div className="w-full h-px" style={{ backgroundColor: CARD_BORDER }} />
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 33%, ${NAVY} 100%)` }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>Step 01 of 03</p>
          <h2 className="mb-1" style={{ fontFamily: 'var(--font-playfair)', color: NAVY, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25 }}>
            Tell us about your firm
          </h2>
          <p className="mb-8" style={{ color: MUTED }}>This information personalises your AI Readiness Snapshot.</p>

          <div className="bg-white p-8 space-y-6" style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2 }}>

            <div>
              <Label htmlFor="firmName" className="text-sm font-semibold mb-1.5 block" style={{ color: BODY }}>
                Firm name <span style={{ color: GOLD }}>*</span>
              </Label>
              <Input
                id="firmName"
                value={intake.firmName}
                onChange={e => setIntake(p => ({ ...p, firmName: e.target.value }))}
                placeholder="e.g. Smith & Partners LLP"
                style={{ borderColor: intakeErrors.firmName ? '#dc2626' : CARD_BORDER, borderRadius: 2 }}
              />
              {intakeErrors.firmName && <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{intakeErrors.firmName}</p>}
            </div>

            <div>
              <Label htmlFor="firmWebsite" className="text-sm font-semibold mb-1.5 block" style={{ color: BODY }}>
                Firm website <span style={{ color: GOLD }}>*</span>
              </Label>
              <Input
                id="firmWebsite"
                value={intake.firmWebsite}
                onChange={e => setIntake(p => ({ ...p, firmWebsite: e.target.value }))}
                placeholder="https://www.yourfirm.co.uk"
                style={{ borderColor: intakeErrors.firmWebsite ? '#dc2626' : CARD_BORDER, borderRadius: 2 }}
              />
              {intakeErrors.firmWebsite && <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{intakeErrors.firmWebsite}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-sm font-semibold mb-1.5 block" style={{ color: BODY }}>
                  City <span style={{ color: GOLD }}>*</span>
                </Label>
                <Input
                  id="city"
                  value={intake.city}
                  onChange={e => setIntake(p => ({ ...p, city: e.target.value }))}
                  placeholder="London"
                  style={{ borderColor: intakeErrors.city ? '#dc2626' : CARD_BORDER, borderRadius: 2 }}
                />
                {intakeErrors.city && <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{intakeErrors.city}</p>}
              </div>
              <div>
                <Label htmlFor="country" className="text-sm font-semibold mb-1.5 block" style={{ color: BODY }}>
                  Country <span style={{ color: GOLD }}>*</span>
                </Label>
                <Input
                  id="country"
                  value={intake.country}
                  onChange={e => setIntake(p => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. United Kingdom"
                  style={{ borderColor: intakeErrors.country ? '#dc2626' : CARD_BORDER, borderRadius: 2 }}
                />
                {intakeErrors.country && <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{intakeErrors.country}</p>}
              </div>
            </div>

            <div className="h-px" style={{ backgroundColor: CARD_BORDER }} />

            <div>
              <Label className="text-sm font-semibold block mb-0.5" style={{ color: BODY }}>
                Practice type(s) <span style={{ color: GOLD }}>*</span>{' '}
                <span className="font-normal text-xs" style={{ color: MUTED }}>(select all that apply)</span>
              </Label>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRACTICE_TYPES.map(pt => {
                  const checked = intake.practiceTypes.includes(pt.slug);
                  return (
                    <label
                      key={pt.slug}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
                      style={{
                        border: `1px solid ${checked ? NAVY : CARD_BORDER}`,
                        borderRadius: 2,
                        backgroundColor: checked ? `${NAVY}0a` : '#fff',
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
                      <span className="text-sm" style={{ color: checked ? NAVY : BODY }}>{pt.label}</span>
                    </label>
                  );
                })}
              </div>
              {intakeErrors.practiceTypes && <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{intakeErrors.practiceTypes}</p>}
            </div>

            <div>
              <Label className="text-sm font-semibold block mb-0.5" style={{ color: BODY }}>
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
                      border: `1px solid ${intake.firmSize === opt.value ? NAVY : CARD_BORDER}`,
                      borderRadius: 2,
                      backgroundColor: intake.firmSize === opt.value ? NAVY : '#fff',
                      color: intake.firmSize === opt.value ? '#fff' : BODY,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {intakeErrors.firmSize && <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{intakeErrors.firmSize}</p>}
            </div>

            <div>
              <Label className="text-sm font-semibold block mb-0.5" style={{ color: BODY }}>
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
                      border: `1px solid ${intake.euFacing === opt.value ? NAVY : CARD_BORDER}`,
                      borderRadius: 2,
                      backgroundColor: intake.euFacing === opt.value ? NAVY : '#fff',
                      color: intake.euFacing === opt.value ? '#fff' : BODY,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {intakeErrors.euFacing && <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{intakeErrors.euFacing}</p>}
            </div>

            <div className="h-px" style={{ backgroundColor: CARD_BORDER }} />

            <div>
              <Label htmlFor="workEmail" className="text-sm font-semibold mb-1.5 block" style={{ color: BODY }}>
                Work email <span style={{ color: GOLD }}>*</span>
              </Label>
              <Input
                id="workEmail"
                type="email"
                value={intake.workEmail}
                onChange={e => setIntake(p => ({ ...p, workEmail: e.target.value }))}
                placeholder="you@yourfirm.co.uk"
                style={{ borderColor: intakeErrors.workEmail ? '#dc2626' : CARD_BORDER, borderRadius: 2 }}
              />
              <EmailWarning email={intake.workEmail} />
              {intakeErrors.workEmail && <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{intakeErrors.workEmail}</p>}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep('landing')}
              className="flex-1 px-6 py-3 text-sm font-medium"
              style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2, backgroundColor: '#fff', color: BODY }}
            >
              ← Back
            </button>
            <button
              onClick={() => { if (validateIntake()) setStep('selfAssessment'); }}
              className="flex-1 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: NAVY, borderRadius: 2 }}
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
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE_BG }}>
        <header className="px-6 py-4 bg-white flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <StepIndicator current={2} total={3} />
        </header>
        <div className="w-full h-px" style={{ backgroundColor: CARD_BORDER }} />
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 66%, ${NAVY} 100%)` }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>Step 02 of 03</p>
          <h2 className="mb-1" style={{ fontFamily: 'var(--font-playfair)', color: NAVY, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25 }}>
            Ten quick questions
          </h2>
          <p className="mb-6" style={{ color: MUTED }}>These answers drive your personalised CLEAR TRUST score.</p>

          <div
            className="flex items-start gap-3 px-4 py-3 mb-8 text-sm"
            style={{ backgroundColor: `${NAVY}0a`, border: `1px solid ${NAVY}20`, borderRadius: 2, color: NAVY }}
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
                  className="bg-white p-5"
                  style={{ border: `1px solid ${CARD_BORDER}`, borderLeft: `3px solid ${leftBorder}`, borderRadius: 2 }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="flex items-center justify-center shrink-0 mt-0.5"
                      style={{ width: 28, height: 28, backgroundColor: NAVY, borderRadius: 2 }}
                    >
                      <span style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>
                        {dim.letter}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: GOLD }}>
                        {dim.name} · Q{i + 1}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: BODY }}>{dim.question}</p>
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
                            border: `1px solid ${sel ? selStyle.borderColor : CARD_BORDER}`,
                            borderRadius: 2,
                            backgroundColor: sel ? selStyle.bg : '#fff',
                            color: sel ? selStyle.color : MUTED,
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
              style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2, backgroundColor: '#fff', color: BODY }}
            >
              ← Back
            </button>
            <button
              onClick={() => { if (allAnswered) setStep('consent'); }}
              className="flex-1 px-6 py-3 text-sm font-semibold text-white"
              style={{
                backgroundColor: allAnswered ? NAVY : `${NAVY}60`,
                borderRadius: 2,
                cursor: allAnswered ? 'pointer' : 'not-allowed',
              }}
            >
              Continue →
            </button>
          </div>
          {!allAnswered && (
            <p className="text-center text-sm mt-3" style={{ color: MUTED }}>Please answer all questions to continue.</p>
          )}
        </main>
      </div>
    );
  }

  // ─── Consent ───────────────────────────────────────────────────────────────

  if (step === 'consent') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE_BG }}>
        <header className="px-6 py-4 bg-white flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <StepIndicator current={3} total={3} />
        </header>
        <div className="w-full h-px" style={{ backgroundColor: CARD_BORDER }} />
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${GOLD} 0%, ${NAVY} 100%)` }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>Step 03 of 03</p>

          <div className="bg-white p-8" style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2 }}>
            <h2 className="mb-2" style={{ fontFamily: 'var(--font-playfair)', color: NAVY, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25 }}>
              Almost there
            </h2>
            <p className="mb-6" style={{ color: MUTED }}>
              Your personalised Snapshot is ready to generate. Please read and confirm the following before we proceed.
            </p>

            <div
              className="p-5 text-sm leading-relaxed mb-6"
              style={{ backgroundColor: PAGE_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, color: BODY }}
            >
              <p className="font-semibold mb-2" style={{ color: NAVY }}>Important Notice</p>
              <p>
                This AI Readiness Snapshot is provided as <strong>general information only</strong>. It does not constitute legal, regulatory, or professional advice, and no adviser–client relationship is created by using this tool. The Snapshot is not a substitute for professional advice tailored to your firm&apos;s specific circumstances.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={v => setConsent(v === true)}
                className="mt-0.5 shrink-0"
              />
              <span className="text-sm" style={{ color: BODY }}>
                I understand this Snapshot is general information, not legal or regulatory advice, and I consent to NexterLaw contacting me about the results.{' '}
                <a href="#" className="underline" style={{ color: NAVY }}>Privacy notice</a>.
              </span>
            </label>

            {submitError && (
              <div
                className="mt-4 p-4 text-sm"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2, color: '#b91c1c' }}
              >
                {submitError}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep('selfAssessment')}
                className="flex-1 px-6 py-3 text-sm font-medium"
                style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2, backgroundColor: '#fff', color: BODY }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!consent}
                className="flex-1 px-6 py-3 text-sm font-semibold text-white"
                style={{
                  backgroundColor: consent ? NAVY : `${NAVY}60`,
                  borderRadius: 2,
                  cursor: consent ? 'pointer' : 'not-allowed',
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
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-6 py-5 flex justify-center" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
          <NLLogo />
        </div>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-2xl">

            <div className="flex items-center gap-4 mb-12">
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${GOLD}18`, borderRadius: 2 }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: GOLD, borderTopColor: 'transparent' }}
                />
              </div>
              <div>
                <p className="font-bold text-lg leading-tight" style={{ color: NAVY, fontFamily: 'var(--font-playfair)' }}>
                  Building your AI Readiness Snapshot
                </p>
                <p className="text-sm mt-0.5" style={{ color: MUTED }}>{stage.label}</p>
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
                      style={{ width: 70, height: 70, backgroundColor: NAVY, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <span style={{ color: GOLD, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 38, lineHeight: 1 }}>
                        {dim.letter}
                      </span>
                    </div>
                    <span style={{ color: GOLD, fontSize: 20, lineHeight: 1, flexShrink: 0 }}>—</span>
                    <span style={{ color: NAVY, fontSize: 17, fontWeight: 400 }}>{dim.word}</span>
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
                      style={{ width: 70, height: 70, backgroundColor: NAVY, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <span style={{ color: GOLD, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 38, lineHeight: 1 }}>
                        {dim.letter}
                      </span>
                    </div>
                    <span style={{ color: GOLD, fontSize: 20, lineHeight: 1, flexShrink: 0 }}>—</span>
                    <span style={{ color: NAVY, fontSize: 17, fontWeight: 400 }}>{dim.word}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-center mb-6 leading-relaxed" style={{ color: MUTED }}>
              Your report is being generated using the{' '}
              <span className="font-semibold" style={{ color: NAVY }}>CLEAR TRUST Framework</span>{' '}
              — NexterLaw&apos;s proprietary methodology for assessing AI governance maturity. Your responses are evaluated against the framework&apos;s ten dimensions and criteria to produce your personalised findings.
            </p>

            <Progress value={pollProgress} className="h-0.5" />
            <p className="text-xs mt-2 text-center" style={{ color: MUTED }}>This takes around 30–60 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────────────

  if (step === 'result' && reportData) {
    const scores = reportData.scores as ClearTrustScores;
    const report = reportData.report as GeneratedReportContent;

    return (
      <div className="min-h-screen" style={{ backgroundColor: PAGE_BG }}>
        <header className="px-6 py-4 bg-white flex justify-between items-center" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
          <NLLogo />
          <div className="flex gap-2">
            {reportData.pdfUrl && (
              <a
                href={reportData.pdfUrl}
                download
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: GOLD, borderRadius: 2 }}
              >
                ↓ Download PDF
              </a>
            )}
          </div>
        </header>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />

        <main className="max-w-4xl mx-auto px-6 py-10 space-y-5">

          {/* Framework intro */}
          <section
            className="bg-white p-8"
            style={{ border: `1px solid ${CARD_BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 2 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>About This Report</p>
            <h2 className="mb-3" style={{ fontFamily: 'var(--font-playfair)', color: NAVY, fontWeight: 700, fontSize: '1.25rem' }}>
              Generated Using the CLEAR TRUST Framework
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: BODY }}>
              This report has been generated using the <strong>CLEAR TRUST Framework</strong> — NexterLaw&apos;s proprietary methodology for evaluating AI governance maturity in legal practice. Your organisation has been assessed against ten dimensions: Compliance, Literacy, Explainability, Accountability, Rights, Transparency, Reliability, Usage Governance, Security, and Traceability. All scores, findings, and recommendations presented here are derived directly from the framework&apos;s evaluation criteria and reflect your firm&apos;s responses to the self-assessment questionnaire.
            </p>
          </section>

          {/* Score */}
          <section className="bg-white p-8" style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2 }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: GOLD }}>
              CLEAR TRUST Score · {intake.firmName}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <ScoreGauge score={scores.headline} band={scores.band} />
              <div className="flex-1 w-full space-y-4">
                {scores.dimensions.map(d => (
                  <DimensionBar key={d.key} name={d.name} letter={d.letter} score={d.score} />
                ))}
              </div>
            </div>
            {report?.scoreNarrative && (
              <p className="mt-6 text-sm leading-relaxed pt-5" style={{ borderTop: `1px solid ${CARD_BORDER}`, color: BODY }}>
                {report.scoreNarrative}
              </p>
            )}
          </section>

          {/* Regulatory map */}
          {report?.regulatoryMap && (
            <section className="bg-white p-8" style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2 }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Regulatory Framework</p>
              <h2 className="mb-5" style={{ fontFamily: 'var(--font-playfair)', color: NAVY, fontWeight: 700, fontSize: '1.25rem' }}>
                Your Regulatory Pressure Map
              </h2>
              <div className="space-y-3">
                {report.regulatoryMap.sra && (
                  <div className="p-4" style={{ backgroundColor: `${NAVY}08`, border: `1px solid ${NAVY}20`, borderLeft: `3px solid ${NAVY}`, borderRadius: 2 }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: NAVY }}>SRA Expectations</p>
                    <p className="text-sm" style={{ color: BODY }}>{report.regulatoryMap.sra}</p>
                  </div>
                )}
                {report.regulatoryMap.ukGdpr && (
                  <div className="p-4" style={{ backgroundColor: `${STEEL}0d`, border: `1px solid ${STEEL}25`, borderLeft: `3px solid ${STEEL}`, borderRadius: 2 }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: STEEL }}>UK GDPR / ICO</p>
                    <p className="text-sm" style={{ color: BODY }}>{report.regulatoryMap.ukGdpr}</p>
                  </div>
                )}
                {report.regulatoryMap.pii && (
                  <div className="p-4" style={{ backgroundColor: `${GOLD}0d`, border: `1px solid ${GOLD}30`, borderLeft: `3px solid ${GOLD}`, borderRadius: 2 }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: GOLD }}>Professional Indemnity Insurance</p>
                    <p className="text-sm" style={{ color: BODY }}>{report.regulatoryMap.pii}</p>
                  </div>
                )}
                {report.regulatoryMap.clientProcurement && (
                  <div className="p-4" style={{ backgroundColor: '#f5f3ef', border: `1px solid ${CARD_BORDER}`, borderLeft: `3px solid ${BODY}`, borderRadius: 2 }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: BODY }}>Client Procurement Pressure</p>
                    <p className="text-sm" style={{ color: BODY }}>{report.regulatoryMap.clientProcurement}</p>
                  </div>
                )}
                {report.regulatoryMap.euAiAct && (
                  <div className="p-4" style={{ backgroundColor: `${NAVY}06`, border: `1px solid ${GOLD}40`, borderLeft: `3px solid ${GOLD}`, borderRadius: 2 }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: GOLD }}>EU AI Act (Applicable)</p>
                    <p className="text-sm" style={{ color: BODY }}>{report.regulatoryMap.euAiAct}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Shadow AI */}
          {report?.shadowAi && (
            <section className="bg-white p-8" style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2 }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Risk Profile</p>
              <h2 className="mb-3" style={{ fontFamily: 'var(--font-playfair)', color: NAVY, fontWeight: 700, fontSize: '1.25rem' }}>
                Shadow AI: The Question Most Firms Cannot Answer
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: BODY }}>{report.shadowAi}</p>
            </section>
          )}

          {/* Opportunities */}
          {report?.opportunities?.length > 0 && (
            <section className="bg-white p-8" style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2 }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Opportunities</p>
              <h2 className="mb-5" style={{ fontFamily: 'var(--font-playfair)', color: NAVY, fontWeight: 700, fontSize: '1.25rem' }}>
                Top 3 AI Opportunities for Your Practice
              </h2>
              <div className="space-y-3">
                {report.opportunities.slice(0, 3).map((opp, i) => (
                  <div key={i} className="flex gap-4 p-4" style={{ backgroundColor: `${NAVY}06`, border: `1px solid ${NAVY}15`, borderRadius: 2 }}>
                    <div
                      className="flex items-center justify-center font-bold text-sm shrink-0 text-white"
                      style={{ width: 32, height: 32, backgroundColor: NAVY, borderRadius: 2, fontFamily: 'var(--font-playfair)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: NAVY }}>{opp.title}</p>
                      <p className="text-sm mt-1" style={{ color: BODY }}>{opp.benefit}</p>
                      {opp.toolCategory && <p className="text-xs mt-1 italic" style={{ color: MUTED }}>e.g. {opp.toolCategory}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Exposures */}
          {report?.exposures?.length > 0 && (
            <section className="bg-white p-8" style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 2 }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: GOLD }}>Risk Assessment</p>
              <h2 className="mb-5" style={{ fontFamily: 'var(--font-playfair)', color: NAVY, fontWeight: 700, fontSize: '1.25rem' }}>
                Top 3 Exposure Areas
              </h2>
              <div className="space-y-3">
                {report.exposures.slice(0, 3).map((exp, i) => {
                  const sevColor = exp.severity === 'HIGH' ? '#b91c1c' : exp.severity === 'MEDIUM' ? '#b45309' : '#6b7280';
                  const sevBg = exp.severity === 'HIGH' ? '#fef2f2' : exp.severity === 'MEDIUM' ? '#fffbeb' : '#f9fafb';
                  const sevBorder = exp.severity === 'HIGH' ? '#fecaca' : exp.severity === 'MEDIUM' ? '#fde68a' : '#e5e7eb';
                  return (
                    <div
                      key={i}
                      className="flex gap-4 p-4"
                      style={{ backgroundColor: sevBg, border: `1px solid ${sevBorder}`, borderLeft: `3px solid ${sevColor}`, borderRadius: 2 }}
                    >
                      <div
                        className="flex items-center justify-center font-bold text-sm shrink-0 text-white"
                        style={{ width: 32, height: 32, backgroundColor: sevColor, borderRadius: 2, fontFamily: 'var(--font-playfair)' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm" style={{ color: BODY }}>{exp.title}</p>
                          <span
                            className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5"
                            style={{ color: sevColor, border: `1px solid ${sevColor}40`, borderRadius: 2 }}
                          >
                            {exp.severity}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: BODY }}>{exp.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <p className="text-center text-xs pb-6" style={{ color: MUTED }}>
            CLEAR TRUST is a proprietary framework by Dr. Siamak Goudarzi / NexterLaw. This Snapshot is general information, not legal or regulatory advice. © NexterLaw
          </p>
        </main>
      </div>
    );
  }

  return null;
}
