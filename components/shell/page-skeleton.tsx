import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-6" aria-label={title}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-5 w-[34rem] max-w-full" />
      </div>
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}
