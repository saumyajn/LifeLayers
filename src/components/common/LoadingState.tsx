type LoadingStateVariant = "panel" | "inline" | "overlay";

type LoadingStateProps = {
  title: string;
  description?: string;
  variant?: LoadingStateVariant;
  className?: string;
};

export function LoadingState({
  title,
  description,
  variant = "panel",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`state-block loading-state ${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="mini-spinner" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}
