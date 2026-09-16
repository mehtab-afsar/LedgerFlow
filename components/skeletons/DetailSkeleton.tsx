import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the invoice/receipt detail layout: header block + line-item table. */
export function DetailSkeleton() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-[22px] w-40" />
          <Skeleton className="h-[13.5px] w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      <div className="grid gap-4 min-[640px]:grid-cols-2">
        <Skeleton className="h-28 rounded-[10px]" />
        <Skeleton className="h-28 rounded-[10px]" />
      </div>

      <div className="overflow-hidden rounded-[10px] border border-line bg-white">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-line-soft px-5 py-3 last:border-b-0">
            <Skeleton className="h-[13.5px] w-1/2" />
            <Skeleton className="h-[13.5px] w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
