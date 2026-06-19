type InlineStatusVariant = "info" | "success" | "warning" | "error";

type InlineStatusProps = {
  message: string;
  title?: string;
  variant?: InlineStatusVariant;
  polite?: boolean;
  className?: string;
};

export function InlineStatus({
  message,
  title,
  variant = "info",
  polite = true,
  className = "",
}: InlineStatusProps) {
  return (
    <div
      className={`inline-status ${variant} ${className}`.trim()}
      role={variant === "error" ? "alert" : "status"}
      aria-live={polite ? "polite" : "off"}
    >
      {title && <strong>{title}</strong>}
      <span>{message}</span>
    </div>
  );
}
