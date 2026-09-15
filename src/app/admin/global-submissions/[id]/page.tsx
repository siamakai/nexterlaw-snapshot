import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusEditor from './StatusEditor';

export const dynamic = 'force-dynamic';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

const ANSWER_LABEL: Record<string, string> = { YES: 'Yes', NOT_SURE: 'Not sure', NO: 'No' };

type ClearTrustAnswerKey =
  | 'answerCompliance' | 'answerLiteracy' | 'answerExplainability' | 'answerAccountability'
  | 'answerRights' | 'answerTransparency' | 'answerReliability' | 'answerUsageGovernance'
  | 'answerSecurity' | 'answerTraceability';

const CLEAR_TRUST_ROWS: { key: ClearTrustAnswerKey; label: string }[] = [
  { key: 'answerCompliance', label: 'Compliance' },
  { key: 'answerLiteracy', label: 'Literacy' },
  { key: 'answerExplainability', label: 'Explainability' },
  { key: 'answerAccountability', label: 'Accountability' },
  { key: 'answerRights', label: 'Rights' },
  { key: 'answerTransparency', label: 'Transparency' },
  { key: 'answerReliability', label: 'Reliability' },
  { key: 'answerUsageGovernance', label: 'Usage Governance' },
  { key: 'answerSecurity', label: 'Security' },
  { key: 'answerTraceability', label: 'Traceability' },
];

async function getSubmission(id: string) {
  return prisma.globalSubmission.findUnique({ where: { id } });
}

export default async function GlobalSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getSubmission(id);
  if (!s) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/global-submissions" className="text-xs text-[#1a3a6b] hover:underline">
          ← All Global Submissions
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">{s.firmName}</h1>
        <p className="text-sm text-gray-500">{s.country}{s.stateProvince ? `, ${s.stateProvince}` : ''}</p>
      </div>

      <StatusEditor submissionId={s.id} initialStatus={s.status} initialNotes={s.internalNotes ?? ''} />

      <Section title="Contact & Firm">
        <Field label="Contact name" value={s.contactName} />
        <Field label="Firm name" value={s.firmName} />
        <Field label="Website" value={s.firmWebsite} />
        <Field label="Email" value={s.workEmail} />
        <Field label="Phone" value={s.phone} />
        <Field label="Firm size" value={s.firmSize} />
      </Section>

      <Section title="Jurisdiction">
        <Field label="Country" value={s.country} />
        <Field label="State / Province / Region" value={s.stateProvince} />
        <Field label="Secondary states/provinces" value={s.secondaryStates.join(', ')} />
        <Field label="Regulatory body / bar association" value={s.regulatoryBody} />
        <Field label="Secondary jurisdiction" value={s.secondaryJurisdiction} />
      </Section>

      <Section title="Practice Areas">
        <Field
          label="Primary"
          value={s.primaryPracticeArea === 'other' ? s.primaryPracticeAreaOther : s.primaryPracticeArea}
        />
        <Field label="Secondary" value={s.secondaryPracticeAreas.join(', ')} />
      </Section>

      <Section title="Current AI Use">
        <Field label="Currently using AI" value={ANSWER_LABEL[s.currentlyUsingAi]} />
        <Field label="Tools in use" value={s.aiToolsInUse} />
        <Field label="Has formal AI policy" value={ANSWER_LABEL[s.hasAiPolicy]} />
        <Field label="Clients asked about AI use" value={ANSWER_LABEL[s.clientsAskedAboutAi]} />
      </Section>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">CLEAR TRUST Self-Assessment</h2>
        <div className="grid grid-cols-2 gap-3">
          {CLEAR_TRUST_ROWS.map(row => (
            <div key={row.key} className="flex justify-between text-sm border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">{row.label}</span>
              <span className="font-medium text-gray-900">{ANSWER_LABEL[s[row.key] as string]}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          No score is calculated for Global submissions — these raw answers are provided for the
          manual report author to weigh according to the firm&apos;s jurisdiction.
        </p>
      </div>

      <Section title="Additional Context">
        <Field label="Biggest AI concern" value={s.biggestConcern} />
        <Field label="What would help most" value={s.whatWouldHelpMost} />
        <Field label="Permission to contact" value={s.contactPermission ? 'Yes' : 'No'} />
        <Field label="Submitted" value={s.createdAt.toLocaleString('en-GB')} />
      </Section>
    </div>
  );
}
