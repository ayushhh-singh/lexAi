function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />;
}

export function ChecklistSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <Bone className="mb-4 h-5 w-48" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-5 w-5 shrink-0 rounded-lg" />
            <Bone className="h-4 w-full max-w-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Bone className="mb-3 h-10 w-10" />
          <Bone className="mb-2 h-5 w-28" />
          <Bone className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function RecentConversationsSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <Bone className="mb-4 h-5 w-44" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Bone className="h-4 w-52" />
              <Bone className="h-3 w-32" />
            </div>
            <Bone className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeadlinesSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <Bone className="mb-4 h-5 w-44" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-4 w-48" />
              <Bone className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Bone className="mb-2 h-3 w-20" />
          <Bone className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Bone className="h-8 w-56" />
      <ChecklistSkeleton />
      <QuickActionsSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentConversationsSkeleton />
        <DeadlinesSkeleton />
      </div>
      <StatsSkeleton />
    </div>
  );
}
