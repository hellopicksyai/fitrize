import { motion } from "framer-motion";

// Shimmer skeleton block.
export function Skeleton({ className = "" }) {
  return <div className={`shimmer rounded-xl ${className}`} />;
}

// A dashboard-shaped loading skeleton (used while stats load).
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="dashboard-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-64" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Skeleton className="lg:col-span-2 h-56 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    </div>
  );
}

// Generic list skeleton.
export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" data-testid="list-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

// Beautiful empty state — an invitation to act, not a dead end.
export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="text-center py-14 px-6"
      data-testid="empty-state"
    >
      {Icon && (
        <div className="mx-auto w-14 h-14 rounded-2xl glass grid place-items-center mb-4 glow-accent">
          <Icon className="w-7 h-7 text-accent" />
        </div>
      )}
      <div className="display text-2xl">{title}</div>
      {hint && <div className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{hint}</div>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
