import { clsx } from "clsx";

interface LoadingSkeletonProps {
  variant: "tile" | "card" | "chart";
}

export function LoadingSkeleton({ variant }: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-surface border-0.5 border-border-default";
  
  if (variant === "tile") {
    return <div className={clsx(baseClasses, "rounded-tile h-32 w-full")} />;
  }
  
  if (variant === "card") {
    return <div className={clsx(baseClasses, "rounded-card h-48 w-full")} />;
  }
  
  if (variant === "chart") {
    return <div className={clsx(baseClasses, "rounded-card h-80 w-full")} />;
  }
  
  return null;
}
