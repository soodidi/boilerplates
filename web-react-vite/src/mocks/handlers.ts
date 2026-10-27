import { http, HttpResponse } from 'msw/http';
import { db } from './db';

/** Erreur au format de Better Auth : `{ code, message }`. */
const authError = (status: number, code: string) =>
  HttpResponse.json({ code, message: code }, { status });

const currentUser = () => db.users.find((user) => user.id === db.sessionUserId) ?? null;

const publicUser = (user: { id: string; name: string; email: string; emailVerified: boolean }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
});

const problem = (status: number, body: Record<string, unknown>) =>
  HttpResponse.json(
    { type: 'about:blank', status, ...body },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

/** Mêmes contrats que l'API du boilerplate api-nestjs : Better Auth (/v1/auth) et notes. */
export const handlers = [
  http.get('*/v1/auth/get-session', () => {
    const user = currentUser();
    return HttpResponse.json(
      user ? { session: { userId: user.id }, user: publicUser(user) } : null,
    );
  }),

  http.post('*/v1/auth/sign-in/email', async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string };
    const user = db.users.find((candidate) => candidate.email === email);
    // BE-006 : même erreur pour une adresse inconnue et un mauvais mot de passe.
    if (user?.password !== password) return authError(401, 'INVALID_EMAIL_OR_PASSWORD');
    if (!user.emailVerified) return authError(403, 'EMAIL_NOT_VERIFIED');
    db.sessionUserId = user.id;
    return HttpResponse.json({ redirect: false, token: 'mock-token', user: publicUser(user) });
  }),

  http.post('*/v1/auth/sign-up/email', async ({ request }) => {
    const { email, password, name } = (await request.json()) as Record<string, string>;
    const existing = db.users.find((user) => user.email === email);
    // Les mocks confirment l'adresse tout de suite : il n'y a pas d'e-mail à ouvrir.
    const user = existing ?? {
      id: crypto.randomUUID(),
      name: name ?? '',
      email: email ?? '',
      password: password ?? '',
      emailVerified: true,
    };
    if (!existing) db.users.push(user);
    return HttpResponse.json({ token: null, user: publicUser(user) });
  }),

  http.post('*/v1/auth/send-verification-email', () => HttpResponse.json({ status: true })),

  http.post('*/v1/auth/request-password-reset', () =>
    HttpResponse.json({ status: true, message: 'If this email exists, a reset link was sent.' }),
  ),

  http.post('*/v1/auth/reset-password', async ({ request }) => {
    const { token } = (await request.json()) as { token: string };
    return token === 'valid-token'
      ? HttpResponse.json({ status: true })
      : authError(400, 'INVALID_TOKEN');
  }),

  http.post('*/v1/auth/sign-out', () => {
    db.sessionUserId = null;
    return HttpResponse.json({ success: true });
  }),

  http.get('*/v1/notes', ({ request }) => {
    if (!currentUser()) return problem(401, { title: 'Unauthorized' });
    const query = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
    const data = db.notes
      .filter((note) => note.title.toLowerCase().includes(query))
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json({ data, nextCursor: null });
  }),

  http.post('*/v1/notes', async ({ request }) => {
    if (!currentUser()) return problem(401, { title: 'Unauthorized' });
    const body = (await request.json()) as { title?: unknown; content?: unknown };
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      return problem(400, {
        title: 'Validation failed',
        errors: [{ field: 'title', code: 'too_small', message: 'Title is required' }],
      });
    }
    const note = {
      id: crypto.randomUUID(),
      title: body.title.trim(),
      content: typeof body.content === 'string' ? body.content.trim() : '',
      createdAt: new Date().toISOString(),
    };
    db.notes.push(note);
    return HttpResponse.json(note, { status: 201 });
  }),
];
