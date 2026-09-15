import { prisma } from '@/lib/db/prisma';

function csvField(v: string | null | undefined): string {
  const s = v ?? '';
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const submissions = await prisma.globalSubmission.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'id', 'contactName', 'firmName', 'firmWebsite', 'workEmail', 'phone',
    'country', 'stateProvince', 'secondaryStates', 'regulatoryBody', 'secondaryJurisdiction',
    'firmSize', 'primaryPracticeArea', 'primaryPracticeAreaOther', 'secondaryPracticeAreas',
    'currentlyUsingAi', 'aiToolsInUse', 'hasAiPolicy', 'clientsAskedAboutAi',
    'answerCompliance', 'answerLiteracy', 'answerExplainability', 'answerAccountability',
    'answerRights', 'answerTransparency', 'answerReliability', 'answerUsageGovernance',
    'answerSecurity', 'answerTraceability',
    'biggestConcern', 'whatWouldHelpMost', 'contactPermission',
    'status', 'internalNotes',
    'createdAt', 'reportPreparedAt', 'reportSentAt',
  ];

  const rows = submissions.map(s => [
    s.id,
    csvField(s.contactName),
    csvField(s.firmName),
    csvField(s.firmWebsite),
    s.workEmail,
    csvField(s.phone),
    csvField(s.country),
    csvField(s.stateProvince),
    csvField(s.secondaryStates.join('; ')),
    csvField(s.regulatoryBody),
    csvField(s.secondaryJurisdiction),
    s.firmSize,
    csvField(s.primaryPracticeArea),
    csvField(s.primaryPracticeAreaOther),
    csvField(s.secondaryPracticeAreas.join('; ')),
    s.currentlyUsingAi,
    csvField(s.aiToolsInUse),
    s.hasAiPolicy,
    s.clientsAskedAboutAi,
    s.answerCompliance, s.answerLiteracy, s.answerExplainability, s.answerAccountability,
    s.answerRights, s.answerTransparency, s.answerReliability, s.answerUsageGovernance,
    s.answerSecurity, s.answerTraceability,
    csvField(s.biggestConcern),
    csvField(s.whatWouldHelpMost),
    s.contactPermission ? 'Yes' : 'No',
    s.status,
    csvField(s.internalNotes),
    s.createdAt.toISOString(),
    s.reportPreparedAt?.toISOString() ?? '',
    s.reportSentAt?.toISOString() ?? '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="nexterlaw-global-submissions-${date}.csv"`,
    },
  });
}
