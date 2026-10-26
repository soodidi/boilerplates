// Copie de @soodidi/problem-details tant que le package n'est pas publié (GLB-010).
// Ensuite : import { ... } from '@soodidi/problem-details';
import { z } from 'zod';

export const fieldErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string().optional(),
});

/** Problem Details (RFC 9457) + extensions `errors` et `traceId` (BE-004). */
export const problemDetailsSchema = z.looseObject({
  type: z.string().default('about:blank'),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.array(fieldErrorSchema).optional(),
  traceId: z.string().optional(),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

/** Lit un corps de réponse inconnu : renvoie le Problem Details, ou `null` s'il n'en est pas un. */
export function parseProblemDetails(body: unknown): ProblemDetails | null {
  const result = problemDetailsSchema.safeParse(body);
  return result.success ? result.data : null;
}

/** Erreur levée par le client HTTP quand l'API répond en erreur. */
export class ProblemDetailsError extends Error {
  override readonly name = 'ProblemDetailsError';
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.problem = problem;
  }

  get status(): number {
    return this.problem.status;
  }

  /** Erreurs par champ, prêtes à être mappées sur un formulaire (FE-006). */
  get fieldErrors(): FieldError[] {
    return this.problem.errors ?? [];
  }

  /** Erreur attendue (4xx) : affichée à l'utilisateur, pas envoyée à Sentry (FE-009). */
  get isClientError(): boolean {
    return this.status < 500;
  }
}

export function isProblemDetailsError(error: unknown): error is ProblemDetailsError {
  return error instanceof ProblemDetailsError;
}
