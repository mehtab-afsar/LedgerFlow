"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mark } from "@/components/brand/Mark";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#why", label: "Why" },
  { href: "#how", label: "How it works" },
  { href: "#outstanding", label: "Outstanding" },
];

/**
 * Sticky 64px bar, same discipline as LogiFlow's SiteNav. LedgerFlow is
 * self-serve, so the primary action is "Start free" straight into /start —
 * there is no sales-demo funnel to protect.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-white/90 backdrop-blur-sm transition-colors duration-150",
        scrolled ? "border-line" : "border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-7">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-brand text-white">
            <Mark className="size-4" aria-hidden />
          </span>
          LedgerFlow
        </Link>

        <ul className="ml-4 hidden items-center gap-7 min-[860px]:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[15px] text-ink-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-[8px] px-3 py-2 text-[15px] text-ink-2 hover:text-ink min-[860px]:block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand"
          >
            Sign in
          </Link>
          <Link
            href="/start"
            className="rounded-[8px] bg-ink px-4 py-[9px] text-[14px] font-medium text-white transition-colors duration-150 hover:bg-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand"
          >
            Start free
          </Link>
        </div>
      </nav>
    </header>
  );
}
