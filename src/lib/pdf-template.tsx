import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from '@react-pdf/renderer';
import type { GeneratedReportContent, ClearTrustScores } from '@/types';
import type { ResolvedNextStep } from '@/config/next-steps';
import { regulatoryLabels } from './report-data';
import { CLEAR_TRUST_DIMENSIONS } from './constants';

const UNKNOWN_GREY = '#9ca3af';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY  = '#1a3a6b';
const GOLD  = '#B8902A';
const WHITE = '#ffffff';
const LIGHT_BG = '#f7f8fc';
const GREY_TEXT = '#4b5563';
const BORDER = '#d1d9e6';
const STEEL = '#5b7fa6';

const SEVERITY_COLOUR: Record<string, string> = {
  HIGH:   '#ef4444',
  MEDIUM: '#f59e0b',
  LOW:    '#22c55e',
};

function scoreBarColor(score: number): string {
  if (score >= 70) return GOLD;
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // ── Pages ──────────────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: NAVY,
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    color: WHITE,
  },
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 50,
    backgroundColor: WHITE,
  },

  // ── Cover elements ─────────────────────────────────────────────────────────
  coverTopBar: {
    backgroundColor: '#0f2448',
    paddingHorizontal: 50,
    paddingVertical: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverNlBox: {
    width: 38,
    height: 38,
    backgroundColor: NAVY,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coverNlText: {
    color: WHITE,
    fontFamily: 'Times-Bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  coverBrandCol: { flexDirection: 'column' },
  coverWordmark: { fontFamily: 'Helvetica-Bold', fontSize: 15, letterSpacing: 1, color: WHITE },
  coverWordmarkGold: { color: GOLD },
  coverTagline: { fontSize: 7, color: STEEL, letterSpacing: 2.5, marginTop: 2, textTransform: 'uppercase' },

  coverGoldLine: { height: 2, backgroundColor: GOLD },

  coverBody: { paddingHorizontal: 50, paddingTop: 52, flex: 1 },
  coverReportType: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, marginBottom: 16 },
  coverTitle: { fontFamily: 'Times-Bold', fontSize: 34, lineHeight: 1.2, color: WHITE, marginBottom: 8 },
  coverFirmName: { fontSize: 14, color: WHITE, opacity: 0.8, marginBottom: 48 },

  coverScorePanel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 4,
    paddingHorizontal: 28,
    paddingVertical: 20,
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  coverScoreLabel: { fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase', color: GOLD, marginBottom: 6 },
  coverScoreNumber: { fontFamily: 'Times-Bold', fontSize: 56, color: WHITE, lineHeight: 1 },
  coverScoreOutOf: { fontSize: 11, color: WHITE, opacity: 0.5, marginBottom: 4 },
  coverBandLabel: { fontSize: 13, color: GOLD, marginTop: 4, fontFamily: 'Helvetica-Bold' },

  coverMeta: { fontSize: 8.5, color: WHITE, opacity: 0.5 },
  coverDisclaimer: { fontSize: 7.5, color: WHITE, opacity: 0.35, marginTop: 6, lineHeight: 1.55 },

  // ── Section header bar ─────────────────────────────────────────────────────
  sectionHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 50,
    paddingVertical: 13,
    marginHorizontal: -50,
    marginTop: -48,
    marginBottom: 4,
  },
  sectionHeaderText: { color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 12, letterSpacing: 1.5 },
  sectionGoldLine: { height: 2, backgroundColor: GOLD, marginHorizontal: -50, marginBottom: 22 },

  // ── Typography ─────────────────────────────────────────────────────────────
  h2: { fontFamily: 'Times-Bold', fontSize: 13, color: NAVY, marginBottom: 6, marginTop: 20 },
  h3: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: NAVY, marginBottom: 4, marginTop: 12 },
  body: { fontSize: 9.5, color: GREY_TEXT, lineHeight: 1.65, marginBottom: 6 },

  // ── Score rows ─────────────────────────────────────────────────────────────
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  scoreLetter: {
    width: 22, height: 22, borderRadius: 3, backgroundColor: NAVY,
    color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 9,
    textAlign: 'center', paddingTop: 6,
  },
  scoreName: { flex: 1, fontSize: 9.5, color: GREY_TEXT, marginLeft: 8 },
  scoreBar: { width: 120, height: 7, backgroundColor: '#e5e7eb', borderRadius: 3, marginRight: 8 },
  scoreBarFill: { height: 7, borderRadius: 3 },
  scoreValue: { width: 28, fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: NAVY },

  // ── Opportunity cards ──────────────────────────────────────────────────────
  card: {
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  cardNum: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: GOLD,
    color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 8,
    textAlign: 'center', paddingTop: 4, marginBottom: 6,
  },
  cardTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: NAVY, marginBottom: 3 },
  cardBody: { fontSize: 9, color: GREY_TEXT, lineHeight: 1.55 },
  cardTag: { fontSize: 8, color: GOLD, marginTop: 5, fontFamily: 'Helvetica-Bold' },

  // ── Exposure cards ─────────────────────────────────────────────────────────
  exposureCard: {
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: BORDER,
  },
  exposureSeverityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 5,
  },
  exposureSeverityText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: 1 },

  // ── Regulatory tabs ────────────────────────────────────────────────────────
  regTab: {
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 11,
    marginBottom: 8,
    borderLeftWidth: 2.5,
    borderLeftColor: NAVY,
  },
  regTabLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: GOLD, marginBottom: 5, letterSpacing: 0.5 },

  // ── Upsell ─────────────────────────────────────────────────────────────────
  upsellBox: {
    backgroundColor: NAVY,
    borderRadius: 6,
    padding: 24,
    marginTop: 20,
  },
  upsellEyebrow: { fontSize: 8, color: GOLD, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Helvetica-Bold' },
  upsellTitle: { fontFamily: 'Times-Bold', fontSize: 16, color: WHITE, marginBottom: 10 },
  upsellBody: { fontSize: 9.5, color: WHITE, opacity: 0.85, lineHeight: 1.65, marginBottom: 16 },
  upsellUrl: { fontSize: 9, color: GOLD, fontFamily: 'Helvetica-Bold', textDecoration: 'none', marginTop: 8 },
  upsellButton: { fontSize: 10, color: NAVY, backgroundColor: GOLD, fontFamily: 'Helvetica-Bold', padding: 8, textDecoration: 'none', marginBottom: 6 },
  upsellLinkDark: { fontSize: 9, color: NAVY, fontFamily: 'Helvetica-Bold', textDecoration: 'none', marginTop: 4 },
  upsellGoldLine: { height: 1, backgroundColor: GOLD, opacity: 0.4, marginBottom: 14 },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 50,
  },
  footerLine: { borderTopWidth: 0.5, borderTopColor: GOLD, opacity: 0.5, marginBottom: 6 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { fontSize: 7.5, color: GREY_TEXT, opacity: 0.65 },
  footerRight: { fontSize: 7.5, color: GREY_TEXT, opacity: 0.65 },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function Footer({ firmName }: { firmName: string }) {
  return (
    <View style={S.footer} fixed>
      <View style={S.footerLine} />
      <View style={S.footerRow}>
        <Text style={S.footerLeft}>NexterLaw · CLEAR TRUST AI Readiness Report · {firmName}</Text>
        <Text style={S.footerRight} render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        } />
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <>
      <View style={S.sectionHeader}>
        <Text style={S.sectionHeaderText}>{title}</Text>
      </View>
      <View style={S.sectionGoldLine} />
    </>
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────

function CoverPage({
  content,
  scores,
}: {
  content: GeneratedReportContent;
  scores: ClearTrustScores;
}) {
  return (
    <Page size="A4" style={S.coverPage}>
      {/* Top bar with logo */}
      <View style={S.coverTopBar}>
        <View style={S.coverNlBox}>
          <Text style={S.coverNlText}>NL</Text>
        </View>
        <View style={S.coverBrandCol}>
          <Text style={S.coverWordmark}>
            {'NEXTER'}
            <Text style={S.coverWordmarkGold}>{'LAW'}</Text>
          </Text>
          <Text style={S.coverTagline}>AI Governance  ·  Ethics  ·  Regulations</Text>
        </View>
      </View>

      {/* Gold accent line */}
      <View style={S.coverGoldLine} />

      {/* Body */}
      <View style={S.coverBody}>
        <Text style={S.coverReportType}>AI Readiness Snapshot Report</Text>
        <Text style={S.coverTitle}>CLEAR TRUST{'\n'}Assessment</Text>
        <Text style={S.coverFirmName}>{content.cover.firmName}</Text>

        {/* Score panel */}
        <View style={S.coverScorePanel}>
          <Text style={S.coverScoreLabel}>Overall Score</Text>
          <Text style={S.coverScoreNumber}>{Math.round(scores.headline)}</Text>
          <Text style={S.coverScoreOutOf}>out of 100</Text>
          <Text style={S.coverBandLabel}>{scores.bandDisplayName}</Text>
        </View>

        <Text style={S.coverMeta}>Prepared: {content.cover.date}</Text>
        <Text style={S.coverDisclaimer}>{content.cover.disclaimer}</Text>
      </View>
    </Page>
  );
}

// ── Score page ────────────────────────────────────────────────────────────────

function ScorePage({
  content,
  scores,
}: {
  content: GeneratedReportContent;
  scores: ClearTrustScores;
}) {
  return (
    <Page size="A4" style={S.page}>
      <SectionHeader title="YOUR CLEAR TRUST SCORE" />

      {content.scoreNarrative.split('\n\n').map((para, i) => (
        <Text key={i} style={S.body}>{para.trim()}</Text>
      ))}

      <View wrap={false}>
        <Text style={S.h2}>Dimension Breakdown</Text>
        {scores.dimensions.map(d => {
          // "Not sure" is uncertainty, not a gap: grey and labelled Unknown.
          const fill = d.answer === 'NOT_SURE' ? UNKNOWN_GREY : scoreBarColor(d.score);
          return (
            <View key={d.key} style={S.scoreRow}>
              <Text style={S.scoreLetter}>{d.letter}</Text>
              <Text style={S.scoreName}>{d.name}{d.answer === 'NOT_SURE' ? ' (Unknown)' : ''}</Text>
              <View style={S.scoreBar}>
                <View style={[S.scoreBarFill, { width: `${d.score}%` as unknown as number, backgroundColor: fill }]} />
              </View>
              <Text style={[S.scoreValue, { color: fill }]}>{Math.round(d.score)}</Text>
            </View>
          );
        })}
      </View>

      <Footer firmName={content.cover.firmName} />
    </Page>
  );
}

// ── Regulatory map page ───────────────────────────────────────────────────────

function RegulatoryMapPage({ content, path }: { content: GeneratedReportContent; path: 'UK' | 'GLOBAL' }) {
  const ukLabels = {
    sra: 'SRA Code of Conduct & AI Governance',
    ukGdpr: 'UK GDPR & Data Protection Act 2018',
    pii: 'Professional Indemnity Insurance',
    clientProcurement: 'Client Procurement & ESG Due Diligence',
    euAiAct: 'EU AI Act',
  };
  const labels = path === 'UK' ? ukLabels : regulatoryLabels('GLOBAL');
  const sections: { label: string; key: keyof typeof content.regulatoryMap }[] = [
    { label: labels.sra, key: 'sra' },
    { label: labels.ukGdpr, key: 'ukGdpr' },
    { label: labels.pii, key: 'pii' },
    { label: labels.clientProcurement, key: 'clientProcurement' },
  ];
  if (content.regulatoryMap.euAiAct) {
    sections.push({ label: labels.euAiAct, key: 'euAiAct' });
  }

  return (
    <Page size="A4" style={S.page}>
      <SectionHeader title="REGULATORY PRESSURE MAP" />

      {sections.map(({ label, key }) => {
        const text = content.regulatoryMap[key];
        if (!text) return null;
        return (
          <View key={key} style={S.regTab} wrap={false}>
            <Text style={S.regTabLabel}>{label.toUpperCase()}</Text>
            {String(text).split('\n\n').map((para, i) => (
              <Text key={i} style={S.body}>{para.trim()}</Text>
            ))}
          </View>
        );
      })}

      <Footer firmName={content.cover.firmName} />
    </Page>
  );
}

// ── Shadow AI page ────────────────────────────────────────────────────────────

function ShadowAiPage({ content }: { content: GeneratedReportContent }) {
  return (
    <Page size="A4" style={S.page}>
      <SectionHeader title="SHADOW AI RISK" />

      {content.shadowAi.split('\n\n').map((para, i) => (
        <Text key={i} style={S.body}>{para.trim()}</Text>
      ))}

      <Footer firmName={content.cover.firmName} />
    </Page>
  );
}

// ── Opportunities page ────────────────────────────────────────────────────────

function OpportunitiesPage({ content }: { content: GeneratedReportContent }) {
  return (
    <Page size="A4" style={S.page}>
      <SectionHeader title="AI OPPORTUNITIES FOR YOUR PRACTICE" />

      {content.opportunities.map((opp, i) => (
        <View key={i} style={S.card} wrap={false}>
          <Text style={S.cardNum}>{i + 1}</Text>
          <Text style={S.cardTitle}>{opp.title}</Text>
          <Text style={S.cardBody}>{opp.benefit}</Text>
          <Text style={S.cardTag}>Tool category: {opp.toolCategory}</Text>
        </View>
      ))}

      <Footer firmName={content.cover.firmName} />
    </Page>
  );
}

// ── Exposures page ────────────────────────────────────────────────────────────

function ExposuresPage({ content }: { content: GeneratedReportContent }) {
  return (
    <Page size="A4" style={S.page}>
      <SectionHeader title="KEY RISK EXPOSURES" />

      {content.exposures.map((exp, i) => {
        const severityColor = SEVERITY_COLOUR[exp.severity] ?? '#6b7280';
        return (
          <View key={i} style={[S.exposureCard, { borderLeftColor: severityColor }]} wrap={false}>
            <View style={[S.exposureSeverityBadge, { backgroundColor: severityColor }]}>
              <Text style={S.exposureSeverityText}>{exp.severity}</Text>
            </View>
            <Text style={S.cardTitle}>{exp.title}</Text>
            <Text style={S.cardBody}>{exp.description}</Text>
          </View>
        );
      })}

      <Footer firmName={content.cover.firmName} />
    </Page>
  );
}

// ── Quick wins, intake and 90-day plan (v2) ─────────────────────────────────────

function ActionPlanPage({
  content,
  planLinks,
}: {
  content: GeneratedReportContent;
  planLinks: Record<string, { title: string; href: string }>;
}) {
  const dimName = (key: string) => CLEAR_TRUST_DIMENSIONS.find(d => d.key === key)?.name ?? key;
  return (
    <Page size="A4" style={S.page}>
      <SectionHeader title="YOUR ACTION PLAN" />

      {content.quickWins?.length ? (
        <View>
          <Text style={S.h2}>Three quick wins</Text>
          {content.quickWins.map((w, i) => (
            <View key={i} style={S.card} wrap={false}>
              <Text style={S.cardNum}>{i + 1}</Text>
              <Text style={S.cardTitle}>{w.title}</Text>
              <Text style={S.cardBody}>{w.action}</Text>
              <Text style={S.cardTag}>Dimension: {dimName(w.dimension)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {content.intakeNote ? (
        <View wrap={false}>
          <Text style={S.h2}>Client intake</Text>
          <Text style={S.body}>{content.intakeNote}</Text>
        </View>
      ) : null}

      {content.plan90Day?.length ? (
        <View>
          <Text style={S.h2}>Your 90-day plan</Text>
          {content.plan90Day.map((step, i) => {
            const link = planLinks[step.resourceId];
            return (
              <View key={i} style={S.card} wrap={false}>
                <Text style={S.cardTag}>{step.window}</Text>
                <Text style={S.cardTitle}>{step.title}</Text>
                <Text style={S.cardBody}>{step.action}</Text>
                {link ? (
                  <Link src={link.href} style={S.upsellLinkDark}>{link.title} →</Link>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <Footer firmName={content.cover.firmName} />
    </Page>
  );
}

// ── Next step page (same block as the results page, with clickable links) ───────

function NextStepPage({ content, nextStep }: { content: GeneratedReportContent; nextStep: ResolvedNextStep | null }) {
  return (
    <Page size="A4" style={S.page}>
      <SectionHeader title="YOUR NEXT STEP" />

      <View style={S.upsellBox}>
        <Text style={S.upsellEyebrow}>Your next step</Text>
        <View style={S.upsellGoldLine} />
        <Text style={S.upsellTitle}>{nextStep ? nextStep.main.label : 'Strengthen Your AI Governance'}</Text>
        <Text style={S.upsellBody}>{content.upsell}</Text>
        {nextStep?.note ? <Text style={S.upsellBody}>{nextStep.note}</Text> : null}
        {nextStep ? (
          <View>
            <Link src={nextStep.main.href} style={S.upsellButton}>{nextStep.main.label} →</Link>
            <Link src={nextStep.secondary.href} style={S.upsellUrl}>{nextStep.secondary.label} →</Link>
          </View>
        ) : (
          <Link src="https://nexterlaw.com" style={S.upsellUrl}>nexterlaw.com</Link>
        )}
      </View>

      <Footer firmName={content.cover.firmName} />
    </Page>
  );
}

// ── Main document ─────────────────────────────────────────────────────────────

export interface ReportPdfProps {
  content: GeneratedReportContent;
  scores: ClearTrustScores;
  nextStep?: ResolvedNextStep | null;
  planLinks?: Record<string, { title: string; href: string }>;
  path?: 'UK' | 'GLOBAL';
}

export function ReportPdf({ content, scores, nextStep = null, planLinks = {}, path = 'UK' }: ReportPdfProps) {
  return (
    <Document
      title={`AI Readiness Report — ${content.cover.firmName}`}
      author="NexterLaw"
      subject="CLEAR TRUST AI Readiness Snapshot"
      creator="NexterLaw AI Readiness Platform"
    >
      <CoverPage content={content} scores={scores} />
      <ScorePage content={content} scores={scores} />
      <RegulatoryMapPage content={content} path={path} />
      <ShadowAiPage content={content} />
      <OpportunitiesPage content={content} />
      <ExposuresPage content={content} />
      {content.quickWins?.length || content.plan90Day?.length || content.intakeNote ? (
        <ActionPlanPage content={content} planLinks={planLinks} />
      ) : null}
      <NextStepPage content={content} nextStep={nextStep} />
    </Document>
  );
}
