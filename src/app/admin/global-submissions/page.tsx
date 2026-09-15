import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUS_COLOUR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  RESEARCHING: 'bg-blue-100 text-blue-700',
  REPORT_READY: 'bg-amber-100 text-amber-700',
  SENT: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  RESEARCHING: 'Researching',
  REPORT_READY: 'Report Ready',
  SENT: 'Sent',
};

export default async function GlobalSubmissionsPage() {
  const submissions = await prisma.globalSubmission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Global Submissions ({submissions.length})</h1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page navigation */}
        <a
          href="/api/admin/global-submissions/csv"
          className="text-sm bg-[#1a3a6b] text-white px-4 py-2 rounded-md hover:bg-[#142e56] transition-colors"
        >
          Download CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Firm', 'Contact', 'Country', 'Region', 'Practice Area', 'Firm Size', 'Status', 'Date', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.firmName}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.contactName}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.country}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.stateProvince ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.primaryPracticeArea}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.firmSize}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOUR[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {s.createdAt.toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/global-submissions/${s.id}`} className="text-xs text-[#1a3a6b] hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  No Global submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
