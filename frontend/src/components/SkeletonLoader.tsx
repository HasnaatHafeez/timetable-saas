import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonLoaderProps {
  type?: "card" | "table" | "text" | "stat";
  count?: number;
}

export const SkeletonLoader = ({ type = "card", count = 1 }: SkeletonLoaderProps) => {
  const items = Array.from({ length: count });

  if (type === "stat") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6 card-shadow">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        {items.map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
};
