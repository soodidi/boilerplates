import { type ReactNode, useId } from 'react';

type ControlProps = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
};

type FormFieldProps = {
  label: string;
  error?: string | undefined;
  /** Reçoit les attributs à poser sur le champ : id, aria-invalid, aria-describedby. */
  children: (control: ControlProps) => ReactNode;
};

/**
 * FE-006 : chaque champ a un label associé, et son erreur lui est liée
 * (aria-describedby + aria-invalid), sans y penser à chaque formulaire.
 */
export function FormField({ label, error, children }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': error === undefined ? undefined : errorId,
      })}
      {error === undefined ? null : (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
