import { band, bandColor, bandFill, bandSoft, verdict } from "@/lib/score";
import type { Assessment } from "@/lib/speech/types";

export function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = Math.round(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={bandColor[band(score)]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-2xl font-semibold text-ink">{value}</span>
    </div>
  );
}

function Meter({ label, hint, value }: { label: string; hint: string; value: number }) {
  const b = band(value);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink">
          {label} <span className="font-normal text-ink-3">· {hint}</span>
        </span>
        <span className="tabular-nums text-ink">{Math.round(value)}</span>
      </div>
      <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${bandSoft[b]}`}>
        <div className={`h-full rounded-full ${bandFill[b]}`} style={{ width: `${Math.max(2, value)}%` }} />
      </div>
    </div>
  );
}

export function ScoreSummary({ result }: { result: Assessment }) {
  const rows = [
    { label: "Accuracy", hint: "each sound", value: result.accuracy },
    { label: "Fluency", hint: "smooth, no odd pauses", value: result.fluency },
    ...(result.completeness != null
      ? [{ label: "Completeness", hint: "words you said", value: result.completeness }]
      : []),
    ...(result.prosody != null ? [{ label: "Rhythm", hint: "stress & intonation", value: result.prosody }] : []),
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center sm:gap-8">
      <div className="flex items-center gap-4">
        <ScoreRing score={result.pron} />
        <div>
          <p className="text-sm text-ink-2">
            Pronunciation score
            {result.demo && (
              <span className="ml-2 rounded bg-ok-soft px-1.5 py-0.5 text-[11px] font-medium text-ink">simulated</span>
            )}
          </p>
          <p className="mt-0.5 font-medium leading-snug text-ink">
            {verdict(result.pron, result.words.filter((w) => w.error === "Mispronunciation" || w.error === "Omission").length)}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <Meter key={row.label} {...row} />
        ))}
      </div>
    </div>
  );
}
