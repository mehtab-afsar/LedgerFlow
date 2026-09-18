import Link from "next/link";
import { cardClass } from "@/lib/ui/styles";

/**
 * `bordered={false}` drops the card's own border/padding-as-box so several
 * tiles can sit inside one shared outer card (the Overview page) instead of
 * each tile being a card of its own.
 */
export function StatCard({
  label,
  value,
  sub,
  tone = "ink",
  href,
  bordered = true,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "alert" | "forest";
  href?: string;
  bordered?: boolean;
}) {
  const toneClass = tone === "alert" ? "text-alert" : tone === "forest" ? "text-forest-ink" : "text-ink";
  const content = (
    <>
      <p className="text-[12.5px] text-ink-2">{label}</p>
      <p className={`mt-1.5 font-mono text-[24px] font-semibold ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-[12px] text-ink-3">{sub}</p>}
    </>
  );
  const boxClass = bordered ? cardClass : "rounded-md p-2";
  if (href) {
    return (
      <Link href={href} className={`${boxClass} block transition-colors duration-150 hover:bg-brand-tint`}>
        {content}
      </Link>
    );
  }
  return <div className={boxClass}>{content}</div>;
}
