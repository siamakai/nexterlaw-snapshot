'use client';

import { useState } from 'react';

export default function RetryButton({ submissionId }: { submissionId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const retry = async () => {
    if (!confirm('Retry generating this report? This makes a new paid AI call and emails the firm when done.')) return;
    setState('busy');
    const res = await fetch(`/api/admin/submissions/${submissionId}/retry`, { method: 'POST' });
    setState(res.ok ? 'done' : 'error');
  };
  if (state === 'done') return <span className="text-xs text-green-700">Retrying…</span>;
  return (
    <button type="button" onClick={retry} disabled={state === 'busy'}
      className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
      {state === 'error' ? 'Failed — try again' : state === 'busy' ? '…' : 'Retry'}
    </button>
  );
}
