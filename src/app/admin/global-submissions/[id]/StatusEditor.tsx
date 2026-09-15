'use client';

import { useState, useTransition } from 'react';

const STATUSES = ['PENDING', 'RESEARCHING', 'REPORT_READY', 'SENT'] as const;

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  RESEARCHING: 'Researching',
  REPORT_READY: 'Report Ready',
  SENT: 'Sent',
};

export default function StatusEditor({
  submissionId,
  initialStatus,
  initialNotes,
}: {
  submissionId: string;
  initialStatus: string;
  initialNotes: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  const patch = (data: { status?: string; internalNotes?: string }) => {
    setSaved(false);
    startTransition(async () => {
      await fetch(`/api/admin/global-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setSaved(true);
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Manual report status</label>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); patch({ status: s }); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === s ? 'bg-[#1a3a6b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Internal notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => patch({ internalNotes: notes })}
          rows={6}
          placeholder="Research notes, regulatory sources consulted, draft status, etc."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <p className="text-xs text-gray-400">{isPending ? 'Saving…' : saved ? 'Saved' : ''}</p>
    </div>
  );
}
