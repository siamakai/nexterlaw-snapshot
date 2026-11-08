'use client';

import { bandMeta, dimensionColour } from '@/lib/bands';
import type { DimensionScore } from '@/types';
import { GOLD, R_BG, R_CREAM, R_MUTED, UNKNOWN_GREY } from './theme';

export function ScoreGauge({ score, band, caption = 'out of 100' }: { score: number; band: string; caption?: string }) {
  const b = bandMeta(band);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-36 h-36 rounded-full flex flex-col items-center justify-center"
        style={{ border: `3px solid ${b.colour}`, backgroundColor: `${b.colour}1a` }}
        role="img" aria-label={`CLEAR TRUST score ${Math.round(score)} out of 100, ${b.displayName}`}>
        <span aria-hidden="true" style={{ color: R_CREAM, fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '3rem', lineHeight: 1 }}>{Math.round(score)}</span>
        <span aria-hidden="true" className="text-xs mt-1" style={{ color: R_MUTED }}>{caption}</span>
      </div>
      <span className="text-xs font-semibold uppercase px-4 py-1.5" style={{ backgroundColor: b.colour, color: '#fff', letterSpacing: '0.05em', borderRadius: 4 }}>
        {b.displayName}
      </span>
    </div>
  );
}

/** "Not sure" is uncertainty, not a gap: grey bar labelled Unknown (spec §2 item 3). */
export function DimensionBar({ d }: { d: DimensionScore }) {
  const unknown = d.answer === 'NOT_SURE';
  const pct = Math.round(d.score);
  const colour = unknown ? UNKNOWN_GREY : dimensionColour(pct);
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: GOLD, color: R_BG, borderRadius: 2 }} aria-hidden="true">
        {d.letter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1.5 gap-2">
          <span className="font-medium truncate" style={{ color: R_CREAM }}>{d.name}</span>
          <span className="font-bold shrink-0" style={{ color: colour }}>{unknown ? 'Unknown' : pct}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
          role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${d.name}: ${unknown ? 'unknown (answered Not sure)' : `${pct} out of 100`}`}>
          <div className="h-1.5 rounded-full transition-all" style={{
            width: `${unknown ? 50 : pct}%`, backgroundColor: colour,
            backgroundImage: unknown ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(13,31,60,0.5) 4px, rgba(13,31,60,0.5) 8px)' : undefined,
          }} />
        </div>
      </div>
    </div>
  );
}
