import { prisma } from '@/lib/db/prisma';

export async function GET() {

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    include: { lead: { select: { firmName: true, workEmail: true, city: true, country: true } } },
  });

  const headers = [
    'id', 'firmName', 'workEmail', 'city', 'country',
    'practiceTypes', 'firmSize', 'euFacing',
    'scoreHeadline', 'scoreBand',
    'scoreCompliance', 'scoreLiteracy', 'scoreExplainability', 'scoreAccountability',
    'scoreRights', 'scoreTransparency', 'scoreReliability', 'scoreUsageGovernance',
    'scoreSecurity', 'scoreTraceability',
    'status', 'createdAt', 'generatedAt',
  ];

  const round = (v: number | null) => (v !== null ? Math.round(v) : '');

  const rows = submissions.map(s => [
    s.id,
    `"${s.lead.firmName.replace(/"/g, '""')}"`,
    s.lead.workEmail,
    s.lead.city,
    s.lead.country,
    `"${s.practiceTypes.join('; ')}"`,
    s.firmSize,
    s.euFacing,
    round(s.scoreHeadline),
    s.scoreBand ?? '',
    round(s.scoreCompliance), round(s.scoreLiteracy), round(s.scoreExplainability),
    round(s.scoreAccountability), round(s.scoreRights), round(s.scoreTransparency),
    round(s.scoreReliability), round(s.scoreUsageGovernance),
    round(s.scoreSecurity), round(s.scoreTraceability),
    s.status,
    s.createdAt.toISOString(),
    s.generatedAt?.toISOString() ?? '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="nexterlaw-submissions-${date}.csv"`,
    },
  });
}
