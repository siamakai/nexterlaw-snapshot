'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DimensionKey } from '@/lib/constants';
import type { SelfAssessmentAnswer, SelfAssessmentAnswers } from '@/types';
import { EMPTY_INTAKE_ANSWERS, type IntakeAnswers } from '@/lib/intake';
import { EMPTY_UK_DETAILS, type UkDetails as UkDetailsData } from '@/lib/details-validation';
import { track } from '@/lib/analytics';
import { Landing } from './Landing';
import { PathChoice } from './PathChoice';
import { Questions } from './Questions';
import { IntakeQuestions } from './IntakeQuestions';
import { UkDetails, type Consent } from './UkDetails';
import {
  GlobalJurisdiction, GlobalAiUse, GlobalDetails, GLOBAL_QUESTION_OVERRIDES,
  EMPTY_GLOBAL_JURISDICTION, EMPTY_GLOBAL_CONTACT, EMPTY_GLOBAL_PROFILE, EMPTY_GLOBAL_AI_USE, EMPTY_GLOBAL_CONTEXT, type GlobalContext,
} from './GlobalSteps';
import { StepShell } from './ui';
import { GOLD, R_CREAM } from './theme';

type Step =
  | 'landing' | 'path'
  | 'ukQuestions' | 'ukIntake' | 'ukDetails'
  | 'gJurisdiction' | 'gQuestions' | 'gIntake' | 'gAiUse' | 'gDetails'
  | 'redirecting';

const EMPTY_ANSWERS: SelfAssessmentAnswers = {
  compliance: '', literacy: '', explainability: '', accountability: '', rights: '',
  transparency: '', reliability: '', usageGovernance: '', security: '', traceability: '',
};
const NO_CONSENT: Consent = { advice: false, marketing: false };

async function postJson(url: string, body: unknown): Promise<{ resultToken?: string; error?: string }> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (res.status === 429) throw new Error('Too many attempts from your connection. Please wait a few minutes and try again.');
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Something went wrong. Please try again.');
  return json as { resultToken?: string };
}

export function SnapshotFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('landing');

  const [answers, setAnswers] = useState<SelfAssessmentAnswers>(EMPTY_ANSWERS);
  const [intake, setIntake] = useState<IntakeAnswers>(EMPTY_INTAKE_ANSWERS);
  const [consent, setConsent] = useState<Consent>(NO_CONSENT);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [uk, setUk] = useState<UkDetailsData>(EMPTY_UK_DETAILS);
  const [gJur, setGJur] = useState(EMPTY_GLOBAL_JURISDICTION);
  const [gContact, setGContact] = useState(EMPTY_GLOBAL_CONTACT);
  const [gProfile, setGProfile] = useState(EMPTY_GLOBAL_PROFILE);
  const [gAiUse, setGAiUse] = useState(EMPTY_GLOBAL_AI_USE);
  const [gContext, setGContext] = useState<GlobalContext>(EMPTY_GLOBAL_CONTEXT);

  // Each step starts at the top, and focus moves to the page for screen readers.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.getElementById('main')?.focus?.();
  }, [step]);

  const onAnswer = (k: DimensionKey, v: SelfAssessmentAnswer) => setAnswers(a => ({ ...a, [k]: v }));
  const onIntake = (k: keyof IntakeAnswers, v: string) => setIntake(a => ({ ...a, [k]: v }));

  const submitUk = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { resultToken } = await postJson('/api/submit', { selfAssessment: answers, intakeAnswers: intake, details: uk, consent });
      track('details_submitted', { path: 'uk', size: uk.firmSize });
      setStep('redirecting');
      router.push(`/r/${resultToken}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  const submitGlobal = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { resultToken } = await postJson('/api/submit-global', {
        contact: gContact, jurisdiction: gJur, firmProfile: gProfile, currentAiUse: gAiUse,
        selfAssessment: answers, intakeAnswers: intake, additionalContext: gContext, consent,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      track('details_submitted', { path: 'global', size: gProfile.firmSize });
      setStep('redirecting');
      router.push(`/r/${resultToken}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  switch (step) {
    case 'landing':
      return <Landing onStart={() => setStep('path')} />;
    case 'path':
      return <PathChoice onUk={() => setStep('ukQuestions')} onGlobal={() => setStep('gJurisdiction')} onBack={() => setStep('landing')} />;

    // ── UK ──
    case 'ukQuestions':
      return <Questions answers={answers} onAnswer={onAnswer} eyebrow="Step 01 of 03" step={{ current: 1, total: 3 }}
        onBack={() => setStep('path')} onNext={() => setStep('ukIntake')} />;
    case 'ukIntake':
      return <IntakeQuestions answers={intake} onChange={onIntake} eyebrow="Step 02 of 03" step={{ current: 2, total: 3 }}
        onBack={() => setStep('ukQuestions')} onNext={() => setStep('ukDetails')} />;
    case 'ukDetails':
      return <UkDetails details={uk} onChange={setUk} consent={consent} onConsent={setConsent} step={{ current: 3, total: 3 }}
        onBack={() => setStep('ukIntake')} onSubmit={submitUk} submitting={submitting} submitError={submitError} />;

    // ── Global ──
    case 'gJurisdiction':
      return <GlobalJurisdiction value={gJur} onChange={setGJur} step={{ current: 1, total: 5 }}
        onBack={() => setStep('path')} onNext={() => setStep('gQuestions')} />;
    case 'gQuestions':
      return <Questions answers={answers} onAnswer={onAnswer} eyebrow="Global Snapshot · Step 2 of 5" step={{ current: 2, total: 5 }}
        questionOverrides={GLOBAL_QUESTION_OVERRIDES} intro="The same universal CLEAR TRUST framework, used for every jurisdiction."
        onBack={() => setStep('gJurisdiction')} onNext={() => setStep('gIntake')} />;
    case 'gIntake':
      return <IntakeQuestions answers={intake} onChange={onIntake} eyebrow="Global Snapshot · Step 3 of 5" step={{ current: 3, total: 5 }}
        onBack={() => setStep('gQuestions')} onNext={() => setStep('gAiUse')} />;
    case 'gAiUse':
      return <GlobalAiUse value={gAiUse} onChange={setGAiUse} step={{ current: 4, total: 5 }}
        onBack={() => setStep('gIntake')} onNext={() => setStep('gDetails')} />;
    case 'gDetails':
      return <GlobalDetails contact={gContact} onContact={setGContact} profile={gProfile} onProfile={setGProfile}
        context={gContext} onContext={setGContext} consent={consent} onConsent={setConsent} step={{ current: 5, total: 5 }}
        onBack={() => setStep('gAiUse')} onSubmit={submitGlobal} submitting={submitting} submitError={submitError} />;

    case 'redirecting':
      return (
        <StepShell>
          <div className="flex flex-col items-center justify-center py-24" role="status">
            <div className="w-5 h-5 rounded-full border-2 animate-spin mb-4" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
            <p style={{ color: R_CREAM }}>Opening your results…</p>
          </div>
        </StepShell>
      );
  }
}
