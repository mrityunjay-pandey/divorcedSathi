import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/** Accessible text input: associated label, described-by hint/error, visible error state. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, required, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={cn(hintId, errorId) || undefined}
        className={cn(
          "h-11 rounded-md border bg-white px-3 text-base text-neutral-800 placeholder:text-neutral-400",
          "border-neutral-300 focus:border-primary-400",
          error && "border-danger-500 focus:border-danger-500",
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
    </div>
  );
});
