import { Skeleton } from '../ui/Skeleton';

export function MarketplaceSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4" aria-hidden="true">
      <Skeleton variant="rectangular" className="h-11 w-full rounded-full" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="h-8 w-16 rounded-full" />
        <Skeleton variant="rectangular" className="h-8 w-24 rounded-full" />
        <Skeleton variant="rectangular" className="h-8 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <Skeleton variant="text" className="w-2/3" />
              <Skeleton variant="text" className="mt-2 w-full" />
              <Skeleton variant="text" className="mt-2 w-1/3" />
            </div>
            <Skeleton variant="rectangular" className="h-20 w-20 flex-shrink-0" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <Skeleton variant="text" className="w-2/3" />
              <Skeleton variant="text" className="mt-2 w-full" />
              <Skeleton variant="text" className="mt-2 w-1/3" />
            </div>
            <Skeleton variant="rectangular" className="h-20 w-20 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
