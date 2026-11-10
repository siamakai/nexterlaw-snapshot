'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ClearTrustScores, GeneratedReportContent, ReportStatusResponse } from '@/types';
import type { ResolvedNextStep } from '@/config/next-steps';
import type { NextBandHint } from '@/lib/scoring';
import type { Benchmark } from '@/lib/benchmark';
import { CLEAR_TRUST_DIMENSIONS } from '@/lib/constants';
import { INTAKE_RATING_LABEL, type IntakeRating } from '@/lib/intake';
import { regulatoryLabels } from '@/lib/report-data';
import { track, scoreBucket } from '@/lib/analytics';
import { NLLogo } from './ui';
import { ScoreGauge, DimensionBar } from './score';
import { GOLD, NAVY, STEEL, R_BG, R_BODY, R_BORDER, R_CARD, R_CREAM, R_MUTED, ERROR } from './theme';

export interface ResultDto {
  path: 'UK' | 'GLOBAL';
  token: string;
  firmName: string;
  country: string;
  status: 'BUILDING' | 'COMPLETE' | 'FAILED' | 'AWAITING_REVIEW';
  createdAt: string;
  dueAt: string | null;
  scores: ClearTrustScores | null;
  hint: NextBandHint | null;
  report: GeneratedReportContent | null;
  pdfUrl: string | null;
  nextStep: ResolvedNextStep;
  intakeRating: IntakeRating | null;
  retakeReminderSet: boolean;
  planLinks: Record<string, { title: string; href: string; type: string }>;
  benchmark: Benchmark | null;
  timeoutSeconds: number;
  globalWaitlist: boolean;
}

const paras = (text: string | undefined) => (text ?? '').split(/\n+/).filter(s => s.trim().length > 0);

// ── Layout pieces (same look as the live results page) ──────────────────────────

function Section({ eyebrow, title, children, accent, id }: { eyebrow: string; title: string; children: ReactNode; accent?: string; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined}
      style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderLeft: accent ? `3px solid ${accent}` : undefined, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ borderBottom: `1px solid ${R_BORDER}`, padding: '20px 24px 16px' }}>
        <p style={{ color: accent ?? GOLD, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 5 }}>{eyebrow}</p>
        <h2 id={id ? `${id}-title` : undefined} style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.2rem', margin: 0, lineHeight: 1.3 }}>{title}</h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Body({ text }: { text: string | undefined }) {
  return (
    <div className="space-y-3">
      {paras(text).map((p, i) => <p key={i} style={{ fontSize: '0.875rem', lineHeight: 1.75, color: R_BODY }}>{p}</p>)}
    </div>
  );
}

function NumberBadge({ n, colour = GOLD }: { n: number; colour?: string }) {
  return (
    <div aria-hidden="true" style={{ width: 40, height: 40, backgroundColor: colour, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: R_BG, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 14 }}>{String(n).padStart(2, '0')}</span>
    </div>
  );
}

// ── Actions ───────────────────────────────────────────────────────────────────

function useAction(token: string) {
  return async (action: 'click' | 'email' | 'reminder') => {
    const res = await fetch(`/api/r/${token}/${action}`, { method: 'POST', keepalive: true });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Something went wrong.');
    return json as { sentTo?: string };
  };
}

