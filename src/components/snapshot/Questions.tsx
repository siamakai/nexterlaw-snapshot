'use client';

import { useState } from 'react';
import { CLEAR_TRUST_DIMENSIONS, SELF_ASSESSMENT_ANSWERS, type DimensionKey } from '@/lib/constants';
import type { SelfAssessmentAnswer, SelfAssessmentAnswers } from '@/types';
import { track } from '@/lib/analytics';
import { StepShell, StepHeading, ChoiceButton, NavButtons, Notice } from './ui';
import { useIsMobile } from './useIsMobile';
import { ANSWER_STYLE, GOLD, NAVY, R_BG, R_BORDER, R_CARD, R_CREAM, R_MUTED } from './theme';

interface Props {
  answers: SelfAssessmentAnswers;
  onAnswer: (key: DimensionKey, value: SelfAssessmentAnswer) => void;
  onBack: () => void;
  onNext: () => void;
  eyebrow: string;
  step: { current: number; total: number };
  /** Global path uses jurisdiction-neutral wording. */
  questionOverrides?: Partial<Record<DimensionKey, string>>;
  intro?: string;
}

function AnswerGroup({ dimKey, labelId, value, onPick }: {
  dimKey: DimensionKey; labelId: string; value: SelfAssessmentAnswer | ''; onPick: (v: SelfAssessmentAnswer) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex gap-2">
      {SELF_ASSESSMENT_ANSWERS.map(opt => (
        <ChoiceButton
          key={opt.value}
          selected={value === opt.value}
          onSelect={() => { track('q_answered', { question: dimKey, answer: opt.value }); onPick(opt.value as SelfAssessmentAnswer); }}
          selectedStyle={ANSWER_STYLE[opt.value]}
          className="flex-1 py-3 sm:py-2"
        >
          {opt.label}
        </ChoiceButton>
      ))}
    </div>
  );
}

function QuestionCard({ index, dim, text, value, onPick }: {
  index: number; dim: (typeof CLEAR_TRUST_DIMENSIONS)[number]; text: string; value: SelfAssessmentAnswer | ''; onPick: (v: SelfAssessmentAnswer) => void;
}) {
  const left = value ? ANSWER_STYLE[value].border : NAVY;
  const labelId = `q-${dim.key}`;
  return (
    <div className="p-5" style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderLeft: `3px solid ${left}`, borderRadius: 2 }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: 28, height: 28, backgroundColor: GOLD, borderRadius: 2 }} aria-hidden="true">
          <span style={{ color: R_BG, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{dim.letter}</span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: GOLD }}>{dim.name} · Q{index + 1}</p>
          <p id={labelId} className="text-sm mt-0.5" style={{ color: R_CREAM }}>{text}</p>
        </div>
      </div>
      <div className="sm:pl-10">
        <AnswerGroup dimKey={dim.key} labelId={labelId} value={value} onPick={onPick} />
      </div>
    </div>
  );
}

export function Questions({ answers, onAnswer, onBack, onNext, eyebrow, step, questionOverrides = {}, intro }: Props) {
  const isMobile = useIsMobile();
  const [index, setIndex] = useState(() => {
    const firstUnanswered = CLEAR_TRUST_DIMENSIONS.findIndex(d => !answers[d.key]);
    return firstUnanswered === -1 ? CLEAR_TRUST_DIMENSIONS.length - 1 : firstUnanswered;
  });
  const answeredCount = CLEAR_TRUST_DIMENSIONS.filter(d => answers[d.key]).length;
  const allAnswered = answeredCount === CLEAR_TRUST_DIMENSIONS.length;
  const text = (d: (typeof CLEAR_TRUST_DIMENSIONS)[number]) => questionOverrides[d.key] ?? d.question;

  const heading = (
    <StepHeading
      eyebrow={eyebrow}
      title="Ten quick questions"
      intro={intro ?? 'These answers drive your CLEAR TRUST score.'}
    />
  );
  const reassurance = (
    <div className="mb-6">
      <Notice>
        <span style={{ color: GOLD }} aria-hidden="true">◆ </span>
        Most firms answer <strong>No</strong> or <strong>Not sure</strong> to several of these. That is exactly why the Snapshot exists.
        &ldquo;Not sure&rdquo; is treated as unknown, not as a gap.
      </Notice>
    </div>
  );

  if (isMobile) {
    const dim = CLEAR_TRUST_DIMENSIONS[index];
    const pct = Math.round((answeredCount / CLEAR_TRUST_DIMENSIONS.length) * 100);
    const isLast = index === CLEAR_TRUST_DIMENSIONS.length - 1;
    return (
      <StepShell step={step}>
        {heading}
        <div className="mb-4" aria-live="polite">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: R_MUTED }}>
            <span>Question {index + 1} of {CLEAR_TRUST_DIMENSIONS.length}</span>
            <span>{answeredCount} answered</span>
          </div>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Questions answered"
            className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
          </div>
        </div>
        <QuestionCard
          key={dim.key}
          index={index}
          dim={dim}
          text={text(dim)}
          value={answers[dim.key]}
          onPick={v => {
            onAnswer(dim.key, v);
            if (!isLast) setTimeout(() => setIndex(i => Math.min(i + 1, CLEAR_TRUST_DIMENSIONS.length - 1)), 220);
          }}
        />
        {index === 0 && <div className="mt-4">{reassurance}</div>}
        <NavButtons
          onBack={() => (index > 0 ? setIndex(index - 1) : onBack())}
          onNext={() => (isLast || allAnswered ? allAnswered && onNext() : answers[dim.key] && setIndex(index + 1))}
          nextLabel={isLast || allAnswered ? 'Continue →' : 'Next question →'}
          nextDisabled={isLast || allAnswered ? !allAnswered : !answers[dim.key]}
          hint={isLast && !allAnswered ? 'Please answer every question to continue.' : null}
        />
      </StepShell>
    );
  }

  return (
    <StepShell step={step}>
      {heading}
      {reassurance}
      <div className="space-y-3">
        {CLEAR_TRUST_DIMENSIONS.map((dim, i) => (
          <QuestionCard key={dim.key} index={i} dim={dim} text={text(dim)} value={answers[dim.key]} onPick={v => onAnswer(dim.key, v)} />
        ))}
      </div>
      <NavButtons
        onBack={onBack}
        onNext={() => allAnswered && onNext()}
        nextDisabled={!allAnswered}
        hint={allAnswered ? null : `Please answer all questions to continue (${answeredCount} of 10 done).`}
      />
      <p className="sr-only" aria-live="polite">{answeredCount} of 10 answered</p>
    </StepShell>
  );
}
