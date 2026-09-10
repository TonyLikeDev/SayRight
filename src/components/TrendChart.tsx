"use client";

import { useEffect, useRef, useState } from "react";

export type TrendPoint = {
  /** local date, YYYY-MM-DD */
  day: string;
  label: string;
  avg: number;
  count: number;
};

const HEIGHT = 200;
const M = { top: 14, right: 40, bottom: 26, left: 34 };
const TICKS = [0, 20, 40, 60, 80, 100];
const DAY = 86_400_000;

/** Daily average pronunciation score. One series, so no legend. */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const iw = width - M.left - M.right;
  const ih = HEIGHT - M.top - M.bottom;
  const times = points.map((p) => new Date(p.day + "T12:00:00").getTime());
  const t0 = times[0];
  const span = Math.max(DAY, times[times.length - 1] - t0);
  const x = (i: number) => (points.length === 1 ? M.left + iw / 2 : M.left + ((times[i] - t0) / span) * iw);
  const y = (v: number) => M.top + ih - (v / 100) * ih;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const lastIdx = points.length - 1;
  const xLabels = width > 480 && points.length > 2 ? [0, Math.floor(lastIdx / 2), lastIdx] : [0, lastIdx];

  const nearest = (px: number) => {
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    return best;
  };

  const h = hover != null ? points[hover] : null;

  return (
    <div ref={wrap} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Daily average score over ${points.length} practice days. Latest ${Math.round(points[lastIdx].avg)}.`}
        tabIndex={0}
        className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
        onPointerMove={(e) => setHover(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left))}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover(lastIdx)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover((i) => Math.max(0, (i ?? lastIdx) - 1));
          if (e.key === "ArrowRight") setHover((i) => Math.min(lastIdx, (i ?? lastIdx) + 1));
        }}
      >
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--ink-3)" className="tabular-nums">
              {t}
            </text>
          </g>
        ))}
        {xLabels.map((i, k) => (
          <text
            key={`${i}-${k}`}
            x={x(i)}
            y={HEIGHT - 6}
            fontSize={11}
            fill="var(--ink-3)"
            textAnchor={points.length === 1 ? "middle" : k === 0 ? "start" : k === xLabels.length - 1 ? "end" : "middle"}
          >
            {points[i].label}
          </text>
        ))}

        <path d={area} fill="var(--chart)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--chart)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {h && hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} stroke="var(--ink-3)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(h.avg)} r={5} fill="var(--chart)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
        <circle cx={x(lastIdx)} cy={y(points[lastIdx].avg)} r={4} fill="var(--chart)" stroke="var(--surface)" strokeWidth={2} />
        <text x={x(lastIdx) + 8} y={y(points[lastIdx].avg)} dy="0.32em" fontSize={12} fontWeight={600} fill="var(--ink)">
          {Math.round(points[lastIdx].avg)}
        </text>
      </svg>

      {h && hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-3 py-2 shadow-md"
          style={{
            left: Math.min(width - 70, Math.max(70, x(hover))),
            top: y(h.avg) - 10,
          }}
        >
          <p className="flex items-center gap-2 text-base font-semibold text-ink">
            <span className="h-0.5 w-3 rounded bg-[var(--chart)]" aria-hidden="true" />
            {Math.round(h.avg)}
          </p>
          <p className="whitespace-nowrap text-xs text-ink-2">
            {h.label} · {h.count} {h.count === 1 ? "sentence" : "sentences"}
          </p>
        </div>
      )}
    </div>
  );
}
