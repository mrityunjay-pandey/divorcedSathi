import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  info: "bg-info-100 text-info-700",
  primary: "bg-primary-100 text-primary-700",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
