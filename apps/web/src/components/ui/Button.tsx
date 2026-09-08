import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
  secondary: "bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700",
  outline: "border border-neutral-300 text-neutral-800 bg-white hover:bg-neutral-50",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  danger: "bg-danger-500 text-white hover:bg-danger-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-13 px-7 text-lg",
};

/**
 * Base button. Deliberately restrained — no gradients, no bouncy
 * micro-animations that would read as "dating app" rather than matrimonial.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});
