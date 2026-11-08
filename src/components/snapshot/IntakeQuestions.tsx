'use client';

import { INTAKE_QUESTIONS, type IntakeAnswers, type IntakeKey } from '@/lib/intake';
import { track } from '@/lib/analytics';
import { StepShell, StepHeading, Card, ChoiceButton, NavButtons } from './ui';
import { R_BORDER, R_CREAM } from './theme';

export function IntakeQuestions({ answers, onChange, onBack, onNext, eyebrow, step }: {
  answers: IntakeAnswers;
  onChange: (key: IntakeKey, value: string) => void;
  onBack: () => void;
  onNext: () => void;
  eyebrow: string;
  step: { current: number; total: number };
}) {
  const done = INTAKE_QUESTIONS.every(q => answers[q.key]);
  return (
    <StepShell step={step} gradientAt={60}>
      <StepHeading
        eyebrow={eyebrow}
        title="How new clients reach you"
        intro="Four quick questions about new enquiries. They aren't part of your CLEAR TRUST score; they shape the intake section of your report."
      />
      <Card className="space-y-7">
        {INTAKE_QUESTIONS.map((q, i) => {
          const labelId = `intake-${q.key}`;
          return (
            <fieldset key={q.key} className={i > 0 ? 'pt-6' : ''} style={i > 0 ? { borderTop: `1px solid ${R_BORDER}` } : undefined}>
              <legend id={labelId} className="text-sm font-semibold mb-3" style={{ color: R_CREAM }}>{q.question}</legend>
              <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map(o => (
                  <ChoiceButton key={o.value} selected={answers[q.key] === o.value} onSelect={() => onChange(q.key, o.value)} className="text-left">
                    {o.label}
                  </ChoiceButton>
                ))}
              </div>
            </fieldset>
          );
        })}
      </Card>
      <NavButtons
        onBack={onBack}
        onNext={() => { if (done) { track('intake_completed'); onNext(); } }}
        nextDisabled={!done}
        hint={done ? null : 'Please answer all four (choose "Not sure" if you don’t know).'}
      />
    </StepShell>
  );
}
