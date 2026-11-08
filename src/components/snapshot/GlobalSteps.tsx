'use client';

import { useState } from 'react';
import { SELF_ASSESSMENT_ANSWERS, type DimensionKey } from '@/lib/constants';
import { GLOBAL_COUNTRIES, COUNTRIES_WITH_REGIONS, GLOBAL_PRACTICE_AREAS, GLOBAL_FIRM_SIZE_OPTIONS } from '@/lib/global-jurisdictions';
import { EMAIL_RE, isLikelyWebsite } from '@/lib/validation';
import { privacyHref, SITE } from '@/config/site';
import type { GlobalContactInfo, GlobalCurrentAiUse, GlobalFirmProfile, GlobalJurisdictionInfo, SelfAssessmentAnswer } from '@/types';
import { StepShell, StepHeading, Card, ChoiceButton, NavButtons, FieldError, FieldLabel, Notice } from './ui';
import { TextField, CheckTile, ConsentBox, EmailWarning } from './fields';
import { ANSWER_STYLE, GOLD, R_BODY, R_BORDER, R_CREAM, R_INPUT } from './theme';
import type { Consent } from './UkDetails';

// Universal wording from the NexterLaw Global Snapshot spec (unchanged from the live app).
export const GLOBAL_QUESTION_OVERRIDES: Partial<Record<DimensionKey, string>> = {
  compliance: "Can you demonstrate compliance with your jurisdiction's legal requirements for AI use?",
  literacy: 'Does your team have training on AI capabilities and limitations?',
  explainability: 'Can you explain how AI assisted a legal decision (to a client or court)?',
  accountability: 'Is there a designated person responsible for AI oversight?',
  rights: 'Do you have processes to respect client data rights (deletion, opt-out, etc.)?',
  transparency: 'Do you disclose AI use to clients?',
  reliability: 'Do you test AI outputs before using them in client work?',
  usageGovernance: 'Do you have a written policy on which AI tools are permitted?',
  security: 'Do you have data security and confidentiality controls for AI?',
  traceability: 'Can you audit which AI was used on a given matter?',
};

const selectStyle: React.CSSProperties = {
  border: `1px solid ${R_BORDER}`, borderRadius: 2, backgroundColor: R_INPUT, color: R_CREAM, padding: '10px 12px', fontSize: '0.875rem', width: '100%',
};

export const EMPTY_GLOBAL_JURISDICTION: GlobalJurisdictionInfo = { country: '', stateProvince: '', secondaryStates: [], regulatoryBody: '', secondaryJurisdiction: '' };
export const EMPTY_GLOBAL_CONTACT: GlobalContactInfo = { contactName: '', firmName: '', firmWebsite: '', workEmail: '', phone: '' };
export const EMPTY_GLOBAL_PROFILE: GlobalFirmProfile = { firmSize: '', primaryPracticeArea: '', primaryPracticeAreaOther: '', secondaryPracticeAreas: [] };
export const EMPTY_GLOBAL_AI_USE: GlobalCurrentAiUse = { currentlyUsingAi: '', aiToolsInUse: '', hasAiPolicy: '', clientsAskedAboutAi: '' };
export interface GlobalContext { biggestConcern: string; whatWouldHelpMost: string }
export const EMPTY_GLOBAL_CONTEXT: GlobalContext = { biggestConcern: '', whatWouldHelpMost: '' };

type Step = { current: number; total: number };

// ── Jurisdiction ───────────────────────────────────────────────────────────────

