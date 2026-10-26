import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { server } from '@/mocks/server';
import { request } from './http';
import { ProblemDetailsError } from './problem-details';

describe('request', () => {
  it('valide la réponse avec le schéma', async () => {
    server.use(http.get('*/ping', () => HttpResponse.json({ ok: true })));

    await expect(request('/ping', { schema: z.object({ ok: z.boolean() }) })).resolves.toEqual({
      ok: true,
    });
  });

  it('rejette une réponse qui ne respecte pas le contrat', async () => {
    server.use(http.get('*/ping', () => HttpResponse.json({ ok: 'yes' })));

    await expect(request('/ping', { schema: z.object({ ok: z.boolean() }) })).rejects.toThrow();
  });

  it('lève une ProblemDetailsError pour une réponse Problem Details', async () => {
    server.use(
      http.get('*/ping', () =>
        HttpResponse.json(
          { title: 'Forbidden', status: 403, detail: 'Accès refusé' },
          { status: 403 },
        ),
      ),
    );

    const error = await request('/ping', { schema: z.unknown() }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsError);
    const problemError = error as ProblemDetailsError;
    expect(problemError.status).toBe(403);
    expect(problemError.message).toBe('Accès refusé');
    expect(problemError.isClientError).toBe(true);
  });

  it('construit une erreur même si le corps n’est pas un Problem Details', async () => {
    server.use(http.get('*/ping', () => new HttpResponse('Bad gateway', { status: 502 })));

    const error = await request('/ping', { schema: z.unknown() }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsError);
    expect((error as ProblemDetailsError).status).toBe(502);
    expect((error as ProblemDetailsError).isClientError).toBe(false);
  });
});
