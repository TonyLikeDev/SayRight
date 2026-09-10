"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSoundTip } from "@/data/sounds";
import { clearAttempts, listAttempts, soundStats, type Attempt } from "@/lib/progress";
import { band, bandFill, bandSoft, bandText } from "@/lib/score";
import { TrendChart, type TrendPoint } from "./TrendChart";
import { Card } from "./ui";

const DAY = 86_400_000;

function dayKey(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function StatTile({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-2">{sub}</p>}
    </div>
  );
}

export function ProgressView() {
  const [data, setData] = useState<{ attempts: Attempt[]; demo: boolean; now: number } | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    listAttempts()
      .then((all) => {
        const real = all.filter((a) => !a.demo);
        const now = Date.now();
        setData(real.length ? { attempts: real, demo: false, now } : { attempts: all, demo: all.length > 0, now });
      })
      .catch(() => setData({ attempts: [], demo: false, now: Date.now() }));
  }, []);

  const view = useMemo(() => {
    if (!data?.attempts.length) return null;
    const { attempts, now } = data;

    const byDay = new Map<string, number[]>();
    for (const a of attempts) byDay.set(dayKey(a.at), [...(byDay.get(dayKey(a.at)) ?? []), a.scores.pron]);
    const points: TrendPoint[] = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([day, scores]) => ({
        day,
        label: new Date(day + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        avg: mean(scores)!,
        count: scores.length,
      }));

    const week = mean(attempts.filter((a) => a.at > now - 7 * DAY).map((a) => a.scores.pron));
    const prevWeek = mean(attempts.filter((a) => a.at <= now - 7 * DAY && a.at > now - 14 * DAY).map((a) => a.scores.pron));

    let streak = 0;
    // Days in a row, counting back from today (or yesterday, if today isn't done yet).
    for (let t = now; ; t -= DAY) {
      if (byDay.has(dayKey(t))) streak++;
      else if (streak > 0 || t !== now) break;
    }

    return {
      points,
      week,
      delta: week != null && prevWeek != null ? week - prevWeek : null,
      days: byDay.size,
      streak,
      sounds: soundStats(attempts)
        .filter((s) => getSoundTip(s.key))
        .slice(0, 8),
      recent: attempts.slice(-12).reverse(),
    };
  }, [data]);

  if (!data) return <p className="text-ink-2">Loading your progress…</p>;

  if (!view) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Progress</h1>
        <Card>
          <p className="font-medium text-ink">Nothing here yet</p>
          <p className="mt-1 text-ink-2">
            Every sentence you record is saved on this device. Practice a few and your scores and weak sounds will
            show up here.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/lessons" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
              Start a lesson
            </Link>
            <Link href="/talk" className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink">
              Try conversation
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const deltaText =
    view.delta == null ? "Last 7 days" : `${view.delta >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(view.delta))} vs the week before`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Progress</h1>
        <p className="mt-2 text-ink-2">Saved on this device only.</p>
      </header>

      {data.demo && (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ink">
          These are <span className="font-medium">simulated demo scores</span>. Once your Azure key is set up, real
          results replace them here.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Sentences practiced" value={String(data.attempts.length)} sub={`on ${view.days} ${view.days === 1 ? "day" : "days"}`} />
        <StatTile
          label="Average score"
          value={view.week != null ? String(Math.round(view.week)) : "–"}
          sub={
            <span className={view.delta == null ? "" : view.delta >= 0 ? "text-good" : "text-bad"}>{deltaText}</span>
          }
        />
        <StatTile label="Current streak" value={`${view.streak} ${view.streak === 1 ? "day" : "days"}`} sub="Practice daily to keep it going" />
      </div>

      <Card>
        <p className="font-semibold text-ink">Pronunciation score by day</p>
        <p className="mt-0.5 text-sm text-ink-2">Average of every sentence you recorded that day (0 to 100).</p>
        <div className="mt-4">
          <TrendChart points={view.points} />
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-2">Show as table</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-ink-3">
                <tr>
                  <th className="py-1.5 font-medium">Day</th>
                  <th className="py-1.5 font-medium">Sentences</th>
                  <th className="py-1.5 text-right font-medium">Average</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...view.points].reverse().map((p) => (
                  <tr key={p.day} className="border-t border-line">
                    <td className="py-1.5 text-ink">{p.label}</td>
                    <td className="py-1.5 text-ink-2">{p.count}</td>
                    <td className="py-1.5 text-right text-ink">{Math.round(p.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <Card>
        <p className="font-semibold text-ink">Your sounds, weakest first</p>
        <p className="mt-0.5 text-sm text-ink-2">Average score for each sound across all your recordings.</p>
        {view.sounds.length === 0 ? (
          <p className="mt-4 text-sm text-ink-2">Record a few more sentences to see which sounds need work.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {view.sounds.map((s) => {
              const tip = getSoundTip(s.key)!;
              const b = band(s.avg);
              return (
                <li key={s.key} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 py-3">
                  <span className="ipa text-center text-lg font-semibold text-ink">{tip.label}</span>
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-ink">{tip.name}</span>
                      <span className="tabular-nums text-ink">{Math.round(s.avg)}</span>
                    </div>
                    <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${bandSoft[b]}`}>
                      <div className={`h-full rounded-full ${bandFill[b]}`} style={{ width: `${Math.max(2, s.avg)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-ink-3">
                      Heard {s.count} times · {s.misses} under 60
                    </p>
                  </div>
                  <Link
                    href={`/practice?sound=${encodeURIComponent(s.key)}`}
                    className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-accent hover:text-accent"
                  >
                    Practice
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <p className="font-semibold text-ink">Recent sentences</p>
        <ul className="mt-2 divide-y divide-line">
          {view.recent.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span className={`w-9 shrink-0 text-right text-lg font-semibold tabular-nums ${bandText[band(a.scores.pron)]}`}>
                {a.scores.pron}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{a.text}</p>
                <p className="text-xs text-ink-3">
                  {new Date(a.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  {" · "}
                  {{ lesson: "Lesson", custom: "Your sentence", talk: "Conversation", drill: "Sound drill" }[a.mode]}
                </p>
              </div>
              {a.mode !== "talk" && (
                <Link
                  href={`/practice?text=${encodeURIComponent(a.text)}`}
                  className="shrink-0 text-sm font-medium text-accent hover:underline"
                >
                  Again
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex items-center justify-end gap-3 text-sm">
        {confirming ? (
          <>
            <span className="text-ink-2">Delete all history on this device?</span>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await clearAttempts();
                setConfirming(false);
                setData({ attempts: [], demo: false, now: Date.now() });
              }}
              className="rounded-full bg-bad px-3 py-1.5 font-medium text-white"
            >
              Delete
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="text-ink-3 hover:text-ink">
            Clear history
          </button>
        )}
      </div>
    </div>
  );
}
