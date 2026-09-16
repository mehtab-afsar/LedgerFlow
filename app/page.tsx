import Link from "next/link";
import { SiteNav } from "@/features/marketing/components/SiteNav";
import { HowItWorks } from "@/features/marketing/components/HowItWorks";
import { OutstandingDemo } from "@/features/marketing/components/OutstandingDemo";
import { SiteFooter } from "@/features/marketing/components/SiteFooter";
import { Reveal } from "@/features/marketing/components/Reveal";

export const metadata = {
  title: "LedgerFlow — invoicing and receivables for logistics businesses",
  description:
    "Bill any party, collect payments, and always know what's outstanding — a lightweight order-to-cash ledger, without the dispatch system you don't need.",
};

/**
 * Self-serve, so the whole page points at one action: start the wizard.
 * Structure mirrors LogiFlow's landing page (hero, three-pillar explainer,
 * a concrete product demo, footer) but the second beat is the outstanding-
 * balance demo rather than a document image, because that's this product's
 * one differentiated claim.
 */
export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white text-ink">
      <SiteNav />

      <main>
        <section
          id="why"
          className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-[1120px] flex-col justify-center px-7"
        >
          <Reveal>
            <h1 className="max-w-[18ch] text-[clamp(38px,5vw,62px)] leading-[1.04] font-medium tracking-[-0.03em] text-balance">
              Bill the right party. Always know what&apos;s outstanding.
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-6 max-w-[52ch] text-[19px] leading-[1.5] text-ink-2">
              A lightweight invoicing and receivables ledger for logistics businesses. The party
              you bill isn&apos;t always the one that received the goods — LedgerFlow was built around
              that, not around it being an edge case.
            </p>
          </Reveal>

          <Reveal delay={200} className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/start"
              className="rounded-[8px] bg-ink px-6 py-[15px] text-[16px] font-medium text-white transition-all duration-150 hover:-translate-y-px hover:bg-ink-2 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand"
            >
              Start free
            </Link>
            <a
              href="#how"
              className="rounded-[8px] border border-line bg-white px-6 py-[15px] text-[16px] font-medium text-ink transition-all duration-150 hover:-translate-y-px hover:bg-paper hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand"
            >
              See how it works
            </a>
          </Reveal>

          <Reveal delay={300}>
            <p className="mt-4 text-[14px] leading-[1.55] text-ink-3">
              No card required. Set up your company and raise your first invoice in a few minutes.
            </p>
          </Reveal>
        </section>

        <HowItWorks />
        <OutstandingDemo />

        <section className="border-t border-line bg-paper">
          <div className="mx-auto max-w-[1120px] px-7 py-[104px] text-center">
            <Reveal>
              <h2 className="mx-auto max-w-[24ch] text-[clamp(28px,3.4vw,40px)] leading-[1.1] font-medium tracking-[-0.03em] text-ink">
                Set up your company and raise your first invoice today.
              </h2>
            </Reveal>
            <Reveal delay={100} className="mt-8">
              <Link
                href="/start"
                className="inline-block rounded-[8px] bg-ink px-7 py-[15px] text-[16px] font-medium text-white transition-all duration-150 hover:-translate-y-px hover:bg-ink-2 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand"
              >
                Start free
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
