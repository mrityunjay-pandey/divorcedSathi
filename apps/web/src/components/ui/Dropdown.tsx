"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface DropdownItem {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface DropdownProps {
  label: string;
  items: DropdownItem[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A simple accessible listbox-style dropdown. For the MVP this covers single-select
 * use cases (city, religion, education, etc.) in Search and Profile forms; a
 * multi-select variant will be added alongside the Search/Filters module.
 */
export function Dropdown({ label, items, value, onChange, placeholder, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const listboxId = useId();
  const selected = items.find((i) => i.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn("relative flex flex-col gap-1.5", className)}>
      <label id={`${buttonId}-label`} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <button
        type="button"
        id={buttonId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${buttonId}-label ${buttonId}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center justify-between rounded-md border border-neutral-300 bg-white px-3 text-left text-base text-neutral-800"
      >
        <span className={selected ? "" : "text-neutral-400"}>
          {selected?.label ?? placeholder ?? "Select…"}
        </span>
        <span aria-hidden="true" className="text-neutral-400">
          ▾
        </span>
      </button>
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={`${buttonId}-label`}
          className="absolute top-full z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-md"
        >
          {items.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                disabled={item.disabled}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-neutral-50",
                  item.value === value && "bg-primary-50 text-primary-700",
                  item.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
