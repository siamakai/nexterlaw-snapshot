'use client';

import { useEffect, useState, useTransition } from 'react';

interface KBEntry {
  id: string;
  category: string;
  title: string;
  bodyText: string;
  weight: number;
  isActive: boolean;
  isEuLayerEntry: boolean;
  sourceReference: string | null;
  appliedToPracticeTypes: string[];
  appliedToFirmSizes: string[];
}

const CATEGORIES = [
  'REGULATORY_GUIDANCE', 'USE_CASE_LIBRARY', 'RISK_LIBRARY',
  'CONDITIONAL_EU_LAYER', 'TOOL_CATEGORIES',
] as const;

const CAT_LABEL: Record<string, string> = {
  REGULATORY_GUIDANCE: 'Regulatory',
  USE_CASE_LIBRARY: 'Use Cases',
  RISK_LIBRARY: 'Risks',
  CONDITIONAL_EU_LAYER: 'EU Layer',
  TOOL_CATEGORIES: 'Tools',
};

const CAT_COLOUR: Record<string, string> = {
  REGULATORY_GUIDANCE: 'bg-blue-100 text-blue-700',
  USE_CASE_LIBRARY: 'bg-purple-100 text-purple-700',
  RISK_LIBRARY: 'bg-red-100 text-red-700',
  CONDITIONAL_EU_LAYER: 'bg-indigo-100 text-indigo-700',
  TOOL_CATEGORIES: 'bg-green-100 text-green-700',
};

const BLANK: Omit<KBEntry, 'id'> = {
  category: 'REGULATORY_GUIDANCE',
  title: '',
  bodyText: '',
  weight: 1,
  isActive: true,
  isEuLayerEntry: false,
  sourceReference: '',
  appliedToPracticeTypes: [],
  appliedToFirmSizes: [],
};

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Partial<KBEntry> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const load = () => {
    fetch('/api/admin/kb').then(r => r.json()).then(setEntries).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const filtered = filter
    ? entries.filter(e => e.category === filter)
    : entries;

  const save = () => {
    if (!editing) return;
    setError('');
    const url = isNew ? '/api/admin/kb' : `/api/admin/kb/${editing.id}`;
    const method = isNew ? 'POST' : 'PATCH';
    startTransition(async () => {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Save failed');
        return;
      }
      setEditing(null);
      load();
    });
  };

  const toggleActive = (entry: KBEntry) => {
    startTransition(async () => {
      await fetch(`/api/admin/kb/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !entry.isActive }),
      });
      load();
    });
  };

  const del = (id: string) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    startTransition(async () => {
      await fetch(`/api/admin/kb/${id}`, { method: 'DELETE' });
      load();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Knowledge Base ({entries.length})</h1>
        <button
          onClick={() => { setIsNew(true); setEditing({ ...BLANK }); setError(''); }}
          className="text-sm bg-[#1a3a6b] text-white px-4 py-2 rounded-md hover:bg-[#142e56] transition-colors"
        >
          + New Entry
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!filter ? 'bg-[#1a3a6b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === c ? 'bg-[#1a3a6b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {CAT_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Category', 'Title', 'Weight', 'EU Layer', 'Active', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(e => (
              <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${!e.isActive ? 'opacity-40' : ''}`}>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLOUR[e.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {CAT_LABEL[e.category] ?? e.category}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[400px]">
                  <p className="font-medium text-gray-900 truncate">{e.title}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{e.bodyText.slice(0, 80)}…</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{e.weight}</td>
                <td className="px-4 py-3 text-gray-500">{e.isEuLayerEntry ? 'Yes' : '—'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(e)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${e.isActive ? 'bg-[#1a3a6b]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${e.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => { setIsNew(false); setEditing({ ...e }); setError(''); }} className="text-xs text-[#1a3a6b] hover:underline">Edit</button>
                    <button onClick={() => del(e.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No entries{filter ? ' in this category' : ' yet'}.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit / Create modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{isNew ? 'New Entry' : 'Edit Entry'}</h2>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={editing.category} onChange={e => setEditing(p => ({ ...p!, category: e.target.value }))} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input value={editing.title ?? ''} onChange={e => setEditing(p => ({ ...p!, title: e.target.value }))} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Body Text</label>
                <textarea value={editing.bodyText ?? ''} onChange={e => setEditing(p => ({ ...p!, bodyText: e.target.value }))} rows={8} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Weight (0–10)</label>
                  <input type="number" min={0} max={10} step={0.1} value={editing.weight ?? 1} onChange={e => setEditing(p => ({ ...p!, weight: parseFloat(e.target.value) }))} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Source Reference</label>
                  <input value={editing.sourceReference ?? ''} onChange={e => setEditing(p => ({ ...p!, sourceReference: e.target.value || null }))} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editing.isActive ?? true} onChange={e => setEditing(p => ({ ...p!, isActive: e.target.checked }))} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editing.isEuLayerEntry ?? false} onChange={e => setEditing(p => ({ ...p!, isEuLayerEntry: e.target.checked }))} />
                  EU Layer Entry
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={isPending} className="px-4 py-2 text-sm bg-[#1a3a6b] text-white rounded-md hover:bg-[#142e56] disabled:opacity-50">
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
