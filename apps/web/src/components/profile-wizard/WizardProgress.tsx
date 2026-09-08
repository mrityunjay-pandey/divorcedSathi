import { cn } from "@/lib/cn";

export interface WizardStepDefinition {
  key: string;
  label: string;
}

export function WizardProgress({ steps, activeIndex }: { steps: WizardStepDefinition[]; activeIndex: number }) {
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-2" aria-label="Profile creation progress">
      {steps.map((step, index) => {
        const isComplete = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li key={step.key} className="flex items-center gap-1">
            <span
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-medium",
                isActive && "bg-primary-600 text-white",
                isComplete && !isActive && "bg-primary-100 text-primary-700",
                !isActive && !isComplete && "bg-neutral-100 text-neutral-500",
              )}
            >
              {index + 1}
            </span>
            <span className={cn("hidden text-xs sm:inline", isActive ? "font-medium text-neutral-800" : "text-neutral-500")}>
              {step.label}
            </span>
            {index < steps.length - 1 && <span className="mx-1 h-px w-4 bg-neutral-200" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