function ActionBar({ data }: { data: ResultDto }) {
  const act = useAction(data.token);
  const [msg, setMsg] = useState<string | null>(null);
  const copy = async () => {
    track('share_click', { path: data.path.toLowerCase() });
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMsg('Link copied. Anyone with this link can view the report.');
    } catch {
      setMsg('Copy this page’s address from your browser to share it.');
    }
  };
  const email = async () => {
    track('email_report', { path: data.path.toLowerCase() });
    setMsg('Sending…');
    try {
      const r = await act('email');
      setMsg(`Sent to ${r.sentTo ?? 'your email'}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not send.');
    }
  };
  const btn = 'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2';
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {data.pdfUrl && (
          <a href={data.pdfUrl} download onClick={() => track('pdf_download', { path: data.path.toLowerCase() })} className={btn}
            style={{ backgroundColor: GOLD, color: R_BG, borderRadius: 2, outlineColor: R_CREAM }}>↓ Download PDF</a>
        )}
        {data.status === 'COMPLETE' && (
          <button type="button" onClick={email} className={btn} style={{ border: `1px solid ${R_BORDER}`, color: R_CREAM, borderRadius: 2, outlineColor: GOLD }}>✉ Email me this report</button>
        )}
        <button type="button" onClick={copy} className={btn} style={{ border: `1px solid ${R_BORDER}`, color: R_CREAM, borderRadius: 2, outlineColor: GOLD }}>⧉ Copy link</button>
      </div>
      <p className="text-xs mt-2" style={{ color: R_MUTED, minHeight: '1rem' }} role="status" aria-live="polite">{msg}</p>
    </div>
  );
}

function NextStepBlock({ data, upsell }: { data: ResultDto; upsell?: string }) {
  const act = useAction(data.token);
  const click = (target: 'main' | 'secondary') => {
    track('next_step_click', { route: data.nextStep.route, target, path: data.path.toLowerCase() });
    act('click').catch(() => {});
  };
  const ns = data.nextStep;
  return (
    <section aria-labelledby="next-step-title" style={{ backgroundColor: 'rgba(184,144,42,0.10)', border: `1px solid rgba(184,144,42,0.35)`, borderLeft: `3px solid ${GOLD}`, borderRadius: 4, padding: '22px 24px' }}>
      <p style={{ color: GOLD, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Your next step</p>
      <h2 id="next-step-title" style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.3, marginBottom: 10 }}>
        {ns.note ?? ns.main.label}
      </h2>
      {upsell && <Body text={upsell} />}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5">
        <a href={ns.main.href} onClick={() => click('main')} target="_blank" rel="noopener"
          className="inline-flex justify-center items-center gap-2 px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: GOLD, color: R_BG, borderRadius: 2, outlineColor: R_CREAM }}>
          {ns.main.label} <span aria-hidden="true">→</span>
        </a>
        <a href={ns.secondary.href} onClick={() => click('secondary')} target="_blank" rel="noopener" className="text-sm font-semibold underline text-center" style={{ color: R_CREAM }}>
          {ns.secondary.label}
        </a>
      </div>
      <p className="text-xs mt-3" style={{ color: R_MUTED }}>{ns.brand === 'Skool' ? 'Nexter AI Business Club' : ns.brand}</p>
    </section>
  );
}

function HintLine({ hint }: { hint: NextBandHint | null }) {
  if (!hint) return null;
  if (!hint.next) {
    return <p className="text-sm" style={{ color: R_BODY }}>You are in the top band. Keep it there by reviewing your answers every quarter.</p>;
  }
  const names = hint.changes.map(c => c.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  const allUnknown = hint.changes.every(c => c.from === 'NOT_SURE');
  return (
    <p className="text-sm" style={{ color: R_BODY, lineHeight: 1.7 }}>
      <strong style={{ color: R_CREAM }}>What moves you to {hint.next.displayName}:</strong>{' '}
      {allUnknown ? 'confirming' : 'putting in place'} {list} ({Math.ceil(hint.pointsNeeded)} more points needed).
    </p>
  );
}

// ── Score hero (used by every state) ────────────────────────────────────────────

function ScoreHero({ data, caption }: { data: ResultDto; caption?: string }) {
  const s = data.scores!;
  return (
    <section aria-labelledby="score-title" style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ borderBottom: `1px solid ${R_BORDER}`, padding: '20px 24px 16px' }}>
        <p style={{ color: GOLD, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 5 }}>CLEAR TRUST Score</p>
        <h1 id="score-title" style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.35rem', margin: 0, lineHeight: 1.3 }}>{data.firmName}</h1>
        {caption && <p className="text-xs mt-1" style={{ color: R_MUTED }}>{caption}</p>}
      </div>
      <div className="p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-8">
        <ScoreGauge score={s.headline} band={s.band} />
        <div className="flex-1 w-full"><HintLine hint={data.hint} /></div>
      </div>
    </section>
  );
}

function DimensionsSection({ scores }: { scores: ClearTrustScores }) {
  const anyUnknown = scores.dimensions.some(d => d.answer === 'NOT_SURE');
  return (
    <Section eyebrow="The ten dimensions" title="Your CLEAR TRUST breakdown" id="dimensions">
      <div className="space-y-4">{scores.dimensions.map(d => <DimensionBar key={d.key} d={d} />)}</div>
      {anyUnknown && (
        <p className="text-xs mt-4" style={{ color: R_MUTED }}>&ldquo;Unknown&rdquo; means you answered Not sure: the control may exist, but it needs checking.</p>
      )}
    </Section>
  );
}

// ── States ──────────────────────────────────────────────────────────────────────

function Header({ data }: { data: ResultDto }) {
  return (
    <>
      <header className="px-4 sm:px-6 py-4 flex justify-between items-center max-w-4xl mx-auto w-full">
        <Link href="/" aria-label="NexterLaw AI Readiness Snapshot home"><NLLogo size="sm" /></Link>
        {data.pdfUrl && (
          <a href={data.pdfUrl} download onClick={() => track('pdf_download', { path: data.path.toLowerCase() })}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold" style={{ backgroundColor: GOLD, color: R_BG, borderRadius: 2 }}>
            ↓ Download PDF
          </a>
        )}
      </header>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${NAVY} 0%, ${GOLD} 50%, ${NAVY} 100%)` }} />
    </>
  );
}

