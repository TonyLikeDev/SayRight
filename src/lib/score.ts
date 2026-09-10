export type Band = "good" | "ok" | "bad";

export const band = (score: number): Band => (score >= 80 ? "good" : score >= 60 ? "ok" : "bad");

// Literal class names so Tailwind can see them.
export const bandText: Record<Band, string> = { good: "text-good", ok: "text-ok", bad: "text-bad" };
export const bandSoft: Record<Band, string> = { good: "bg-good-soft", ok: "bg-ok-soft", bad: "bg-bad-soft" };
export const bandFill: Record<Band, string> = { good: "bg-good", ok: "bg-ok", bad: "bg-bad" };
export const bandColor: Record<Band, string> = { good: "var(--good)", ok: "var(--ok)", bad: "var(--bad)" };
export const bandLabel: Record<Band, string> = { good: "Good", ok: "Almost", bad: "Needs work" };

/** @param wrongWords words marked wrong or skipped; praise never hides them */
export function verdict(score: number, wrongWords = 0): string {
  if (wrongWords === 1) return "Close. One word needs work, see the red word.";
  if (wrongWords > 1) return `Good try. ${wrongWords} words need work, see the red ones.`;
  if (score >= 90) return "Excellent. That sounded natural.";
  if (score >= 80) return "Great job, just a few small things.";
  if (score >= 60) return "Good try. Work on the underlined words.";
  return "Keep going. Listen to the model, then try again slowly.";
}
