'use client';

import { SITE } from '@/config/site';
import { track } from '@/lib/analytics';
import { StepShell, Eyebrow, GhostButton } from './ui';
import { GOLD, R_BODY, R_BORDER, R_CARD, R_CREAM, R_MUTED, headingStyle } from './theme';

export function PathChoice({ onUk, onGlobal, onBack }: { onUk: () => void; onGlobal: () => void; onBack: () => void }) {
  const card = (accent: boolean): React.CSSProperties => ({
    backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderLeft: accent ? `3px solid ${GOLD}` : `1px solid ${R_BORDER}`, borderRadius: 2,
  });
  return (
    <StepShell>
      <div className="flex flex-col items-center py-4 sm:py-10">
        <Eyebrow>Before you start</Eyebrow>
        <h1 className="mb-3 text-center" style={headingStyle('1.85rem')}>Where is your firm based?</h1>
        <p className="mb-8 sm:mb-10 text-center" style={{ color: R_BODY, maxWidth: '32rem' }}>
          This decides which version of the Snapshot you get: an instant UK report, or a report for any other country prepared by our team.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 w-full">
          <button type="button" onClick={() => { track('path_selected', { path: 'uk' }); onUk(); }}
            className="text-left p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2" style={{ ...card(true), outlineColor: GOLD }}>
            <span className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>United Kingdom</span>
            <span className="block font-semibold mb-1.5" style={{ color: R_CREAM, fontSize: '1.05rem' }}>Get your instant UK Snapshot</span>
            <span className="block text-sm" style={{ color: R_BODY, lineHeight: 1.6 }}>
              Your score straight away and a full report in about a minute, measured against SRA, UK GDPR and professional indemnity guidance.
            </span>
            <span className="inline-block mt-4 text-sm font-semibold" style={{ color: GOLD }}>Continue →</span>
          </button>

          <button type="button" onClick={() => { track('path_selected', { path: 'global' }); onGlobal(); }}
            className="text-left p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2" style={{ ...card(false), outlineColor: GOLD }}>
            <span className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: R_MUTED }}>Any other country</span>
            <span className="block font-semibold mb-1.5" style={{ color: R_CREAM, fontSize: '1.05rem' }}>
              {SITE.global.waitlist ? 'Join the Global Snapshot waitlist' : 'Get your Global Snapshot'}
            </span>
            <span className="block text-sm" style={{ color: R_BODY, lineHeight: 1.6 }}>
              {SITE.global.waitlist
                ? 'Answer the same questions and get your instant score. Our team will prepare your full report as soon as a slot opens.'
                : `Answer the same questions and get your instant score. Our team researches your jurisdiction and sends your full report within about ${SITE.global.turnaroundHours} hours.`}
            </span>
            <span className="inline-block mt-4 text-sm font-semibold" style={{ color: R_CREAM }}>Continue →</span>
          </button>
        </div>

        <GhostButton onClick={onBack} className="mt-10">← Back</GhostButton>
      </div>
    </StepShell>
  );
}
