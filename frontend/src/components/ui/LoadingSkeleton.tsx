interface SkeletonProps {
  className?: string;
  count?: number;
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse ${className}`}>
      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex gap-4 mb-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 mb-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 bg-gray-100 dark:bg-gray-700 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LineSkeleton({ className = '' }: SkeletonProps) {
  return <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`} />;
}
