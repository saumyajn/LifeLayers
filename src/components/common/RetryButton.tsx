import type { ButtonHTMLAttributes } from "react";

type RetryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

export function RetryButton({
  label = "Try again",
  className = "",
  ...buttonProps
}: RetryButtonProps) {
  return (
    <button className={`state-action ${className}`.trim()} type="button" {...buttonProps}>
      {label}
    </button>
  );
}
