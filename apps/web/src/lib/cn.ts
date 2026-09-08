import clsx, { type ClassValue } from "clsx";

/** Small class-name combinator so components stay readable. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
