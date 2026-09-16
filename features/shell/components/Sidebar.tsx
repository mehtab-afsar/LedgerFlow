"use client";

import { useRef, useState } from "react";
import type { FocusEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  PackageCheck,
  Users,
  Wallet,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Mark } from "@/components/brand/Mark";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type NavChild = { href: string; label: string };
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; children?: NavChild[] };

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/outstanding", label: "Outstanding" },
      { href: "/dashboard/activity", label: "Activity" },
    ],
  },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/service-completions", label: "Services", icon: PackageCheck },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

const CLOSE_DELAY_MS = 100;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Hover-expand icon rail, state-driven rather than CSS-only. A plain
 * `:focus-within` trigger (the original approach, shared with LogiFlow's
 * Sidebar) keeps the rail pinned open after a nav Link is clicked, because
 * the clicked link keeps browser focus until something else takes it — the
 * mouse leaving doesn't help since CSS has no "leave" signal independent of
 * focus. `open` state driven explicitly by pointer and focus events fixes
 * that: leaving with the mouse always closes it, click or not.
 */
export function Sidebar({ orgName, userName }: { orgName: string; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Which group's flyout is showing — a hover-driven side panel next to the
  // row, same convention as the rail's own hover-to-open, not an accordion
  // that shoves the rest of the nav down.
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const flyoutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openFlyout(href: string) {
    if (flyoutCloseTimer.current) {
      clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
    setFlyoutGroup(href);
  }

  function closeFlyoutSoon() {
    if (flyoutCloseTimer.current) clearTimeout(flyoutCloseTimer.current);
    flyoutCloseTimer.current = setTimeout(() => setFlyoutGroup(null), CLOSE_DELAY_MS);
  }

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openNow() {
    clearCloseTimer();
    setOpen(true);
  }

  function closeSoon() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  // Clicking any destination — a top-level link or a flyout item — closes
  // the rail immediately rather than leaving it pinned open until the mouse
  // physically leaves. It reopens the same way as ever on the next hover.
  function closeAll() {
    clearCloseTimer();
    setOpen(false);
    if (flyoutCloseTimer.current) {
      clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
    setFlyoutGroup(null);
  }

  // React's onBlur bubbles (unlike the native DOM event), so one handler on
  // the <aside> covers every link/button inside it. relatedTarget is where
  // focus is going next — only close if that's outside the sidebar.
  function handleBlur(e: FocusEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setOpen(false);
      setFlyoutGroup(null);
    }
  }

  async function signOut() {
    closeAll();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative w-[60px] shrink-0" aria-expanded={open}>
      <aside
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        onFocus={openNow}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setFlyoutGroup(null);
            (document.activeElement as HTMLElement | null)?.blur();
          }
        }}
        className={cn(
          "absolute inset-y-0 left-0 z-40 flex w-[60px] flex-col",
          "border-r border-line bg-white transition-[width,box-shadow] duration-200 ease-out",
          open && "w-60 shadow-lg",
        )}
      >
        <div className="flex items-center gap-2.5 overflow-hidden py-4 pl-3.5 pr-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Mark className="size-4" />
          </div>
          <div className={cn("min-w-0 opacity-0 transition-opacity duration-200", open && "opacity-100")}>
            <p className="truncate text-sm font-semibold leading-tight text-ink">{orgName}</p>
            <p className="truncate text-xs text-ink-3">{userName}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-visible py-2">
          {NAV.map(({ href, label, icon: Icon, children }) => {
            const active = isActive(pathname, href);
            const flyoutShown = children && flyoutGroup === href;
            return (
              <div
                key={href}
                className="relative mx-2"
                onMouseEnter={() => children && openFlyout(href)}
                onMouseLeave={() => children && closeFlyoutSoon()}
              >
                <div
                  className={cn(
                    "flex items-center overflow-hidden rounded-md text-sm transition-colors duration-150",
                    active ? "bg-primary text-primary-foreground" : "text-ink-2 hover:bg-line-soft",
                  )}
                >
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={closeAll}
                    className="flex flex-1 items-center gap-2.5 py-2 pl-3.5 pr-1.5"
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                    <span className={cn("truncate opacity-0 transition-opacity duration-200", open && "opacity-100")}>
                      {label}
                    </span>
                  </Link>
                  {children && (
                    <button
                      type="button"
                      aria-label={flyoutShown ? `Hide ${label} menu` : `Show ${label} menu`}
                      onClick={() => setFlyoutGroup((g) => (g === href ? null : href))}
                      className={cn(
                        "mr-1.5 rounded p-1 opacity-0 transition-opacity duration-200 hover:bg-white/20",
                        open && "opacity-100",
                      )}
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  )}
                </div>

                {flyoutShown && open && (
                  <div
                    onMouseEnter={() => openFlyout(href)}
                    onMouseLeave={closeFlyoutSoon}
                    className="absolute left-[calc(100%+8px)] top-0 z-50 min-w-[168px] rounded-md border border-line bg-white p-1.5 shadow-lg"
                  >
                    {children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          aria-current={childActive ? "page" : undefined}
                          onClick={closeAll}
                          className={cn(
                            "block truncate rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-150",
                            childActive ? "bg-primary text-primary-foreground" : "text-ink-2 hover:bg-line-soft",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={signOut}
          className="mx-2 mb-3 flex items-center gap-2.5 overflow-hidden rounded-md py-2 pl-3.5 pr-2.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-line-soft"
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.5} />
          <span className={cn("truncate opacity-0 transition-opacity duration-200", open && "opacity-100")}>
            Sign out
          </span>
        </button>
      </aside>
    </div>
  );
}
