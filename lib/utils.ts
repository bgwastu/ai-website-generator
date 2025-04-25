import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a unique ID with timestamp prefix and random string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
