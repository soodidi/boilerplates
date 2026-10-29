import { http, HttpResponse } from 'msw/http';
import { db, type MockUser } from './db';

/** Erreur au format de Better Auth : `{ code, message }`. */
const authError = (status: number, code: string) =>
  HttpResponse.json({ code, message: code }, { status });

const currentUser = () => db.users.find((user) => user.id === db.sessionUserId) ?? null;

const publicUser = (user: MockUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  role: user.role,
  banned: user.banned,
});

/**
 * BE-010 : copie, pour les mocks seulement, des permissions de `access-control.ts` de l'API.
 * Le front, lui, demande toujours à l'API (`has-permission`).
 */
const ROLE_PERMISSIONS: Record<MockUser['role'], Record<string, string[]>> = {
  user: {},
  admin: { user: ['list', 'get', 'set-role', 'ban'], session: ['revoke'], stats: ['read'] },
};

const hasPermissions = (user: MockUser, permissions: Record<string, string[]>) =>
  Object.entries(permissions).every(([resource, actions]) =>
    actions.every((action) => ROLE_PERMISSIONS[user.role][resource]?.includes(action)),
  );

/** Route d'administration : 401 sans session, 403 sans la permission (format de Better Auth). */
const adminGuard = (permissions: Record<string, string[]>) => {
  const user = currentUser();
  if (!user) return authError(401, 'UNAUTHORIZED');
  if (!hasPermissions(user, permissions)) return authError(403, 'FORBIDDEN');
  return null;
};

const findUser = (userId: unknown) => db.users.find((user) => user.id === userId);

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
    if (user.banned) return authError(403, 'BANNED_USER');
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
      role: 'user' as const,
      banned: false,
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

  // GLB-013 : suppression du compte, mot de passe exigé (même contrat que l'API).
  http.post('*/v1/auth/delete-user', async ({ request }) => {
    const user = currentUser();
    if (!user) return authError(401, 'UNAUTHORIZED');
    const { password } = (await request.json()) as { password?: unknown };
    if (typeof password !== 'string' || password === '') return authError(400, 'BAD_REQUEST');
    if (password !== user.password) return authError(400, 'INVALID_PASSWORD');
    db.users = db.users.filter((candidate) => candidate.id !== user.id);
    db.notes = db.notes.filter((note) => note.ownerId !== user.id);
    db.sessionUserId = null;
    return HttpResponse.json({ success: true, message: 'User deleted' });
  }),

  // BE-010 : permissions de l'utilisateur connecté (route du plugin `admin`, ouverte à tous).
  http.post('*/v1/auth/admin/has-permission', async ({ request }) => {
    const user = currentUser();
    if (!user) return authError(401, 'UNAUTHORIZED');
    const { permissions } = (await request.json()) as { permissions: Record<string, string[]> };
    return HttpResponse.json({ success: hasPermissions(user, permissions), error: null });
  }),

  http.get('*/v1/auth/admin/list-users', () => {
    const refused = adminGuard({ user: ['list'] });
    if (refused) return refused;
    const users = db.users.map(publicUser);
    return HttpResponse.json({ users, total: users.length, limit: 100, offset: 0 });
  }),

  http.post('*/v1/auth/admin/ban-user', async ({ request }) => {
    const refused = adminGuard({ user: ['ban'] });
    if (refused) return refused;
    const user = findUser(((await request.json()) as { userId?: unknown }).userId);
    if (!user) return authError(404, 'USER_NOT_FOUND');
    user.banned = true;
    // Comme l'API : un compte banni perd ses sessions.
    if (db.sessionUserId === user.id) db.sessionUserId = null;
    return HttpResponse.json({ user: publicUser(user) });
  }),

  http.post('*/v1/auth/admin/unban-user', async ({ request }) => {
    const refused = adminGuard({ user: ['ban'] });
    if (refused) return refused;
    const user = findUser(((await request.json()) as { userId?: unknown }).userId);
    if (!user) return authError(404, 'USER_NOT_FOUND');
    user.banned = false;
    return HttpResponse.json({ user: publicUser(user) });
  }),

  http.post('*/v1/auth/admin/set-role', async ({ request }) => {
    const refused = adminGuard({ user: ['set-role'] });
    if (refused) return refused;
    const body = (await request.json()) as { userId?: unknown; role?: unknown };
    const user = findUser(body.userId);
    if (!user) return authError(404, 'USER_NOT_FOUND');
    if (body.role !== 'user' && body.role !== 'admin') return authError(400, 'BAD_REQUEST');
    user.role = body.role;
    return HttpResponse.json({ user: publicUser(user) });
  }),

  // BE-010 : route réservée de l'app (Problem Details, comme les routes NestJS).
  http.get('*/v1/admin/stats', () => {
    const user = currentUser();
    if (!user) return problem(401, { title: 'Unauthorized' });
    if (!hasPermissions(user, { stats: ['read'] })) return problem(403, { title: 'Forbidden' });
    return HttpResponse.json({ users: db.users.length, notes: db.notes.length });
  }),

  // GLB-013 : export des données de l'utilisateur connecté, une section par module.
  http.get('*/v1/account/export', () => {
    const user = currentUser();
    if (!user) return problem(401, { title: 'Unauthorized' });
    const notes = db.notes
      .filter((note) => note.ownerId === user.id)
      .map(({ ownerId: _ownerId, ...note }) => ({ ...note, updatedAt: note.createdAt }));
    return HttpResponse.json(
      {
        exportedAt: new Date().toISOString(),
        data: { account: { user: publicUser(user), sessions: [], signInMethods: [] }, notes },
      },
      { headers: { 'Content-Disposition': 'attachment; filename="account-export.json"' } },
    );
  }),

  http.get('*/v1/notes', ({ request }) => {
    if (!currentUser()) return problem(401, { title: 'Unauthorized' });
    const query = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
    const userId = db.sessionUserId;
    // Comme l'API : seules les notes de l'utilisateur connecté (BE-006).
    const data = db.notes
      .filter((note) => note.ownerId === userId && note.title.toLowerCase().includes(query))
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ ownerId: _ownerId, ...note }) => note);
    return HttpResponse.json({ data, nextCursor: null });
  }),

  // BE-010 : 404, jamais 403, pour la note d'un autre utilisateur.
  http.get('*/v1/notes/:id', ({ params }) => {
    if (!currentUser()) return problem(401, { title: 'Unauthorized' });
    const note = db.notes.find(
      (note) => note.id === params.id && note.ownerId === db.sessionUserId,
    );
    if (!note) return problem(404, { title: 'Not Found', detail: 'Note not found' });
    const { ownerId: _ownerId, ...response } = note;
    return HttpResponse.json(response);
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
    db.notes.push({ ...note, ownerId: db.sessionUserId ?? '' });
    return HttpResponse.json(note, { status: 201 });
  }),
];