function Footer({ data }: { data: ResultDto }) {
  const act = useAction(data.token);
  const [reminder, setReminder] = useState(data.retakeReminderSet);
  return (
    <div style={{ borderTop: `1px solid ${R_BORDER}`, paddingTop: 24, paddingBottom: 16 }} className="space-y-4">
      {data.path === 'UK' && data.status === 'COMPLETE' && (
        <div className="text-center">
          {reminder ? (
            <p className="text-sm" style={{ color: R_BODY }} role="status">We&apos;ll remind you to retake the Snapshot in 3 months.</p>
          ) : (
            <button type="button" className="text-sm underline" style={{ color: GOLD }}
              onClick={() => act('reminder').then(() => setReminder(true)).catch(() => {})}>
              Remind me to retake this in 3 months
            </button>
          )}
        </div>
      )}
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: R_MUTED, letterSpacing: '0.02em', lineHeight: 1.7 }}>
        CLEAR TRUST is a proprietary framework by Dr Siamak Goudarzi / NexterLaw.<br />
        This Snapshot is general information, not legal or regulatory advice. © NexterLaw
      </p>
    </div>
  );
}

function Building({ data }: { data: ResultDto }) {
  const router = useRouter();
  const [stage, setStage] = useState('Saving your answers…');
  const [scores, setScores] = useState<ClearTrustScores | null>(data.scores);
  const [failed, setFailed] = useState(data.status === 'FAILED');
  const [elapsed, setElapsed] = useState(() => Math.round((Date.now() - new Date(data.createdAt).getTime()) / 1000));
  const reported = useRef(false);
  const timedOut = elapsed > data.timeoutSeconds;

  useEffect(() => {
    if (failed) {
      if (!reported.current) { reported.current = true; track('report_failed', { path: 'uk' }); }
      return;
    }
    let cancelled = false;
    let errors = 0;
    const poll = async () => {
      try {
        const r = await fetch(`/api/report/${data.token}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const s: ReportStatusResponse = await r.json();
        errors = 0;
        if (cancelled) return;
        if (s.stage) setStage(s.stage);
        if (s.scores) setScores(s.scores);
        if (typeof s.elapsedSeconds === 'number') setElapsed(s.elapsedSeconds);
        if (s.status === 'COMPLETE') {
          track('report_ready', { path: 'uk', band: s.scores?.band, score_bucket: s.scores ? scoreBucket(s.scores.headline) : undefined });
          router.refresh();
          return;
        }
        if (s.status === 'FAILED') { setFailed(true); return; }
      } catch {
        errors += 1; // brief network or rate-limit blips: keep trying
      }
      if (!cancelled) setTimeout(poll, errors ? 3000 * Math.min(errors, 5) : 3000);
    };
    const t = setTimeout(poll, 1500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [data.token, failed, router]);

  // After the timeout or a failure, show the score and promise the report by email (spec §2).
  if ((failed || timedOut) && scores) {
    return (
      <>
        <ScoreHero data={{ ...data, scores }} />
        <section role="status" style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 4, padding: '20px 24px' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Your full report will arrive by email</h2>
          <p className="text-sm" style={{ color: R_BODY, lineHeight: 1.7 }}>
            {failed
              ? 'Writing your full report is taking longer than it should. Your answers are saved and our team has been alerted; the report will be emailed to you, usually within a working day.'
              : 'Writing your full report is taking a little longer than usual. Your answers are saved: you can close this page and the report will arrive by email shortly. This page will also update when it is ready.'}
          </p>
        </section>
        <NextStepBlock data={data} />
        <DimensionsSection scores={scores} />
      </>
    );
  }

  return (
    <section role="status" aria-live="polite" style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 4, padding: '28px 24px' }}>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(184,144,42,0.15)', borderRadius: 2 }}>
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight" style={{ color: R_CREAM, fontFamily: 'var(--font-playfair)' }}>Building your AI Readiness Snapshot</h1>
          <p className="text-sm mt-0.5" style={{ color: R_BODY }}>{stage}</p>
        </div>
      </div>
      {scores && (
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 pt-6" style={{ borderTop: `1px solid ${R_BORDER}` }}>
          <ScoreGauge score={scores.headline} band={scores.band} />
          <p className="text-sm" style={{ color: R_BODY, lineHeight: 1.7 }}>
            Your score is ready. We&apos;re now writing your personalised report: the regulatory picture, three quick wins and a 90-day plan.
          </p>
        </div>
      )}
      {/* While they wait: what CLEAR TRUST stands for (C-L-E-A-R on the left, T-R-U-S-T on the right). */}
      <div className="mb-6">
        <p className="text-center mb-4" style={{ color: GOLD, fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 600 }}>
          What CLEAR TRUST stands for
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 sm:grid-flow-col sm:grid-rows-5">
          {CLEAR_TRUST_DIMENSIONS.map((d, i) => (
            <li key={d.key} className="flex items-start gap-3">
              <span aria-hidden="true" className="animate-pulse shrink-0 flex items-center justify-center"
                style={{ width: 40, height: 40, backgroundColor: GOLD, borderRadius: 6, animationDelay: `${i * 150}ms`, animationDuration: '2.4s' }}>
                <span style={{ color: R_BG, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{d.letter}</span>
              </span>
              <span>
                <span className="block" style={{ color: R_CREAM, fontSize: '0.9rem', fontWeight: 600 }}>{d.name}</span>
                <span className="block" style={{ color: R_BODY, fontSize: '0.78rem', lineHeight: 1.5 }}>{d.description}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-xs text-center" style={{ color: R_MUTED }}>This usually takes about a minute. You can keep this page open, or close it: the report will also be emailed to you.</p>
    </section>
  );
}

function GlobalAwaiting({ data }: { data: ResultDto }) {
  // Formatted in the viewer's own time zone. The server's zone may differ, so the
  // <time> element below suppresses the expected hydration difference.
  const due = data.dueAt
    ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
        .format(new Date(data.dueAt))
    : null;
  return (
    <>
      <section role="status" style={{ backgroundColor: R_CARD, border: `1px solid ${R_BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 4, padding: '24px' }}>
        <p style={{ color: GOLD, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Global Snapshot received</p>
        <h1 style={{ fontFamily: 'var(--font-playfair)', color: R_CREAM, fontWeight: 700, fontSize: '1.4rem', lineHeight: 1.3, marginBottom: 10 }}>
          Thank you. Your assessment is with our team.
        </h1>
        <p className="text-sm" style={{ color: R_BODY, lineHeight: 1.75 }}>
          {data.globalWaitlist || !data.dueAt
            ? <>Your full Global Snapshot for <strong style={{ color: R_CREAM }}>{data.country}</strong> will be prepared as soon as a slot opens; we&apos;ll email you.</>
            : <>Your full Global Snapshot for <strong style={{ color: R_CREAM }}>{data.country}</strong> will arrive by <strong style={{ color: R_CREAM }}><time dateTime={data.dueAt ?? undefined} suppressHydrationWarning>{due}</time></strong>. We&apos;ve emailed you a confirmation, and you can bookmark this page: the report will appear here too.</>}
        </p>
      </section>
      {data.scores && <ScoreHero data={data} caption="Instant score from the universal CLEAR TRUST questions. Your report adds what applies in your jurisdiction." />}
      <NextStepBlock data={data} />
      {data.scores && <DimensionsSection scores={data.scores} />}
    </>
  );
}

function FullReport({ data }: { data: ResultDto }) {
  const r = data.report!;
  const s = data.scores!;
  const labels = regulatoryLabels(data.path);
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    track('report_ready', { path: data.path.toLowerCase(), band: s.band, score_bucket: scoreBucket(s.headline) });
  }, [data.path, s.band, s.headline]);
  const dimName = (key: string) => CLEAR_TRUST_DIMENSIONS.find(d => d.key === key)?.name ?? key;
  const regColours: Record<string, string> = { sra: '#4e88c7', ukGdpr: STEEL, pii: GOLD, clientProcurement: '#8a9bb0', euAiAct: '#c9a030' };

  return (
    <>
      {/* 1. Score + what moves you up */}
      <ScoreHero data={data} />
      <ActionBar data={data} />
      {/* 2. Next step */}
      <NextStepBlock data={data} upsell={r.upsell} />
      {/* 3. Dimensions */}
      <DimensionsSection scores={s} />
      {/* 4. Score summary */}
      {r.scoreNarrative && <Section eyebrow="Score summary" title="What your score means" id="summary"><Body text={r.scoreNarrative} /></Section>}
      {/* 5. Quick wins */}
      {!!r.quickWins?.length && (
        <Section eyebrow="Start this week" title="Three quick wins" id="quick-wins">
          <ol className="space-y-3">
            {r.quickWins.map((w, i) => (
              <li key={i} className="flex gap-4" style={{ padding: '14px 16px', backgroundColor: 'rgba(184,144,42,0.06)', border: '1px solid rgba(184,144,42,0.14)', borderRadius: 2 }}>
                <NumberBadge n={i + 1} />
                <div>
                  <p style={{ color: R_CREAM, fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>{w.title}</p>
                  <p style={{ color: R_BODY, fontSize: '0.85rem', lineHeight: 1.65 }}>{w.action}</p>
                  <p style={{ color: R_MUTED, fontSize: '0.75rem', marginTop: 4 }}>{dimName(w.dimension)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}
      {/* 6. Exposures */}
      {!!r.exposures?.length && (
        <Section eyebrow="Risk assessment" title="Top exposure areas" id="exposures">
          <ul className="space-y-3">
            {r.exposures.slice(0, 5).map((e, i) => {
              const c = e.severity === 'HIGH' ? ERROR : e.severity === 'MEDIUM' ? '#fbbf24' : '#94a3b8';
              return (
                <li key={i} className="flex gap-4" style={{ padding: '14px 16px', border: `1px solid ${c}33`, borderLeft: `3px solid ${c}`, borderRadius: 2 }}>
                  <NumberBadge n={i + 1} colour={c} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p style={{ color: R_CREAM, fontSize: '0.9rem', fontWeight: 600 }}>{e.title}</p>
                      <span style={{ color: c, border: `1px solid ${c}80`, borderRadius: 2, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{e.severity}</span>
                    </div>
                    <p style={{ color: R_BODY, fontSize: '0.85rem', lineHeight: 1.65 }}>{e.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
      {/* 7. Client intake */}
      {(r.intakeNote || data.intakeRating) && (
        <Section eyebrow="Client intake" title={data.intakeRating ? `Intake opportunity: ${INTAKE_RATING_LABEL[data.intakeRating]}` : 'How new clients reach you'} id="intake">
          <Body text={r.intakeNote} />
        </Section>
      )}
      {/* 8. Regulatory map */}
      {r.regulatoryMap && (
        <Section eyebrow={data.path === 'UK' ? 'Regulatory framework' : `Regulatory framework · ${data.country}`} title="Your regulatory pressure map" id="regulatory">
          <div className="space-y-3">
            {(Object.keys(labels) as Array<keyof typeof labels>).filter(k => r.regulatoryMap[k]).map(k => (
              <div key={k} style={{ border: `1px solid ${regColours[k]}33`, borderLeft: `3px solid ${regColours[k]}`, borderRadius: 2, padding: '14px 18px' }}>
                <h3 style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, color: regColours[k] }}>{labels[k]}</h3>
                <Body text={r.regulatoryMap[k]} />
              </div>
            ))}
          </div>
        </Section>
      )}
      {/* 9. Shadow AI */}
      {r.shadowAi && <Section eyebrow="Risk profile" title="Shadow AI: the question most firms cannot answer" accent="#d97706" id="shadow-ai"><Body text={r.shadowAi} /></Section>}
      {/* 10. Opportunities */}
      {!!r.opportunities?.length && (
        <Section eyebrow="Opportunities" title="Top AI opportunities for your practice" id="opportunities">
          <ul className="space-y-3">
            {r.opportunities.slice(0, 5).map((o, i) => (
              <li key={i} className="flex gap-4" style={{ padding: '14px 16px', backgroundColor: 'rgba(184,144,42,0.06)', border: '1px solid rgba(184,144,42,0.14)', borderRadius: 2 }}>
                <NumberBadge n={i + 1} />
                <div>
                  <p style={{ color: R_CREAM, fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>{o.title}</p>
                  <p style={{ color: R_BODY, fontSize: '0.85rem', lineHeight: 1.65 }}>{o.benefit}</p>
                  {o.toolCategory && <p style={{ color: R_MUTED, fontSize: '0.75rem', marginTop: 4, fontStyle: 'italic' }}>e.g. {o.toolCategory}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {/* 11. 90-day plan */}
      {!!r.plan90Day?.length && (
        <Section eyebrow="Your 90-day plan" title="Three steps to the next band" id="plan">
          <ol className="space-y-3">
            {r.plan90Day.map((p, i) => {
              const link = data.planLinks[p.resourceId];
              return (
                <li key={i} style={{ padding: '14px 16px', border: `1px solid ${R_BORDER}`, borderRadius: 2 }}>
                  <p style={{ color: GOLD, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{p.window}</p>
                  <p style={{ color: R_CREAM, fontSize: '0.9rem', fontWeight: 600, margin: '4px 0' }}>{p.title}</p>
                  <p style={{ color: R_BODY, fontSize: '0.85rem', lineHeight: 1.65 }}>{p.action}</p>
                  {link && (
                    <a href={link.href} target="_blank" rel="noopener" className="inline-block mt-2 text-sm font-semibold underline" style={{ color: GOLD }}>
                      {link.title} →
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </Section>
      )}
      {/* 12. Benchmark (only with enough data) */}
      {data.benchmark && (
        <Section eyebrow="Compare" title="How you compare with similar firms" id="benchmark">
          <p className="text-sm" style={{ color: R_BODY, lineHeight: 1.7 }}>
            Firms of your size who took the Snapshot averaged <strong style={{ color: R_CREAM }}>{Math.round(data.benchmark.average)}</strong>.
            Your score is at or above <strong style={{ color: R_CREAM }}>{data.benchmark.percentile}%</strong> of them
            (based on {data.benchmark.sample} completed Snapshots).
          </p>
        </Section>
      )}
      <ActionBar data={data} />
    </>
  );
}

export function ResultsView({ data }: { data: ResultDto }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: R_BG }}>
      <Header data={data} />
      <main id="main" tabIndex={-1} className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-4 outline-none">
        {data.status === 'COMPLETE' && data.report && data.scores && <FullReport data={data} />}
        {(data.status === 'BUILDING' || data.status === 'FAILED') && <Building data={data} />}
        {data.status === 'AWAITING_REVIEW' && <GlobalAwaiting data={data} />}
        <Footer data={data} />
      </main>
    </div>
  );
}
