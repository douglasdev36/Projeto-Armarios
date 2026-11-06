import { cn } from "@/lib/utils";

interface LockerBadgeProps {
  locker: string | null;
  className?: string;
}

export function LockerBadge({ locker, className }: LockerBadgeProps) {
  if (!locker) {
    return (
      <span className={cn("status-badge bg-muted text-muted-foreground", className)}>
        N/A
      </span>
    );
  }

  return (
    <span className={cn("status-badge status-livre", className)}>
      {locker}
    </span>
  );
}
