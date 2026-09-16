import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the dashboard's stat-card grid shape so the swap-in doesn't reflow. */
export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-4 ${count >= 4 ? "min-[720px]:grid-cols-4" : "min-[720px]:grid-cols-3"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[10px] border border-line bg-white p-5">
          <Skeleton className="h-[12.5px] w-24" />
          <Skeleton className="mt-2.5 h-[24px] w-32" />
        </div>
      ))}
    </div>
  );
}
