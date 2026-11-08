import { requireAdminPage } from '@/lib/security/admin-auth';
import { prisma } from '@/lib/db/prisma';
import { bandMeta } from '@/lib/bands';
import RetryButton from './RetryButton';

export const dynamic = 'force-dynamic';

const STATUS_COLOUR: Record<string, string> = {
  COMPLETE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  GENERATING: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-600',
};

export default async function SubmissionsPage() {
  await requireAdminPage();
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { lead: { select: { firmName: true, workEmail: true, marketingConsent: true } }, report: { select: { validationPassed: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Submissions ({submissions.length})</h1>
        <a href="/api/admin/submissions/csv" className="text-sm bg-[#1a3a6b] text-white px-4 py-2 rounded-md hover:bg-[#142e56] transition-colors">
          Download CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Firm', 'Email', 'Size', 'Score', 'Band', 'Intake', 'Route', 'Status', 'Refs', 'Date', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map(s => (
              <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${s.isTest ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                  {s.lead.firmName}
                  {s.isTest && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">TEST</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {s.lead.workEmail}
                  {s.lead.marketingConsent && <span title="Marketing consent" className="ml-1 text-green-700">✓</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{s.firmSize}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{s.scoreHeadline !== null ? Math.round(s.scoreHeadline) : '—'}</td>
                <td className="px-4 py-3">
                  {s.scoreBand ? (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${bandMeta(s.scoreBand).adminClass}`}>{bandMeta(s.scoreBand).displayName}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{s.intakeRating ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {s.route ?? '—'}
                  {s.nextStepClickedAt && <span title="Clicked next step" className="ml-1 text-green-700">●</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOUR[s.status] ?? 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3 text-xs" title="Reference check: ✓ passed first time, ✎ citations corrected">
                  {s.report ? (s.report.validationPassed ? '✓' : '✎') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{s.createdAt.toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {s.status === 'FAILED' && <RetryButton submissionId={s.id} />}
                  {s.resultToken && s.status === 'COMPLETE' && (
                    <a href={`/r/${s.resultToken}`} target="_blank" rel="noreferrer" className="text-xs text-[#1a3a6b] hover:underline">View</a>
                  )}
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No submissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
