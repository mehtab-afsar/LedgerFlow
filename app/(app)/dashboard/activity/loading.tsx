import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <ViewTransition exit="slide-down" default="none">
      <div className="space-y-6 p-8">
        <div className="space-y-2">
          <Skeleton className="h-[22px] w-24" />
          <Skeleton className="h-[13.5px] w-96" />
        </div>
        <div className="overflow-hidden rounded-[10px] border border-line bg-white">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-soft px-5 py-3 last:border-b-0">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-[13.5px] w-40" />
                <Skeleton className="h-[12.5px] w-28" />
              </div>
              <Skeleton className="h-[12px] w-14" />
            </div>
          ))}
        </div>
      </div>
    </ViewTransition>
  );
}
