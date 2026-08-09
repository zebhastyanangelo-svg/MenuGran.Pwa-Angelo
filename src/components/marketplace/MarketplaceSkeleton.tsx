export function MarketplaceSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 animate-pulse">
      <div className="h-10 w-full rounded-full bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-full bg-gray-200" />
        <div className="h-8 w-24 rounded-full bg-gray-200" />
        <div className="h-8 w-20 rounded-full bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-44 rounded-xl bg-gray-200" />
        <div className="h-44 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}
