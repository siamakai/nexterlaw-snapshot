import { describe, expect, it } from 'vitest';
import type { GlobalSubmission } from '@prisma/client';
import { globalNotificationHtml } from '@/lib/email';
import { SITE } from '@/config/site';

const submission = {
  id: 'sub_123',
  contactName: 'Jane <script>alert(1)</script> Doe',
  firmName: 'Doe & Partners',
  firmWebsite: 'doe.law',
  workEmail: 'jane@doe.law',
  phone: '+1 555 0100',
  country: 'United States',
  stateProvince: 'California',
  secondaryStates: ['Nevada'],
  regulatoryBody: null,
  secondaryJurisdiction: 'Also licensed in England',
  firmSize: '2-10',
  primaryPracticeArea: 'family-law',
  primaryPracticeAreaOther: null,
  secondaryPracticeAreas: ['criminal-law'],
  currentlyUsingAi: 'YES',
  aiToolsInUse: 'ChatGPT, Clio Duo',
  hasAiPolicy: 'NO',
  clientsAskedAboutAi: 'NOT_SURE',
  answerCompliance: 'YES', answerLiteracy: 'NO', answerExplainability: 'NOT_SURE', answerAccountability: 'NO',
  answerRights: 'YES', answerTransparency: 'NO', answerReliability: 'YES', answerUsageGovernance: 'NO',
  answerSecurity: 'NOT_SURE', answerTraceability: 'NO',
  intakeOutOfHours: 'VOICEMAIL_EMAIL', intakeReplySpeed: 'SAME_DAY', intakeVolume: 'UNDER_20', intakeCaseSystem: null,
  intakeRating: 'HIGH',
  scoreHeadline: 35, scoreBand: 'EXPOSED',
  biggestConcern: 'Client confidentiality',
  whatWouldHelpMost: 'A written AI policy',
  marketingConsent: true,
  isTest: false,
  createdAt: new Date('2026-11-13T10:00:00Z'),
} as unknown as GlobalSubmission;

describe('Global team notification email', () => {
  const html = globalNotificationHtml({ submission, dueText: 'Sunday 15 November, 10:00' });

  it('goes to services@nexterai.agency by default', () => {
    expect(SITE.teamInboxEmail).toBe('services@nexterai.agency');
  });

  it('contains every section the firm filled in', () => {
    for (const s of [
      'Doe &amp; Partners', 'jane@doe.law', '+1 555 0100', 'United States', 'California', 'Nevada', 'Also licensed in England',
      '2–10 lawyers', 'Family Law', 'Criminal Law', 'ChatGPT, Clio Duo',
      'Do you disclose AI use to clients?', 'Can you audit which AI was used on a given matter?',
      'Voicemail or email only', 'Same day', 'High opportunity', 'score 35/100, EXPOSED',
      'Client confidentiality', 'A written AI policy', 'Sunday 15 November, 10:00', '/admin/global-submissions/sub_123',
    ]) expect(html).toContain(s);
  });

  it('escapes what the firm typed', () => {
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
