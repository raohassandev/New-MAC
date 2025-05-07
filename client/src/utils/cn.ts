import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes safely
 * This combines clsx and tailwind-merge to handle conditional classes
 * and resolve conflicting classes properly
 *
 * @example
 * cn('font-bold', isActive && 'text-blue-500', 'p-4', isPrimary && 'p-2')
 * // If isActive is true and isPrimary is true, this returns: 'font-bold text-blue-500 p-2'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
