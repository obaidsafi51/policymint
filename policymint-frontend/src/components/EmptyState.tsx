interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function EmptyState({ title, description, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-card border-0.5 border-border-default rounded-card">
      <div className="text-secondary text-lg mb-2 font-medium">{title}</div>
      <div className="text-tertiary mb-6">{description}</div>
      {ctaLabel && onCtaClick && (
        <button 
          onClick={onCtaClick}
          className="bg-brand text-[#064430] hover:opacity-90 font-medium px-4 py-2 rounded-tile transition-opacity"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
