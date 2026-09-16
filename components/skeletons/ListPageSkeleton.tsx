import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

/** Shared loading shape for the list pages (invoices/receipts/service-completions/parties) — header + toggle button + table. */
export function ListPageSkeleton({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <ViewTransition exit="slide-down" default="none">
      <div className="space-y-5 p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-[22px] w-32" />
            <Skeleton className="h-[13.5px] w-64" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <TableSkeleton rows={rows} cols={cols} />
      </div>
    </ViewTransition>
  );
}
