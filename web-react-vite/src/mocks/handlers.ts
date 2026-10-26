import { http, HttpResponse } from 'msw/http';
import { db } from './db';

const problem = (status: number, body: Record<string, unknown>) =>
  HttpResponse.json(
    { type: 'about:blank', status, ...body },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

/** Même contrat que l'API du boilerplate api-nestjs (module notes, BE-004). */
export const handlers = [
  http.get('*/v1/notes', ({ request }) => {
    const query = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
    const data = db.notes
      .filter((note) => note.title.toLowerCase().includes(query))
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json({ data, nextCursor: null });
  }),

  http.post('*/v1/notes', async ({ request }) => {
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
