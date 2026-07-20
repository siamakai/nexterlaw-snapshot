import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const BAND_COLOUR: Record<string, string> = {
  EXPOSED: 'bg-red-100 text-red-700',
  DEVELOPING: 'bg-amber-100 text-amber-700',
  IN_CONTROL: 'bg-green-100 text-green-700',
};

const STATUS_COLOUR: Record<string, string> = {
  COMPLETE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  GENERATING: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-600',
};

export default async function SubmissionsPage() {
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { lead: { select: { firmName: true, workEmail: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Submissions ({submissions.length})</h1>
        <a
          href="/api/admin/submissions/csv"
          className="text-sm bg-[#1a3a6b] text-white px-4 py-2 rounded-md hover:bg-[#142e56] transition-colors"
        >
          Download CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Firm', 'Email', 'Practice Types', 'Size', 'Score', 'Band', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.lead.firmName}</td>
                <td className="px-4 py-3 text-gray-500">{s.lead.workEmail}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{s.practiceTypes.join(', ')}</td>
                <td className="px-4 py-3 text-gray-500">{s.firmSize}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {s.scoreHeadline !== null ? Math.round(s.scoreHeadline) : '—'}
                </td>
                <td className="px-4 py-3">
                  {s.scoreBand ? (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${BAND_COLOUR[s.scoreBand] ?? 'bg-gray-100 text-gray-600'}`}>
                      {s.scoreBand.replace('_', ' ')}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOUR[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {s.createdAt.toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
