import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function NewGuidedInvoiceLoading() {
  return (
    <ViewTransition exit="slide-down" default="none">
      <div className="space-y-5 p-8">
        <Skeleton className="h-[13px] w-20" />
        <div className="space-y-2">
          <Skeleton className="h-[22px] w-56" />
          <Skeleton className="h-[13.5px] w-96" />
        </div>
        <TableSkeleton rows={4} cols={2} />
      </div>
    </ViewTransition>
  );
}
