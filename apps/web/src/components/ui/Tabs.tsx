"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* components must be rendered inside <Tabs>");
  return ctx;
}

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const baseId = useId();
  const current = value ?? internal;
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-1 border-b border-neutral-200", className)}>
      {children}
    </div>
  );
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const { value: current, setValue, baseId } = useTabsContext();
  const selected = current === value;
  return (
    <button
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        selected
          ? "border-primary-600 text-primary-700"
          : "border-transparent text-neutral-500 hover:text-neutral-700",
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const { value: current, baseId } = useTabsContext();
  if (current !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      className="pt-4"
    >
      {children}
    </div>
  );
}
