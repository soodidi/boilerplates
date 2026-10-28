import { type ComponentProps } from 'react';
import { cn } from '@/lib/cn';

// FE-008 : 16 px sur mobile (en dessous, iOS zoome à la saisie), 14 px à partir de `sm`.
export const fieldClassName =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-base placeholder:text-muted-foreground sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-destructive';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldClassName, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClassName, 'min-h-24', className)} {...props} />;
}
