import { ErrorState } from "./ErrorState";

type ServiceUnavailableStateProps = {
  service: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function ServiceUnavailableState({
  service,
  description,
  actionLabel,
  onAction,
  className,
}: ServiceUnavailableStateProps) {
  return (
    <ErrorState
      className={className}
      title={`${service} unavailable`}
      description={
        description ??
        `${service} is not available right now. LifeLayers will keep the rest of the app usable.`
      }
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}
