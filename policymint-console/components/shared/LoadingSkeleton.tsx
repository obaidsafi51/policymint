interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return <div className={`shimmer rounded-base ${className ?? ''}`} aria-hidden="true" />;
}
