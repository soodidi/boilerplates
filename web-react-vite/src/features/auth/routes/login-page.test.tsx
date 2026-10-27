import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEMO_USER, UNVERIFIED_USER } from '@/mocks/db';
import { renderRoute } from '@/test/render';

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: 'Adresse e-mail' }), email);
  await user.type(screen.getByLabelText('Mot de passe'), password);
  await user.click(screen.getByRole('button', { name: 'Se connecter' }));
  return user;
}

describe('LoginPage', () => {
  it('redirige une page privée vers la connexion, puis y revient une fois connecté', async () => {
    const { router } = renderRoute('/notes?q=api');

    await screen.findByRole('heading', { name: 'Connexion' });
    expect(router.state.location.pathname).toBe('/login');

    await fillAndSubmit(DEMO_USER.email, DEMO_USER.password);

    await expect.poll(() => router.state.location.pathname).toBe('/notes');
    expect(router.state.location.search).toEqual({ q: 'api' });
  });

  it('affiche le même message pour une adresse inconnue et un mauvais mot de passe', async () => {
    renderRoute('/login');

    await fillAndSubmit(DEMO_USER.email, 'wrong password');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Adresse e-mail ou mot de passe incorrect.',
    );
  });

  it('propose de renvoyer l’e-mail de confirmation si l’adresse n’est pas vérifiée', async () => {
    renderRoute('/login');

    const user = await fillAndSubmit(UNVERIFIED_USER.email, UNVERIFIED_USER.password);
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirmez d’abord votre adresse');

    await user.click(screen.getByRole('button', { name: /Renvoyer l.e-mail de confirmation/ }));
    expect(await screen.findByText('E-mail de confirmation envoyé.')).toBeInTheDocument();
  });

  it('ignore une redirection vers un autre site', async () => {
    const { router } = renderRoute('/login?redirect=//evil.example.com');

    await fillAndSubmit(DEMO_USER.email, DEMO_USER.password);

    await expect.poll(() => router.state.location.pathname).toBe('/notes');
  });

  it('valide les champs avant l’envoi', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    await user.click(await screen.findByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Adresse e-mail invalide.')).toBeInTheDocument();
  });
});
