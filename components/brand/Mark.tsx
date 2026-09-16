/**
 * The LedgerFlow mark — a document with a checkmark.
 *
 * Deliberately distinct from LogiFlow's stamped-receipt mark (a sibling
 * product, not the same one) while keeping the same discipline that made
 * LogiFlow's work at small sizes: two shapes only, on a 24px grid, bold
 * enough to survive a 16px nav tile. A document outline plus a checkmark
 * reads as "verified, accounted for" — the whole point of a ledger.
 */
export interface MarkProps extends React.SVGProps<SVGSVGElement> {
  weight?: number;
}

export function Mark({ weight = 1.75, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="LedgerFlow"
      {...props}
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8.5 12.5l2.5 2.5 5-5.5" />
    </svg>
  );
}
