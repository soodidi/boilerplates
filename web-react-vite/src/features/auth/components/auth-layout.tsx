import { type ReactNode } from 'react';

/** Mise en page commune des écrans d'authentification. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby="auth-title" className="mx-auto grid max-w-sm gap-6">
      <h1 id="auth-title" className="text-2xl font-semibold">
        {title}
      </h1>
      {children}
    </section>
  );
}

const linkClass = 'text-sm font-medium underline underline-offset-4 hover:text-foreground';

export const authLinkClass = `${linkClass} text-muted-foreground`;
