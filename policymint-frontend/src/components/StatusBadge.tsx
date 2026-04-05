import { clsx } from "clsx";

type StatusVariant = "allowed" | "blocked" | "active" | "inactive" | "pending" | "error";

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const baseClasses = "text-[10px] font-medium px-3 py-1 bg-surface border-0.5 border-border-default rounded-badge uppercase inline-flex items-center gap-2";
  
  const variants = {
    allowed: "text-success",
    blocked: "text-danger",
    active: "text-success",
    inactive: "text-secondary",
    pending: "text-warning",
    error: "text-danger",
  };

  const dotColors = {
    allowed: "bg-success",
    blocked: "bg-danger",
    active: "bg-success",
    inactive: "bg-secondary",
    pending: "bg-warning",
    error: "bg-danger",
  };

  return (
    <span className={clsx(baseClasses)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", dotColors[status])} />
      <span className={clsx(variants[status], "tracking-wider")}>{label || status}</span>
    </span>
  );
}
