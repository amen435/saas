import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoadingSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-72 border-r border-border p-4 space-y-4 hidden md:block">
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Chat skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        <div className="flex-1 p-5 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-end" : ""}`}>
              {i % 2 !== 0 && <Skeleton className="w-8 h-8 rounded-xl shrink-0" />}
              <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-[45%]" : "w-[60%]"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
