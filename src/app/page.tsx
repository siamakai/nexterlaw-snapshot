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
import { Button, buttonVariants } from '@/components/ui/button';
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

// ─── Helper components ────────────────────────────────────────────────────────

const NAVY = '#1a3a6b';
const GOLD = '#B8902A';
const STEEL = '#5b7fa6';

function NLLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.4 : 1;
  const boxSize = Math.round(52 * scale);
  const titleSize = Math.round(28 * scale);
  const subtitleSize = Math.round(8.5 * scale);
  const gap = Math.round(14 * scale);

  return (
    <div className="flex items-center shrink-0" style={{ gap }}>
      {/* NL monogram box */}
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

      {/* Wordmark */}
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
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Progress value={(current / total) * 100} className="w-32 h-1.5" />
      <span>Step {current} of {total}</span>
    </div>
  );
}

function EmailWarning({ email }: { email: string }) {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (!domain || !FREE_EMAIL_DOMAINS.includes(domain)) return null;
  return (
    <p className="text-amber-600 text-sm mt-1">
      We recommend using your work email address for accurate firm identification.
    </p>
  );
}

// ─── Score display ────────────────────────────────────────────────────────────

function ScoreGauge({ score, band }: { score: number; band: string }) {
  const bandInfo = SCORE_BANDS.find(b => b.label === band) ?? SCORE_BANDS[1];
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-32 h-32 rounded-full flex flex-col items-center justify-center border-4"
        style={{ borderColor: bandInfo.colour, backgroundColor: `${bandInfo.colour}15` }}
      >
        <span className="text-4xl font-bold" style={{ color: bandInfo.colour }}>{Math.round(score)}</span>
        <span className="text-xs text-gray-500 mt-0.5">out of 100</span>
      </div>
      <Badge style={{ backgroundColor: bandInfo.colour, color: '#fff' }} className="text-sm px-3 py-1">
        {bandInfo.displayName}
      </Badge>
    </div>
  );
}

