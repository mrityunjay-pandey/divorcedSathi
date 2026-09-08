import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type AlertTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
}

const toneClasses: Record<AlertTone, string> = {
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
  success: "border-success-500/30 bg-success-100 text-success-700",
  warning: "border-warning-500/30 bg-warning-100 text-warning-700",
  danger: "border-danger-500/30 bg-danger-100 text-danger-700",
  info: "border-info-500/30 bg-info-100 text-info-700",
};

export function Alert({ className, tone = "info", title, children, ...props }: AlertProps) {
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("rounded-md border p-4 text-sm", toneClasses[tone], className)}
      {...props}
    >
      {title && <p className="mb-1 font-medium">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
