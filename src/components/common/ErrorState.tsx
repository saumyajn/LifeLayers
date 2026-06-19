import { RetryButton } from "./RetryButton";

type ErrorStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`state-block error-state ${className}`.trim()} role="alert">
      <div className="state-glyph" aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {actionLabel && onAction && <RetryButton label={actionLabel} onClick={onAction} />}
      </div>
    </div>
  );
}
