'use client';

import { useState } from 'react';
import type { GeneratedReportContent } from '@/types';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const LABELS: Record<string, string> = {
  cover: 'Cover', firmName: 'Firm name', date: 'Date', disclaimer: 'Disclaimer',
  scoreNarrative: 'Score summary', regulatoryMap: 'Regulatory map',
  sra: 'Professional regulator / bar', ukGdpr: 'Data protection & confidentiality', pii: 'Professional indemnity',
  clientProcurement: 'Client expectations', euAiAct: 'EU AI Act',
  shadowAi: 'Shadow AI', opportunities: 'Opportunities', exposures: 'Exposures', upsell: 'Next-step paragraph',
  quickWins: 'Quick wins', intakeNote: 'Client intake note', plan90Day: '90-day plan',
  title: 'Title', benefit: 'Benefit', toolCategory: 'Tool category', description: 'Description', severity: 'Severity (HIGH / MEDIUM / LOW)',
  action: 'Action', dimension: 'Dimension key', window: 'Window', resourceId: 'Resource id',
};

function blankReport(firmName: string): GeneratedReportContent {
  return {
    cover: { firmName, date: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), disclaimer: 'This report is an indicative self-assessment and general information only. It is not legal or regulatory advice.' },
    scoreNarrative: '', regulatoryMap: { sra: '', ukGdpr: '', pii: '', clientProcurement: '' }, shadowAi: '',
    opportunities: [], exposures: [], upsell: '', quickWins: [], intakeNote: '', plan90Day: [],
  };
}

function Editor({ value, onChange, path }: { value: Json; onChange: (v: Json) => void; path: string }) {
  const key = path.split('.').pop()?.replace(/\[\d+\]$/, '') ?? '';
  if (typeof value === 'string') {
    const long = value.length > 120 || ['scoreNarrative', 'sra', 'ukGdpr', 'pii', 'clientProcurement', 'euAiAct', 'shadowAi', 'upsell', 'intakeNote', 'disclaimer', 'description', 'benefit', 'action'].includes(key);
    return (
      <label className="block">
        <span className="text-xs text-gray-500">{LABELS[key] ?? key}</span>
        {long ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={Math.min(14, Math.max(3, Math.ceil(value.length / 90)))}
            className="mt-1 w-full text-sm border border-gray-300 rounded p-2 text-gray-900" />
        ) : (
          <input value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full text-sm border border-gray-300 rounded p-2 text-gray-900" />
        )}
        {value.includes('[REVIEWER') && <span className="text-xs text-amber-700">Contains a reviewer placeholder — fill it in before approving.</span>}
      </label>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-700">{LABELS[key] ?? key}</p>
        {value.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded p-3 space-y-2 relative">
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-xs text-red-600 hover:underline">Remove</button>
            <Editor value={item} path={`${path}[${i}]`} onChange={v => onChange(value.map((x, j) => (j === i ? v : x)))} />
          </div>
        ))}
        {value.length > 0 && typeof value[0] === 'object' && (
          <button type="button" className="text-xs text-[#1a3a6b] hover:underline"
            onClick={() => onChange([...value, Object.fromEntries(Object.keys(value[0] as object).map(k => [k, ''])) as Json])}>
            + Add item
          </button>
        )}
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div className="space-y-3">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className={typeof v === 'object' && v !== null ? 'border-l-2 border-gray-200 pl-3' : ''}>
            {typeof v === 'object' && v !== null && !Array.isArray(v) && <p className="text-xs font-semibold text-gray-700 mb-2">{LABELS[k] ?? k}</p>}
            <Editor value={v} path={`${path}.${k}`} onChange={nv => onChange({ ...value, [k]: nv })} />
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function ReportEditor({ submissionId, firmName, initial, draftInfo, approved, resultsUrl }: {
  submissionId: string;
  firmName: string;
  initial: GeneratedReportContent | null;
  draftInfo: { at: string; model: string; hadNotes: boolean; warnings: string[] } | null;
  approved: { at: string } | null;
  resultsUrl: string | null;
}) {
  const [content, setContent] = useState<GeneratedReportContent>(initial ?? blankReport(firmName));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = async (action: 'draft' | 'save' | 'approve') => {
    if (action === 'approve' && !confirm(`Approve this report and email ${firmName} the link now? They will see exactly what is on this page.`)) return;
    if (action === 'draft' && !confirm('Generate a new AI draft? This makes a paid AI call and replaces the current draft (not your saved edits).')) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/global-submissions/${submissionId}/report`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'draft' ? { action } : { action, content }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(`Error: ${json.error ?? res.status}`); return; }
    setMsg(action === 'draft' ? json.message : action === 'save' ? 'Saved (not sent).' : `Approved and ${json.emailed ? 'emailed' : 'saved, but the email failed — send the link manually'}: ${json.resultsUrl}`);
  };

  const placeholders = JSON.stringify(content).includes('[REVIEWER');

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Report: review, edit, approve</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {approved ? `Approved and sent ${new Date(approved.at).toLocaleString('en-GB')}. ` : 'Not sent. '}
            {draftInfo
              ? `AI draft ${new Date(draftInfo.at).toLocaleString('en-GB')} (${draftInfo.model}${draftInfo.hadNotes ? ', with jurisdiction notes' : ', no jurisdiction notes yet'}).`
              : 'No AI draft yet.'}
          </p>
          {resultsUrl && <a href={resultsUrl} target="_blank" rel="noreferrer" className="text-xs text-[#1a3a6b] hover:underline">Open the firm&apos;s results page →</a>}
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => call('draft')} className="text-sm px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50">AI draft</button>
          <button type="button" disabled={busy} onClick={() => call('save')} className="text-sm px-3 py-2 rounded-md border border-[#1a3a6b] text-[#1a3a6b] hover:bg-gray-50 disabled:opacity-50">Save</button>
          <button type="button" disabled={busy || placeholders} onClick={() => call('approve')} title={placeholders ? 'Fill in every [REVIEWER] placeholder first' : ''}
            className="text-sm px-3 py-2 rounded-md bg-[#1a3a6b] text-white hover:bg-[#142e56] disabled:opacity-50">
            {approved ? 'Re-approve & resend' : 'Approve & send'}
          </button>
        </div>
      </div>
      {draftInfo?.warnings.length ? (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded p-3">
          The draft cited references that aren&apos;t on the approved list; they were removed: {draftInfo.warnings.join('; ')}
        </div>
      ) : null}
      {msg && <p className="text-sm text-gray-700" role="status">{msg}</p>}
      <Editor value={content as unknown as Json} path="report" onChange={v => setContent(v as unknown as GeneratedReportContent)} />
    </div>
  );
}
