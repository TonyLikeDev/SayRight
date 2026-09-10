"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { unlockAudio } from "@/lib/audio/player";
import { BookIcon, ChartIcon, ChatIcon, HomeIcon } from "./icons";

const NAV = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/lessons", label: "Lessons", icon: BookIcon },
  { href: "/talk", label: "Talk", icon: ChatIcon },
  { href: "/progress", label: "Progress", icon: ChartIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ demo, children }: { demo: boolean; children: React.ReactNode }) {
  const pathname = usePathname();

  // iOS only allows sound that starts from a tap; unlock our player on the first one.
  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">S</span>
            SayCoach
          </Link>
          <nav className="hidden gap-1 sm:flex" aria-label="Main">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:font-medium aria-[current=page]:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {demo && (
        <div className="border-b border-line bg-ok-soft">
          <p className="mx-auto max-w-3xl px-4 py-2 text-sm text-ink">
            <span className="font-medium">Demo mode:</span> scores are simulated until you add an Azure Speech key.{" "}
            <Link href="/setup" className="font-medium underline underline-offset-2">
              Set it up
            </Link>
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:pb-16">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-ink-3 aria-[current=page]:text-accent"
            >
              <Icon size={22} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