export function GlobalJurisdiction({ value, onChange, onBack, onNext, step }: {
  value: GlobalJurisdictionInfo; onChange: (v: GlobalJurisdictionInfo) => void; onBack: () => void; onNext: () => void; step: Step;
}) {
  const regions = COUNTRIES_WITH_REGIONS[value.country];
  const needsRegulator = !!value.country && !regions;
  const canContinue = !!value.country && (regions ? !!value.stateProvince : !!value.regulatoryBody.trim());
  const regionWord = value.country === 'United States' ? 'state' : value.country === 'Canada' ? 'province' : 'state/territory';

  return (
    <StepShell step={step} gradientAt={15}>
      <StepHeading eyebrow={`Global Snapshot · Step ${step.current} of ${step.total}`} title="Which jurisdiction is your firm in?" intro="This decides which regulatory framework your report covers." />
      <Card className="space-y-6">
        <div>
          <FieldLabel htmlFor="country" required>Country</FieldLabel>
          <select id="country" value={value.country} onChange={e => onChange({ ...EMPTY_GLOBAL_JURISDICTION, country: e.target.value })} style={selectStyle} aria-required>
            <option value="">Select a country…</option>
            {GLOBAL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {regions && (
          <div>
            <FieldLabel htmlFor="stateProvince" required>Which {regionWord} is your primary licence?</FieldLabel>
            <select id="stateProvince" value={value.stateProvince} onChange={e => onChange({ ...value, stateProvince: e.target.value })} style={selectStyle} aria-required>
              <option value="">Select…</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
        {needsRegulator && (
          <>
            <TextField id="regulatoryBody" label="What is your primary regulatory body or bar association?" required value={value.regulatoryBody}
              onChange={v => onChange({ ...value, regulatoryBody: v })} placeholder="e.g. Law Society of Hong Kong" />
            <TextField id="secondaryJurisdiction" label="Secondary jurisdiction" optional value={value.secondaryJurisdiction}
              onChange={v => onChange({ ...value, secondaryJurisdiction: v })} placeholder="e.g. Also licensed in England" />
          </>
        )}
      </Card>
      <NavButtons onBack={onBack} onNext={() => canContinue && onNext()} nextDisabled={!canContinue}
        hint={canContinue ? null : 'Choose your country to continue.'} />
    </StepShell>
  );
}

// ── Current AI use ─────────────────────────────────────────────────────────────

function Tri({ id, label, value, onChange }: { id: string; label: string; value: SelfAssessmentAnswer | ''; onChange: (v: SelfAssessmentAnswer) => void }) {
  return (
    <div>
      <FieldLabel id={id} required>{label}</FieldLabel>
      <div role="radiogroup" aria-labelledby={id} className="flex gap-2">
        {SELF_ASSESSMENT_ANSWERS.map(o => (
          <ChoiceButton key={o.value} selected={value === o.value} onSelect={() => onChange(o.value as SelfAssessmentAnswer)} selectedStyle={ANSWER_STYLE[o.value]} className="flex-1">
            {o.label}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}

export function GlobalAiUse({ value, onChange, onBack, onNext, step }: {
  value: GlobalCurrentAiUse; onChange: (v: GlobalCurrentAiUse) => void; onBack: () => void; onNext: () => void; step: Step;
}) {
  const canContinue = !!value.currentlyUsingAi && !!value.hasAiPolicy && !!value.clientsAskedAboutAi;
  return (
    <StepShell step={step} gradientAt={70}>
      <StepHeading eyebrow={`Global Snapshot · Step ${step.current} of ${step.total}`} title="Your current AI use" intro="A quick picture of where things stand today." />
      <Card className="space-y-6">
        <Tri id="ai-using" label="Are you currently using AI tools in your practice?" value={value.currentlyUsingAi} onChange={v => onChange({ ...value, currentlyUsingAi: v })} />
        {value.currentlyUsingAi === 'YES' && (
          <div>
            <FieldLabel htmlFor="aiTools" optional>Which tools?</FieldLabel>
            <textarea id="aiTools" value={value.aiToolsInUse} onChange={e => onChange({ ...value, aiToolsInUse: e.target.value })}
              placeholder="e.g. ChatGPT, Claude, Westlaw AI, LexisNexis+" rows={2} className="w-full text-sm p-3"
              style={{ border: `1px solid ${R_BORDER}`, borderRadius: 2, backgroundColor: R_INPUT, color: R_CREAM }} />
          </div>
        )}
        <Tri id="ai-policy" label="Do you have a formal AI policy?" value={value.hasAiPolicy} onChange={v => onChange({ ...value, hasAiPolicy: v })} />
        <Tri id="ai-clients" label="Have clients asked about your AI use?" value={value.clientsAskedAboutAi} onChange={v => onChange({ ...value, clientsAskedAboutAi: v })} />
      </Card>
      <NavButtons onBack={onBack} onNext={() => canContinue && onNext()} nextDisabled={!canContinue}
        hint={canContinue ? null : 'Please answer all three.'} />
    </StepShell>
  );
}

// ── Details, context and consent ───────────────────────────────────────────────

type DetailErrors = Partial<Record<'contactName' | 'firmName' | 'workEmail' | 'firmWebsite' | 'firmSize' | 'primaryPracticeArea' | 'primaryPracticeAreaOther' | 'adviceConsent', string>>;

export function validateGlobalDetails(c: GlobalContactInfo, p: GlobalFirmProfile, adviceConsent: boolean): DetailErrors {
  const e: DetailErrors = {};
  if (!c.contactName.trim()) e.contactName = 'Please enter your name.';
  if (!c.firmName.trim()) e.firmName = 'Please enter your firm’s name.';
  if (!c.workEmail.trim()) e.workEmail = 'Please enter your email.';
  else if (!EMAIL_RE.test(c.workEmail.trim())) e.workEmail = 'Please enter a valid email address.';
  if (c.firmWebsite.trim() && !isLikelyWebsite(c.firmWebsite)) e.firmWebsite = 'Please enter a valid website.';
  if (!p.firmSize) e.firmSize = 'Please choose your firm size.';
  if (!p.primaryPracticeArea) e.primaryPracticeArea = 'Please choose your main practice area.';
  if (p.primaryPracticeArea === 'other' && !p.primaryPracticeAreaOther.trim()) e.primaryPracticeAreaOther = 'Please describe your practice area.';
  if (!adviceConsent) e.adviceConsent = 'Please confirm you understand this is general information, not advice.';
  return e;
}

export function GlobalDetails({ contact, onContact, profile, onProfile, context, onContext, consent, onConsent, onBack, onSubmit, submitting, submitError, step }: {
  contact: GlobalContactInfo; onContact: (v: GlobalContactInfo) => void;
  profile: GlobalFirmProfile; onProfile: (v: GlobalFirmProfile) => void;
  context: GlobalContext; onContext: (v: GlobalContext) => void;
  consent: Consent; onConsent: (c: Consent) => void;
  onBack: () => void; onSubmit: () => void; submitting: boolean; submitError: string | null; step: Step;
}) {
  const [attempted, setAttempted] = useState(false);
  const errors = attempted ? validateGlobalDetails(contact, profile, consent.advice) : {};
  const submit = () => {
    setAttempted(true);
    const errs = validateGlobalDetails(contact, profile, consent.advice);
    if (Object.keys(errs).length === 0) onSubmit();
    else document.getElementById(Object.keys(errs)[0] === 'adviceConsent' ? 'g-consent-advice' : Object.keys(errs)[0])?.focus();
  };
  const textareaStyle = { border: `1px solid ${R_BORDER}`, borderRadius: 2, backgroundColor: R_INPUT, color: R_CREAM };

  return (
    <StepShell step={step} gradientAt={90}>
      <StepHeading eyebrow={`Global Snapshot · Step ${step.current} of ${step.total}`} title="About you and your firm" intro="We use this to prepare your report and send it to you." />
      <Card className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField id="contactName" label="Your name" required value={contact.contactName} onChange={v => onContact({ ...contact, contactName: v })} error={errors.contactName} autoComplete="name" />
          <TextField id="firmName" label="Firm name" required value={contact.firmName} onChange={v => onContact({ ...contact, firmName: v })} error={errors.firmName} autoComplete="organization" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField id="firmWebsite" label="Firm website" optional value={contact.firmWebsite} onChange={v => onContact({ ...contact, firmWebsite: v })} error={errors.firmWebsite} placeholder="www.yourfirm.com" autoComplete="url" />
          <TextField id="phone" label="Phone" optional type="tel" value={contact.phone} onChange={v => onContact({ ...contact, phone: v })} autoComplete="tel" />
        </div>
        <TextField id="workEmail" type="email" label="Email address (where we send your report)" required value={contact.workEmail}
          onChange={v => onContact({ ...contact, workEmail: v })} error={errors.workEmail} autoComplete="email">
          <EmailWarning email={contact.workEmail} />
        </TextField>

        <div className="h-px" style={{ backgroundColor: R_BORDER }} />

        <div>
          <FieldLabel id="g-size-label" required>Firm size</FieldLabel>
          <div id="firmSize" tabIndex={-1} role="radiogroup" aria-labelledby="g-size-label" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GLOBAL_FIRM_SIZE_OPTIONS.map(o => (
              <ChoiceButton key={o.value} selected={profile.firmSize === o.value} onSelect={() => onProfile({ ...profile, firmSize: o.value })}>{o.label}</ChoiceButton>
            ))}
          </div>
          <FieldError id="firmSize-error" message={errors.firmSize} />
        </div>

        <div>
          <FieldLabel htmlFor="primaryPracticeArea" required>Main practice area</FieldLabel>
          <select id="primaryPracticeArea" value={profile.primaryPracticeArea} style={selectStyle}
            onChange={e => onProfile({ ...profile, primaryPracticeArea: e.target.value, secondaryPracticeAreas: profile.secondaryPracticeAreas.filter(s => s !== e.target.value) })}>
            <option value="">Select…</option>
            {GLOBAL_PRACTICE_AREAS.map(pa => <option key={pa.slug} value={pa.slug}>{pa.label}</option>)}
          </select>
          <FieldError id="primaryPracticeArea-error" message={errors.primaryPracticeArea} />
          {profile.primaryPracticeArea === 'other' && (
            <TextField id="primaryPracticeAreaOther" label="Please specify" required value={profile.primaryPracticeAreaOther}
              onChange={v => onProfile({ ...profile, primaryPracticeAreaOther: v })} error={errors.primaryPracticeAreaOther} />
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-semibold mb-2" style={{ color: R_CREAM }}>Other practice areas <span className="font-normal text-xs" style={{ color: R_BODY }}>(optional)</span></legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GLOBAL_PRACTICE_AREAS.filter(pa => pa.slug !== profile.primaryPracticeArea).map(pa => {
              const checked = profile.secondaryPracticeAreas.includes(pa.slug);
              return (
                <CheckTile key={pa.slug} checked={checked} onToggle={() => onProfile({
                  ...profile,
                  secondaryPracticeAreas: checked ? profile.secondaryPracticeAreas.filter(s => s !== pa.slug) : [...profile.secondaryPracticeAreas, pa.slug],
                })}>{pa.label}</CheckTile>
              );
            })}
          </div>
        </fieldset>

        <div className="h-px" style={{ backgroundColor: R_BORDER }} />

        <div>
          <FieldLabel htmlFor="biggestConcern" optional>What is your biggest concern about AI in law?</FieldLabel>
          <textarea id="biggestConcern" value={context.biggestConcern} onChange={e => onContext({ ...context, biggestConcern: e.target.value })} rows={3} className="w-full text-sm p-3" style={textareaStyle} />
        </div>
        <div>
          <FieldLabel htmlFor="whatWouldHelpMost" optional>What would help most right now?</FieldLabel>
          <textarea id="whatWouldHelpMost" value={context.whatWouldHelpMost} onChange={e => onContext({ ...context, whatWouldHelpMost: e.target.value })} rows={3} className="w-full text-sm p-3" style={textareaStyle} />
        </div>

        <Notice>
          <p className="font-semibold mb-1.5" style={{ color: GOLD }}>How your report is prepared</p>
          <p style={{ color: R_BODY }}>
            You&apos;ll see your instant CLEAR TRUST score straight away. Your full report isn&apos;t generated automatically: our team researches the regulations,
            bar guidance and data-protection rules for your jurisdiction and reviews every report before it is sent
            {SITE.global.waitlist ? ', as soon as a slot opens.' : `, within about ${SITE.global.turnaroundHours} hours.`} This is general information only, not legal or regulatory advice.
          </p>
        </Notice>

        <div className="space-y-4">
          <ConsentBox id="g-consent-advice" checked={consent.advice} onChange={v => onConsent({ ...consent, advice: v })} error={errors.adviceConsent}>
            I understand this Snapshot is general information, not legal or regulatory advice. <span style={{ color: GOLD }} aria-hidden="true">*</span>
          </ConsentBox>
          <ConsentBox id="g-consent-marketing" checked={consent.marketing} onChange={v => onConsent({ ...consent, marketing: v })}>
            Contact me about my results and related services (optional).{' '}
            <a href={privacyHref()} target="_blank" rel="noreferrer" className="underline" style={{ color: GOLD }}>Privacy notice</a>
          </ConsentBox>
        </div>

        {submitError && <Notice tone="error">{submitError}</Notice>}
      </Card>
      <NavButtons onBack={onBack} onNext={submit} nextLabel={submitting ? 'Sending…' : 'Submit my assessment →'} nextDisabled={submitting} />
    </StepShell>
  );
}
