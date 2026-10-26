import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Fusionne des classes Tailwind conditionnelles sans conflit (FE-005). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
