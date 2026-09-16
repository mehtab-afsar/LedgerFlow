import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <ViewTransition exit="slide-down" default="none">
      <div className="space-y-6 p-8">
        <div className="space-y-2">
          <Skeleton className="h-[22px] w-32" />
          <Skeleton className="h-[13.5px] w-80" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[10px] border border-line bg-white p-5">
            <Skeleton className="h-[13px] w-24" />
            <div className="mt-3 grid gap-3 min-[640px]:grid-cols-2">
              <Skeleton className="h-9 rounded-md" />
              <Skeleton className="h-9 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </ViewTransition>
  );
}
