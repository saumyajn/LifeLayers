import { RetryButton } from "./RetryButton";

type EmptyStateVariant = "panel" | "compact";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: EmptyStateVariant;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  variant = "panel",
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`state-block empty-state ${variant} ${className}`.trim()}>
      <div className="state-glyph" aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {actionLabel && onAction && <RetryButton label={actionLabel} onClick={onAction} />}
      </div>
    </div>
  );
}
