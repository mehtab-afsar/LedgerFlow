import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the list pages' table shape (invoices/receipts/service-completions/parties). */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
      <table className="w-full text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line-soft">
            {Array.from({ length: cols }).map((_, c) => (
              <th key={c} className="px-5 py-3">
                <Skeleton className="h-[12px] w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-line-soft last:border-b-0">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-5 py-3">
                  <Skeleton className="h-[13.5px] w-full max-w-28" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
