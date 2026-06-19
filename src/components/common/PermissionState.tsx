import { RetryButton } from "./RetryButton";

type PermissionStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

export function PermissionState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}: PermissionStateProps) {
  return (
    <div className={`state-block permission-state compact ${className}`.trim()} role="status">
      <div className="state-glyph" aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="state-actions">
          <RetryButton label={actionLabel} onClick={onAction} />
          {secondaryActionLabel && onSecondaryAction && (
            <button className="text-action" type="button" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
