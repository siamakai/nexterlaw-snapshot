'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { FREE_EMAIL_DOMAINS } from '@/lib/constants';
import { FieldError, FieldLabel } from './ui';
import { GOLD, R_BODY, R_BORDER, R_CREAM, inputStyle } from './theme';

export function TextField({ id, label, value, onChange, error, required, optional, placeholder, type = 'text', autoComplete, children }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string;
  required?: boolean; optional?: boolean; placeholder?: string; type?: string; autoComplete?: string; children?: ReactNode;
}) {
  const errId = `${id}-error`;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} optional={optional}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={errId}
        aria-required={required}
        style={inputStyle(!!error)}
      />
      {children}
      <FieldError id={errId} message={error} />
    </div>
  );
}

/** Whole tile is the control (role=checkbox), so clicking anywhere on it toggles. */
export function CheckTile({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        border: `1px solid ${checked ? GOLD : R_BORDER}`, borderRadius: 2,
        backgroundColor: checked ? 'rgba(184,144,42,0.10)' : 'rgba(13,31,60,0.4)', outlineColor: GOLD,
      }}
    >
      <span aria-hidden="true" className="shrink-0 flex items-center justify-center"
        style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${checked ? GOLD : '#6b7f9c'}`, backgroundColor: checked ? GOLD : 'transparent', color: '#0d1f3c', fontSize: 11, fontWeight: 700 }}>
        {checked ? '✓' : ''}
      </span>
      <span className="text-sm" style={{ color: checked ? GOLD : R_BODY }}>{children}</span>
    </button>
  );
}

/** Consent checkbox with a proper label; the whole row is clickable. */
export function ConsentBox({ id, checked, onChange, children, error }: {
  id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={`${id}-error`}
          className="mt-0.5 shrink-0"
          style={{ width: 18, height: 18, accentColor: GOLD }}
        />
        <span className="text-sm" style={{ color: R_CREAM, lineHeight: 1.6 }}>{children}</span>
      </label>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function EmailWarning({ email }: { email: string }) {
  const domain = email.split('@')[1]?.toLowerCase().trim() ?? '';
  if (!domain || !FREE_EMAIL_DOMAINS.includes(domain)) return null;
  return (
    <p className="text-sm mt-1.5 flex items-center gap-1.5" style={{ color: '#f2b45a' }} role="status">
      <span aria-hidden="true">⚠</span> A work email helps us identify your firm. You can still continue with this one.
    </p>
  );
}
