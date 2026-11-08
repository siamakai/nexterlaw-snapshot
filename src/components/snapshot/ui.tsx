'use client';

import type { ReactNode } from 'react';
import { GOLD, NAVY, R_BG, R_BODY, R_BORDER, R_CARD, R_CREAM, R_MUTED, ERROR, headingStyle } from './theme';

export function NLLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.4 : 1;
  return (
    <div className="flex items-center shrink-0" style={{ gap: Math.round(14 * scale) }} aria-label="NexterLaw">
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: Math.round(52 * scale), height: Math.round(52 * scale), backgroundColor: R_CARD,
          border: `2px solid ${GOLD}`, outline: `1px solid ${GOLD}`, outlineOffset: '-4px',
        }}
        aria-hidden="true"
      >
        <span style={{ color: '#fff', fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: Math.round(20 * scale), lineHeight: 1 }}>NL</span>
      </div>
      <div className="flex flex-col" style={{ gap: Math.round(3 * scale) }} aria-hidden="true">
        <div style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: Math.round(28 * scale), lineHeight: 1, letterSpacing: '-0.01em' }}>
          <span style={{ color: R_CREAM }}>NEXTER</span>
          <span style={{ color: GOLD }}>LAW</span>
        </div>
        <div className="hidden sm:block" style={{ color: '#8aa2c2', fontSize: Math.round(8.5 * scale), letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1 }}>
          AI Governance&nbsp;&nbsp;·&nbsp;&nbsp;Ethics&nbsp;&nbsp;·&nbsp;&nbsp;Regulations
        </div>
      </div>
    </div>
  );
}

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{ width: i + 1 === current ? 24 : 8, height: 8, backgroundColor: i + 1 <= current ? GOLD : 'rgba(184,144,42,0.25)' }}
        />
      ))}
    </div>
  );
}

/** Page frame used by every step: ambient image, logo header, gold rules. */
export function StepShell({ children, step, gradientAt = 50, narrow = true }: {
  children: ReactNode;
  step?: { current: number; total: number };
  gradientAt?: number;
  narrow?: boolean;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: R_BG }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.webp" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.07 }} />
      </div>
      <header className="px-4 sm:px-6 py-4 flex justify-between items-center gap-3 max-w-6xl mx-auto w-full" style={{ position: 'relative', zIndex: 10 }}>
        <NLLogo size="sm" />
        {step && <StepIndicator current={step.current} total={step.total} />}
      </header>
      <div style={{ position: 'relative', zIndex: 10, height: 1, backgroundColor: 'rgba(184,144,42,0.15)' }} />
      <div style={{ position: 'relative', zIndex: 10, height: 2, background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} ${gradientAt}%, ${NAVY} 100%)` }} />
      <main
        id="main"
        className={`flex-1 px-4 sm:px-6 py-8 sm:py-10 mx-auto w-full ${narrow ? 'max-w-2xl' : 'max-w-4xl'}`}
        style={{ position: 'relative', zIndex: 10 }}
      >
        {children}
      </main>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: GOLD }}>{children}</p>;
}

export function StepHeading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: ReactNode }) {
  return (
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mb-1" style={headingStyle()}>{title}</h1>
      {intro && <p className="mb-6 sm:mb-8" style={{ color: R_BODY }}>{intro}</p>}
    </>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`p-5 sm:p-8 ${className}`} style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 2 }}>
      {children}
    </div>
  );
}

export function GoldButton({ children, onClick, disabled, type = 'button', className = '' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      style={{
        backgroundColor: disabled ? 'rgba(184,144,42,0.35)' : GOLD,
        color: disabled ? 'rgba(237,232,224,0.6)' : R_BG,
        borderRadius: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outlineColor: R_CREAM,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      style={{ border: `1px solid ${R_BORDER}`, borderRadius: 2, backgroundColor: 'transparent', color: R_CREAM, outlineColor: GOLD }}
    >
      {children}
    </button>
  );
}

export function NavButtons({ onBack, onNext, nextLabel = 'Continue →', nextDisabled, hint }: {
  onBack: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean; hint?: string | null;
}) {
  return (
    <>
      <div className="mt-6 sm:mt-8 flex gap-3">
        <GhostButton onClick={onBack} className="flex-1">← Back</GhostButton>
        <GoldButton onClick={onNext} disabled={nextDisabled} className="flex-1">{nextLabel}</GoldButton>
      </div>
      {hint && <p className="text-center text-sm mt-3" style={{ color: R_MUTED }} role="status">{hint}</p>}
    </>
  );
}

/** A pill-style choice in a single-select group (role=radio for screen readers). */
export function ChoiceButton({ selected, onSelect, children, className = '', selectedStyle }: {
  selected: boolean; onSelect: () => void; children: ReactNode; className?: string;
  selectedStyle?: { border: string; bg: string; color: string };
}) {
  const sel = selectedStyle ?? { border: GOLD, bg: GOLD, color: R_BG };
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      style={{
        border: `1px solid ${selected ? sel.border : R_BORDER}`,
        borderRadius: 2,
        backgroundColor: selected ? sel.bg : 'rgba(13,31,60,0.4)',
        color: selected ? sel.color : R_BODY,
        outlineColor: GOLD,
      }}
    >
      {children}
    </button>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="text-sm mt-1" style={{ color: ERROR, minHeight: message ? undefined : 0 }} role={message ? 'alert' : undefined}>
      {message ?? ''}
    </p>
  );
}

export function FieldLabel({ htmlFor, id, children, required, optional }: {
  htmlFor?: string; id?: string; children: ReactNode; required?: boolean; optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} id={id} className="text-sm font-semibold mb-1.5 block" style={{ color: R_CREAM }}>
      {children}
      {required && <span style={{ color: GOLD }} aria-hidden="true"> *</span>}
      {optional && <span className="font-normal text-xs" style={{ color: R_MUTED }}> (optional)</span>}
    </label>
  );
}

export function Notice({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'error' }) {
  const isError = tone === 'error';
  return (
    <div
      className="p-4 text-sm"
      role={isError ? 'alert' : undefined}
      style={{
        backgroundColor: isError ? 'rgba(248,113,113,0.10)' : 'rgba(184,144,42,0.08)',
        border: `1px solid ${isError ? 'rgba(248,113,113,0.30)' : R_BORDER}`,
        borderRadius: 2,
        color: isError ? ERROR : R_CREAM,
      }}
    >
      {children}
    </div>
  );
}
