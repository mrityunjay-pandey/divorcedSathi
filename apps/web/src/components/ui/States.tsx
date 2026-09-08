import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-300 p-10 text-center",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
      {description && <p className="max-w-sm text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, action, className }: StateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-danger-500/30 bg-danger-100 p-10 text-center",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-danger-700">{title}</h3>
      {description && <p className="max-w-sm text-sm text-danger-700/80">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
