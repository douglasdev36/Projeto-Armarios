import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "livre" | "ocupado";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "status-badge",
        status === "livre" ? "status-livre" : "status-ocupado",
        className
      )}
    >
      {status === "livre" ? "Livre" : "Ocupado"}
    </span>
  );
}
