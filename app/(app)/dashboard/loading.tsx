import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardsSkeleton } from "@/components/skeletons/StatCardsSkeleton";

export default function DashboardLoading() {
  return (
    <ViewTransition exit="slide-down" default="none">
      <div className="space-y-6 p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-[22px] w-36" />
            <Skeleton className="h-[13.5px] w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
        <div className="rounded-[10px] border border-line bg-white p-5">
          <Skeleton className="h-[12px] w-24" />
          <div className="mt-3">
            <StatCardsSkeleton count={3} />
          </div>
        </div>
        <div className="rounded-[10px] border border-line bg-white p-5">
          <Skeleton className="h-[12px] w-32" />
          <div className="mt-3">
            <StatCardsSkeleton count={4} />
          </div>
        </div>
        <Skeleton className="h-[13px] w-64" />
      </div>
    </ViewTransition>
  );
}
