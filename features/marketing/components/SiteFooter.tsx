import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2 px-7 py-8 text-[14px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <Mark className="size-3.5 text-ink-3" aria-hidden />
          LedgerFlow
        </span>
        <a href="mailto:hello@ledgerflow.in" className="hover:text-ink-2">
          hello@ledgerflow.in
        </a>
        <span className="ml-auto flex gap-4">
          <a href="#" className="hover:text-ink">Terms</a>
          <a href="#" className="hover:text-ink">Privacy</a>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
        </span>
      </div>
    </footer>
  );
}
