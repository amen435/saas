import { Skeleton } from "@/components/ui/skeleton";

/**
 * Centered loading spinner for full-page or inline loading
 */
export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-b-2",
    lg: "h-16 w-16 border-2",
  };
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <div
        className={`animate-spin rounded-full border-primary ${sizeClasses[size]}`}
        aria-label="Loading"
      />
    </div>
  );
}

/**
 * Page-level skeleton: header + stats cards + search + table
 */
export function PageSkeleton({ hasStats = true, hasSearch = true, tableRows = 6 }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats cards */}
      {hasStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {/* Search / filters */}
      {hasSearch && (
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: tableRows }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact table skeleton (e.g. for admin tables)
 */
export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-muted/50 p-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-[120px]" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Cards grid skeleton (e.g. for class cards, stats)
 */
export function CardsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}
