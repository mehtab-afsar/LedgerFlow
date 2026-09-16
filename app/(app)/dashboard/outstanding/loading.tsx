import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardsSkeleton } from "@/components/skeletons/StatCardsSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function OutstandingLoading() {
  return (
    <ViewTransition exit="slide-down" default="none">
      <div className="space-y-6 p-8">
        <div className="space-y-2">
          <Skeleton className="h-[22px] w-32" />
          <Skeleton className="h-[13.5px] w-96" />
        </div>
        <StatCardsSkeleton count={3} />
        <Skeleton className="h-9 w-72 rounded-md" />
        <TableSkeleton rows={6} cols={5} />
      </div>
    </ViewTransition>
  );
}
