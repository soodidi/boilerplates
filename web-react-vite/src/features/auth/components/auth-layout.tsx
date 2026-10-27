import { type ReactNode, useEffect, useRef } from 'react';

type AuthLayoutProps = {
  title: string;
  /** FE-008 : écran de résultat (succès, lien invalide) : le focus va sur le titre pour l'annoncer. */
  focusTitle?: boolean;
  children: ReactNode;
};

/** Mise en page commune des écrans d'authentification. */
export function AuthLayout({ title, focusTitle = false, children }: AuthLayoutProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <section aria-labelledby="auth-title" className="mx-auto grid max-w-sm gap-6">
      <h1
        id="auth-title"
        ref={titleRef}
        tabIndex={-1}
        className="text-2xl font-semibold focus:outline-none"
      >
        {title}
      </h1>
      {children}
    </section>
  );
}

const linkClass = 'text-sm font-medium underline underline-offset-4 hover:text-foreground';

export const authLinkClass = `${linkClass} text-muted-foreground`;
