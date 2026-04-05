import { clsx } from "clsx";

interface MetricTileProps {
  label: string;
  value: string;
  subtitle?: string;
  valueColor?: "success" | "danger" | "brand" | "primary" | "warning";
  subtitleColor?: "success" | "danger" | "brand" | "primary" | "warning" | "tertiary";
  progress?: number;
}

export function MetricTile({ label, value, subtitle, valueColor = "primary", subtitleColor = "tertiary", progress }: MetricTileProps) {
  const colorMap = {
    success: "text-success",
    danger: "text-danger",
    brand: "text-brand",
    primary: "text-primary",
    warning: "text-warning",
    tertiary: "text-tertiary",
  };

  const bgMap = {
    success: "bg-success",
    danger: "bg-danger",
    brand: "bg-brand",
    primary: "bg-primary",
    warning: "bg-warning",
    tertiary: "bg-tertiary",
  };

  return (
    <div className="bg-card border-0.5 border-border-default rounded-tile p-5 flex flex-col relative overflow-hidden">
      <span className="text-[10px] text-secondary font-medium tracking-widest uppercase mb-3">{label}</span>
      <div className="flex items-baseline justify-start gap-2">
        <span className={clsx("text-[26px] font-medium font-mono tracking-tight", colorMap[valueColor])}>{value}</span>
        {subtitle && <span className={clsx("text-xs font-mono font-medium truncate", colorMap[subtitleColor])}>{subtitle}</span>}
      </div>
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-surface">
          <div className={clsx("h-full", bgMap[valueColor === "primary" ? "brand" : valueColor])} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
