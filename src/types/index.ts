import type { DimensionKey } from '@/lib/constants';

export type SelfAssessmentAnswer = 'YES' | 'NOT_SURE' | 'NO';
export type FirmSizeBand = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
export type EUFacingAnswer = 'YES' | 'NO' | 'NOT_SURE';
export type ScoreBandLabel = 'EXPOSED' | 'DEVELOPING' | 'IN_CONTROL';

export interface IntakeData {
  firmName: string;
  firmWebsite: string;
  city: string;
  country: string;
  practiceTypes: string[];
  firmSize: FirmSizeBand | '';
  euFacing: EUFacingAnswer | '';
  workEmail: string;
}

export type SelfAssessmentAnswers = Record<DimensionKey, SelfAssessmentAnswer | ''>;

export interface SubmitPayload {
  intake: IntakeData;
  selfAssessment: SelfAssessmentAnswers;
  consentGiven: boolean;
}

export interface DimensionScore {
  key: DimensionKey;
  name: string;
  letter: string;
  score: number;
  answer: SelfAssessmentAnswer;
}

export interface ClearTrustScores {
  dimensions: DimensionScore[];
  headline: number;
  band: ScoreBandLabel;
  bandDisplayName: string;
  bandColour: string;
}

export interface ReportSection {
  title: string;
  body: string;
}

export interface ReportOpportunity {
  title: string;
  benefit: string;
  toolCategory: string;
}

export interface ReportExposure {
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface GeneratedReportContent {
  cover: {
    firmName: string;
    date: string;
    disclaimer: string;
  };
  scoreNarrative: string;
  regulatoryMap: {
    sra: string;
    ukGdpr: string;
    pii: string;
    clientProcurement: string;
    euAiAct?: string;
  };
  shadowAi: string;
  opportunities: ReportOpportunity[];
  exposures: ReportExposure[];
  upsell: string;
}

export interface SubmitResponse {
  submissionId: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETE' | 'FAILED';
}

export interface ReportStatusResponse {
  status: string;
  scores?: ClearTrustScores;
  report?: GeneratedReportContent;
  pdfUrl?: string;
  error?: string;
}

// ─── Global / Worldwide Snapshot ────────────────────────────────────────────
// Separate from the UK types above by design — see prisma/schema.prisma
// GlobalSubmission model comment. No score types here: the Global pathway
// does not calculate or display any score.

export type YesNoAnswer = 'YES' | 'NO';

export interface GlobalContactInfo {
  contactName: string;
  firmName: string;
  firmWebsite: string;
  workEmail: string;
  phone: string;
}

export interface GlobalJurisdictionInfo {
  country: string;
  stateProvince: string;
  secondaryStates: string[];
  regulatoryBody: string;
  secondaryJurisdiction: string;
}

export interface GlobalFirmProfile {
  firmSize: string;
  primaryPracticeArea: string;
  primaryPracticeAreaOther: string;
  secondaryPracticeAreas: string[];
}

export interface GlobalCurrentAiUse {
  currentlyUsingAi: CurrentAiUsageAnswer | '';
  aiToolsInUse: string;
  hasAiPolicy: SelfAssessmentAnswer | '';
  clientsAskedAboutAi: SelfAssessmentAnswer | '';
}

export type CurrentAiUsageAnswer = 'YES' | 'NOT_SURE' | 'NO';

export interface GlobalAdditionalContext {
  biggestConcern: string;
  whatWouldHelpMost: string;
  contactPermission: YesNoAnswer | '';
}

export interface GlobalSubmitPayload {
  contact: GlobalContactInfo;
  jurisdiction: GlobalJurisdictionInfo;
  firmProfile: GlobalFirmProfile;
  currentAiUse: GlobalCurrentAiUse;
  selfAssessment: SelfAssessmentAnswers;
  additionalContext: GlobalAdditionalContext;
}
