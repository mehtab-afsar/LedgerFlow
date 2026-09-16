import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardsSkeleton } from "@/components/skeletons/StatCardsSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function PartyLedgerLoading() {
  return (
    <ViewTransition exit="slide-down" default="none">
      <div className="space-y-6 p-8">
        <Skeleton className="h-[13px] w-24" />
        <div className="space-y-2">
          <Skeleton className="h-[22px] w-48" />
          <Skeleton className="h-[13.5px] w-64" />
        </div>
        <StatCardsSkeleton count={3} />
        <TableSkeleton rows={5} cols={7} />
      </div>
    </ViewTransition>
  );
}
