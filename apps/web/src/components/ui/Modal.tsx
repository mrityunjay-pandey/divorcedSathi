"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Uses the native <dialog> element for built-in focus trapping, Escape-to-close,
 * and correct accessibility semantics, rather than reimplementing a11y by hand.
 */
export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      className={cn(
        "rounded-lg border border-neutral-200 p-0 shadow-lg backdrop:bg-neutral-900/40",
        "w-full max-w-md",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h2 id="modal-title" className="text-lg font-semibold text-neutral-900">
            {title}
          </h2>
          {description && (
            <p id="modal-description" className="mt-1 text-sm text-neutral-500">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
