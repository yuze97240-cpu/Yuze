import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleFirestoreError(error: any, operation: string, path: string | null = null): never {
  console.error(`Firestore error during ${operation}:`, error);
  throw error;
}
