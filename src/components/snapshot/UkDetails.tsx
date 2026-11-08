'use client';

import { useState } from 'react';
import type React from 'react';
import { PRACTICE_TYPES, FIRM_SIZE_OPTIONS, EU_FACING_OPTIONS } from '@/lib/constants';
import { validateUkDetails, type UkDetails as Details, type UkDetailsErrors } from '@/lib/details-validation';
import { privacyHref } from '@/config/site';
import { StepShell, StepHeading, Card, ChoiceButton, NavButtons, FieldError, FieldLabel, Notice } from './ui';
import { TextField, CheckTile, ConsentBox, EmailWarning } from './fields';
import { GOLD, R_BODY, R_BORDER } from './theme';

export interface Consent { advice: boolean; marketing: boolean }

export function UkDetails({ details, onChange, consent, onConsent, onBack, onSubmit, submitting, submitError, step }: {
  details: Details;
  onChange: React.Dispatch<React.SetStateAction<Details>>;
  consent: Consent;
  onConsent: (c: Consent) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
  step: { current: number; total: number };
}) {
  const [attempted, setAttempted] = useState(false);
  // Errors only appear after the first "Generate" press, then update live so they clear as soon as a field is fixed.
  const errors: UkDetailsErrors = attempted ? validateUkDetails(details, consent.advice) : {};
  // Functional update, so quick successive changes never overwrite each other.
  const set = <K extends keyof Details>(key: K, value: Details[K]) => onChange(d => ({ ...d, [key]: value }));

  const submit = () => {
    setAttempted(true);
    const errs = validateUkDetails(details, consent.advice);
    if (Object.keys(errs).length === 0) onSubmit();
    else document.getElementById(Object.keys(errs)[0] === 'adviceConsent' ? 'consent-advice' : Object.keys(errs)[0])?.focus();
  };

  return (
    <StepShell step={step} gradientAt={80}>
      <StepHeading eyebrow="Last step" title="About your firm" intro="So we can personalise your report and send it to you." />

      <Card className="space-y-6">
        <TextField id="firmName" label="Firm name" required value={details.firmName} onChange={v => set('firmName', v)}
          error={errors.firmName} placeholder="e.g. Smith & Partners LLP" autoComplete="organization" />

        <TextField id="firmWebsite" label="Firm website" optional value={details.firmWebsite} onChange={v => set('firmWebsite', v)}
          error={errors.firmWebsite} placeholder="www.yourfirm.co.uk" autoComplete="url" />

        <div className="h-px" style={{ backgroundColor: R_BORDER }} />

        <fieldset>
          <legend className="text-sm font-semibold mb-0.5" style={{ color: '#ede8e0' }}>
            Practice area(s) <span style={{ color: GOLD }} aria-hidden="true">*</span>{' '}
            <span className="font-normal text-xs" style={{ color: R_BODY }}>(select all that apply)</span>
          </legend>
          <div id="practiceTypes" tabIndex={-1} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2" aria-describedby="practiceTypes-error">
            {PRACTICE_TYPES.map(pt => {
              const checked = details.practiceTypes.includes(pt.slug);
              return (
                <CheckTile key={pt.slug} checked={checked}
                  onToggle={() => onChange(d => ({
                    ...d,
                    practiceTypes: d.practiceTypes.includes(pt.slug) ? d.practiceTypes.filter(s => s !== pt.slug) : [...d.practiceTypes, pt.slug],
                  }))}>
                  {pt.label}
                </CheckTile>
              );
            })}
          </div>
          <FieldError id="practiceTypes-error" message={errors.practiceTypes} />
        </fieldset>

        <div>
          <FieldLabel id="firmSize-label" required>Firm size</FieldLabel>
          <div id="firmSize" tabIndex={-1} role="radiogroup" aria-labelledby="firmSize-label" aria-describedby="firmSize-error" className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FIRM_SIZE_OPTIONS.map(opt => (
              <ChoiceButton key={opt.value} selected={details.firmSize === opt.value} onSelect={() => set('firmSize', opt.value)}>{opt.label}</ChoiceButton>
            ))}
          </div>
          <FieldError id="firmSize-error" message={errors.firmSize} />
        </div>

        <div>
          <FieldLabel id="euFacing-label" required>Do you act for EU-based clients or handle EU-market work?</FieldLabel>
          <div id="euFacing" tabIndex={-1} role="radiogroup" aria-labelledby="euFacing-label" aria-describedby="euFacing-error" className="mt-2 flex gap-2">
            {EU_FACING_OPTIONS.map(opt => (
              <ChoiceButton key={opt.value} selected={details.euFacing === opt.value} onSelect={() => set('euFacing', opt.value)} className="flex-1">{opt.label}</ChoiceButton>
            ))}
          </div>
          <FieldError id="euFacing-error" message={errors.euFacing} />
        </div>

        <div className="h-px" style={{ backgroundColor: R_BORDER }} />

        <TextField id="workEmail" type="email" label="Work email" required value={details.workEmail} onChange={v => set('workEmail', v)}
          error={errors.workEmail} placeholder="you@yourfirm.co.uk" autoComplete="email">
          <EmailWarning email={details.workEmail} />
        </TextField>

        <div className="h-px" style={{ backgroundColor: R_BORDER }} />

        <div className="space-y-4">
          <ConsentBox id="consent-advice" checked={consent.advice} onChange={v => onConsent({ ...consent, advice: v })} error={errors.adviceConsent}>
            I understand this Snapshot is general information, not legal or regulatory advice. <span style={{ color: GOLD }} aria-hidden="true">*</span>
          </ConsentBox>
          <ConsentBox id="consent-marketing" checked={consent.marketing} onChange={v => onConsent({ ...consent, marketing: v })}>
            Contact me about my results and related services (optional).{' '}
            <a href={privacyHref()} target="_blank" rel="noreferrer" className="underline" style={{ color: GOLD }}>Privacy notice</a>
          </ConsentBox>
        </div>

        {submitError && <Notice tone="error">{submitError}</Notice>}
      </Card>

      <NavButtons onBack={onBack} onNext={submit} nextLabel={submitting ? 'Sending…' : 'Generate my Snapshot →'} nextDisabled={submitting} />
    </StepShell>
  );
}