function DimensionBar({ name, letter, score }: { name: string; letter: string; score: number }) {
  const pct = Math.round(score);
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: color }}
      >
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-800 truncate">{name}</span>
          <span className="font-bold ml-2 shrink-0" style={{ color }}>{pct}</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
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

  // ── Intake validation ──────────────────────────────────────────────────────
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

  // ── Submit ─────────────────────────────────────────────────────────────────
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
        throw new Error(body.error ?? 'Submission failed. Please try again.');
      }

      const data: { submissionId: string } = await res.json();
      setSubmissionId(data.submissionId);

      // Poll for completion
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-6 py-5 border-b border-gray-100 flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <span className="text-xs text-gray-400 hidden sm:block tracking-wide uppercase">Free · UK Law Firms · No Sales Call</span>
        </header>

        {/* Gold accent bar */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #1a3a6b 0%, #B8902A 50%, #1a3a6b 100%)' }} />

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-3xl mx-auto w-full gap-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: '#1a3a6b10', color: '#1a3a6b', border: '1px solid #1a3a6b30' }}
          >
            AI Readiness Snapshot · Free · 3 minutes
          </div>

          <h1
            className="text-4xl sm:text-5xl leading-tight"
            style={{ fontFamily: 'var(--font-playfair)', color: '#1a3a6b', fontWeight: 700 }}
          >
            What AI is your firm actually using — and can you evidence control of it?
          </h1>

          <div className="w-16 h-0.5 mx-auto" style={{ backgroundColor: '#B8902A' }} />

          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
            Get your free AI Readiness Snapshot. We score your firm across our CLEAR TRUST framework — ten dimensions of AI control — and show you where the regulatory exposure lies.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
            <Button
              size="lg"
              className="text-white px-10 py-6 text-base font-semibold"
              style={{ backgroundColor: '#1a3a6b' }}
              onClick={() => setStep('intake')}
            >
              Get Your Free Snapshot →
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-2 max-w-lg w-full border-t border-gray-100 pt-8">
            {[
              { num: '01', label: '5 firm details' },
              { num: '02', label: '10 quick questions' },
              { num: '03', label: 'Personalised PDF report' },
            ].map(item => (
              <div key={item.num} className="flex flex-col items-center gap-2">
                <span className="text-xl font-bold" style={{ color: '#B8902A', fontFamily: 'var(--font-playfair)' }}>{item.num}</span>
                <span className="text-sm text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>
        </main>

        <footer className="px-6 py-5 border-t border-gray-100 text-center text-xs text-gray-400 max-w-3xl mx-auto w-full">
          This Snapshot is general information, not legal or regulatory advice. © NexterLaw ·{' '}
          <a href="https://nexterlaw.com" className="underline hover:text-gray-600">nexterlaw.com</a>
        </footer>
      </div>
    );
  }

  // ── Step: Intake form ──────────────────────────────────────────────────────
  if (step === 'intake') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <StepIndicator current={1} total={3} />
        </header>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #1a3a6b 0%, #B8902A 33%, #1a3a6b 100%)' }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Tell us about your firm</h2>
          <p className="text-gray-500 mb-8">This information personalises your AI Readiness Snapshot.</p>

          <div className="space-y-6">
            {/* Firm name */}
            <div>
              <Label htmlFor="firmName" className="text-sm font-medium text-gray-700">Firm name *</Label>
              <Input
                id="firmName"
                value={intake.firmName}
                onChange={e => setIntake(p => ({ ...p, firmName: e.target.value }))}
                placeholder="e.g. Smith & Partners LLP"
                className="mt-1"
              />
              {intakeErrors.firmName && <p className="text-red-500 text-sm mt-1">{intakeErrors.firmName}</p>}
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="firmWebsite" className="text-sm font-medium text-gray-700">Firm website *</Label>
              <Input
                id="firmWebsite"
                value={intake.firmWebsite}
                onChange={e => setIntake(p => ({ ...p, firmWebsite: e.target.value }))}
                placeholder="https://www.yourfirm.co.uk"
                className="mt-1"
              />
              {intakeErrors.firmWebsite && <p className="text-red-500 text-sm mt-1">{intakeErrors.firmWebsite}</p>}
            </div>

            {/* City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">City *</Label>
                <Input
                  id="city"
                  value={intake.city}
                  onChange={e => setIntake(p => ({ ...p, city: e.target.value }))}
                  placeholder="London"
                  className="mt-1"
                />
                {intakeErrors.city && <p className="text-red-500 text-sm mt-1">{intakeErrors.city}</p>}
              </div>
              <div>
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country *</Label>
                <Input
                  id="country"
                  value={intake.country}
                  onChange={e => setIntake(p => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. United Kingdom"
                  className="mt-1"
                />
                {intakeErrors.country && <p className="text-red-500 text-sm mt-1">{intakeErrors.country}</p>}
              </div>
            </div>

            {/* Practice types */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Practice type(s) * <span className="font-normal text-gray-400">(select all that apply)</span></Label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRACTICE_TYPES.map(pt => {
                  const checked = intake.practiceTypes.includes(pt.slug);
                  return (
                    <label
                      key={pt.slug}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        checked ? 'border-[#1a3a6b] bg-[#1a3a6b]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
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
                      <span className="text-sm text-gray-800">{pt.label}</span>
                    </label>
                  );
                })}
              </div>
              {intakeErrors.practiceTypes && <p className="text-red-500 text-sm mt-1">{intakeErrors.practiceTypes}</p>}
            </div>

            {/* Firm size */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Firm size *</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FIRM_SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntake(p => ({ ...p, firmSize: opt.value }))}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      intake.firmSize === opt.value
                        ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {intakeErrors.firmSize && <p className="text-red-500 text-sm mt-1">{intakeErrors.firmSize}</p>}
            </div>

            {/* EU facing */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Do you act for EU-based clients or handle EU-market work? *</Label>
              <div className="mt-2 flex gap-2">
                {EU_FACING_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntake(p => ({ ...p, euFacing: opt.value }))}
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      intake.euFacing === opt.value
                        ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {intakeErrors.euFacing && <p className="text-red-500 text-sm mt-1">{intakeErrors.euFacing}</p>}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="workEmail" className="text-sm font-medium text-gray-700">Work email *</Label>
              <Input
                id="workEmail"
                type="email"
                value={intake.workEmail}
                onChange={e => setIntake(p => ({ ...p, workEmail: e.target.value }))}
                placeholder="you@yourfirm.co.uk"
                className="mt-1"
              />
              <EmailWarning email={intake.workEmail} />
              {intakeErrors.workEmail && <p className="text-red-500 text-sm mt-1">{intakeErrors.workEmail}</p>}
            </div>
          </div>

          <div className="mt-10 flex gap-3">
            <Button variant="outline" onClick={() => setStep('landing')} className="flex-1">
              ← Back
            </Button>
            <Button
              className="flex-1 bg-[#1a3a6b] hover:bg-[#152f58] text-white"
              onClick={() => {
                if (validateIntake()) setStep('selfAssessment');
              }}
            >
              Continue →
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ── Step: Self-assessment ──────────────────────────────────────────────────
  if (step === 'selfAssessment') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <StepIndicator current={2} total={3} />
        </header>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #1a3a6b 0%, #B8902A 66%, #1a3a6b 100%)' }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Ten quick questions</h2>
          <p className="text-gray-500 mb-2">
            These answers drive your personalised CLEAR TRUST score.
          </p>
          <div className="mb-8 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              💡 Most firms answer <strong>No</strong> or <strong>Not sure</strong> to several of these — that is exactly why the Snapshot exists.
            </p>
          </div>

          <div className="space-y-5">
            {CLEAR_TRUST_DIMENSIONS.map((dim, i) => {
              const answer = answers[dim.key];
              return (
                <div key={dim.key} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-7 h-7 rounded bg-[#1a3a6b] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                      {dim.letter}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1a3a6b] uppercase tracking-wide">{dim.name} · Q{i + 1}</p>
                      <p className="text-sm text-gray-800 mt-0.5">{dim.question}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-10">
                    {SELF_ASSESSMENT_ANSWERS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswers(p => ({ ...p, [dim.key]: opt.value as SelfAssessmentAnswer }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          answer === opt.value
                            ? opt.value === 'YES'
                              ? 'border-green-500 bg-green-50 text-green-800'
                              : opt.value === 'NO'
                              ? 'border-red-400 bg-red-50 text-red-800'
                              : 'border-amber-400 bg-amber-50 text-amber-800'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex gap-3">
            <Button variant="outline" onClick={() => setStep('intake')} className="flex-1">
              ← Back
            </Button>
            <Button
              className="flex-1 bg-[#1a3a6b] hover:bg-[#152f58] text-white disabled:opacity-50"
              disabled={!allAnswered}
              onClick={() => setStep('consent')}
            >
              Continue →
            </Button>
          </div>
          {!allAnswered && (
            <p className="text-center text-sm text-gray-400 mt-3">Please answer all questions to continue.</p>
          )}
        </main>
      </div>
    );
  }

  // ── Step: Consent ──────────────────────────────────────────────────────────
  if (step === 'consent') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center max-w-6xl mx-auto w-full">
          <NLLogo />
          <StepIndicator current={3} total={3} />
        </header>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #B8902A 0%, #1a3a6b 100%)' }} />

        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full flex flex-col justify-center">
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost there</h2>
            <p className="text-gray-600 mb-6">Your personalised Snapshot is ready to generate. Please read and confirm the following before we proceed.</p>

            <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-700 leading-relaxed mb-6">
              <p className="font-semibold text-gray-900 mb-2">Important Notice</p>
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
              <span className="text-sm text-gray-700">
                I understand this Snapshot is general information, not legal or regulatory advice, and I consent to NexterLaw contacting me about the results.{' '}
                <a href="#" className="text-[#1a3a6b] underline">Privacy notice</a>.
              </span>
            </label>

            {submitError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <Button variant="outline" onClick={() => setStep('selfAssessment')} className="flex-1">
                ← Back
              </Button>
              <Button
                className="flex-1 bg-[#1a3a6b] hover:bg-[#152f58] text-white disabled:opacity-50"
                disabled={!consent}
                onClick={handleSubmit}
              >
                Generate My Snapshot →
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Step: Processing ───────────────────────────────────────────────────────
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
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-center">
          <NLLogo />
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #1a3a6b 0%, #B8902A 50%, #1a3a6b 100%)' }} />

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg">

            {/* Spinner + headline */}
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#B8902A18' }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#B8902A', borderTopColor: 'transparent' }}
                />
              </div>
              <div>
                <p
                  className="font-bold text-lg leading-tight"
                  style={{ color: '#1a3a6b', fontFamily: 'var(--font-playfair)' }}
                >
                  Building your AI Readiness Snapshot
                </p>
                <p className="text-sm text-gray-400 mt-0.5">{stage.label}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-px bg-gray-100" />
              <span
                className="text-[10px] uppercase tracking-[0.25em] font-semibold"
                style={{ color: '#B8902A' }}
              >
                CLEAR TRUST Framework
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* CLEAR TRUST letter grid — 2 columns */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8">
              {clearTrust.map((dim, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  style={{
                    opacity: 0,
                    animation: 'fadeInUp 0.45s ease forwards',
                    animationDelay: `${i * 0.28}s`,
                  }}
                >
                  {/* Letter badge */}
                  <div
                    className="w-9 h-9 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: '#1a3a6b' }}
                  >
                    <span
                      style={{
                        color: '#fff',
                        fontFamily: 'var(--font-playfair)',
                        fontWeight: 700,
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      {dim.letter}
                    </span>
                  </div>
                  {/* = word */}
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-sm font-bold shrink-0" style={{ color: '#B8902A' }}>=</span>
                    <span className="text-sm text-gray-700 truncate">{dim.word}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <Progress value={pollProgress} className="h-1" />
            <p className="text-xs text-gray-400 mt-2 text-center">This takes around 30–60 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Result ───────────────────────────────────────────────────────────
  if (step === 'result' && reportData) {
    const scores = reportData.scores as ClearTrustScores;
    const report = reportData.report as GeneratedReportContent;

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
          <NLLogo />
          <div className="flex gap-2">
            {reportData.pdfUrl && (
              <a
                href={reportData.pdfUrl}
                download
                className={buttonVariants({ size: 'sm' })}
                style={{ backgroundColor: '#B8902A', color: '#fff' }}
              >
                Download PDF
              </a>
            )}
          </div>
        </header>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #1a3a6b 0%, #B8902A 50%, #1a3a6b 100%)' }} />

        <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">

          {/* Score */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#B8902A' }}>
              CLEAR TRUST Score · {intake.firmName}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <ScoreGauge score={scores.headline} band={scores.band} />
              <div className="flex-1 w-full space-y-3">
                {scores.dimensions.map(d => (
                  <DimensionBar key={d.key} name={d.name} letter={d.letter} score={d.score} />
                ))}
              </div>
            </div>
            {report?.scoreNarrative && (
              <p className="mt-6 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-4">{report.scoreNarrative}</p>
            )}
          </section>

          {/* Regulatory map */}
          {report?.regulatoryMap && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Your Regulatory Pressure Map</h2>
              <div className="space-y-4">
                {report.regulatoryMap.sra && (
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">SRA Expectations</p>
                    <p className="text-sm text-gray-800">{report.regulatoryMap.sra}</p>
                  </div>
                )}
                {report.regulatoryMap.ukGdpr && (
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">UK GDPR / ICO</p>
                    <p className="text-sm text-gray-800">{report.regulatoryMap.ukGdpr}</p>
                  </div>
                )}
                {report.regulatoryMap.pii && (
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Professional Indemnity Insurance</p>
                    <p className="text-sm text-gray-800">{report.regulatoryMap.pii}</p>
                  </div>
                )}
                {report.regulatoryMap.clientProcurement && (
                  <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Client Procurement Pressure</p>
                    <p className="text-sm text-gray-800">{report.regulatoryMap.clientProcurement}</p>
                  </div>
                )}
                {report.regulatoryMap.euAiAct && (
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">EU AI Act (Conditional)</p>
                    <p className="text-sm text-gray-800">{report.regulatoryMap.euAiAct}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Shadow AI */}
          {report?.shadowAi && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>Shadow AI: The Question Most Firms Cannot Answer</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{report.shadowAi}</p>
            </section>
          )}

          {/* Opportunities */}
          {report?.opportunities?.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Top 3 AI Opportunities for Your Practice</h2>
              <div className="space-y-4">
                {report.opportunities.slice(0, 3).map((opp, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-green-50/50 rounded-xl border border-green-100">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{opp.title}</p>
                      <p className="text-sm text-gray-700 mt-1">{opp.benefit}</p>
                      {opp.toolCategory && <p className="text-xs text-gray-500 mt-1 italic">e.g. {opp.toolCategory}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Exposures */}
          {report?.exposures?.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Top 3 Exposure Areas</h2>
              <div className="space-y-4">
                {report.exposures.slice(0, 3).map((exp, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-red-50/50 rounded-xl border border-red-100">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white ${exp.severity === 'HIGH' ? 'bg-red-500' : exp.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-gray-400'}`}>{i + 1}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm">{exp.title}</p>
                        <Badge variant="outline" className={`text-xs ${exp.severity === 'HIGH' ? 'border-red-300 text-red-700' : exp.severity === 'MEDIUM' ? 'border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600'}`}>{exp.severity}</Badge>
                      </div>
                      <p className="text-sm text-gray-700">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upsell */}
          <section className="rounded-2xl p-8 text-white" style={{ backgroundColor: '#1a3a6b' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#B8902A' }}>
              What We Deliberately Left Out
            </p>
            <h2
              className="text-2xl font-bold mb-3"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Ready for the full picture?
            </h2>
            {report?.upsell && <p className="text-blue-100 text-sm mb-6 leading-relaxed">{report.upsell}</p>}
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-blue-100 mb-8">
              {['Staff-level shadow-use inventory', 'Written AI policy', 'Remediation plan', 'Vendor comparison with compliance status', 'Partner briefing pack'].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <span style={{ color: '#B8902A' }}>→</span> {item}
                </div>
              ))}
            </div>
            <a
              href="https://calendly.com/i-review-info/chat"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: 'lg' })}
              style={{ backgroundColor: '#B8902A', color: '#fff', fontWeight: 600 }}
            >
              Book Your Full Audit →
            </a>
          </section>

          <p className="text-center text-xs text-gray-400 pb-6">
            CLEAR TRUST is a proprietary framework by Dr. Siamak Goudarzi / NexterLaw. This Snapshot is general information, not legal or regulatory advice. © NexterLaw
          </p>
        </main>
      </div>
    );
  }

  return null;
}
