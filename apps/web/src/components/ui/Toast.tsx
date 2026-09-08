"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ToastTone = "neutral" | "success" | "danger" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const toneClasses: Record<ToastTone, string> = {
  neutral: "border-neutral-200 bg-white",
  success: "border-success-500/30 bg-success-100",
  danger: "border-danger-500/30 bg-danger-100",
  warning: "border-warning-500/30 bg-warning-100",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...toast, id }]);
      // Auto-dismiss after 5s; safety/error toasts stay a touch longer.
      setTimeout(() => dismiss(id), toast.tone === "danger" ? 8000 : 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn("rounded-md border p-4 shadow-md", toneClasses[t.tone ?? "neutral"])}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-neutral-600">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-neutral-400 hover:text-neutral-600"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
