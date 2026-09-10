import type { ButtonHTMLAttributes } from "react";

export function PillButton({
  active,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      className={`inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50 data-[active]:border-accent data-[active]:bg-accent-soft data-[active]:text-accent ${className}`}
      {...props}
    />
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function LevelChip({ level }: { level: string }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium capitalize text-ink-2">{level}</span>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>{children}</div>;
}
