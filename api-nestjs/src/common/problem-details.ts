// Copie de @soodidi/problem-details tant que le package n'est pas publié (GLB-010).
import { z } from 'zod';

export const PROBLEM_JSON_CONTENT_TYPE = 'application/problem+json';

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

export type CreateProblemInput = {
  status: number;
  title?: string | undefined;
  type?: string | undefined;
  detail?: string | undefined;
  instance?: string | undefined;
  errors?: FieldError[] | undefined;
  traceId?: string | undefined;
  [extension: string]: unknown;
};

const DEFAULT_TITLES: Readonly<Partial<Record<number, string>>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export function createProblem(input: CreateProblemInput): ProblemDetails {
  return problemDetailsSchema.parse({
    ...input,
    title: input.title ?? DEFAULT_TITLES[input.status] ?? 'Error',
  });
}

/** Issue au format Standard Schema (Zod, pipe de validation NestJS). */
export type StandardIssue = {
  readonly message: string;
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined;
  readonly code?: string;
};

export function fieldErrorsFromIssues(issues: readonly StandardIssue[]): FieldError[] {
  return issues.map((issue) => ({
    field:
      issue.path
        ?.map((segment) => String(typeof segment === 'object' ? segment.key : segment))
        .join('.') ?? '',
    code: issue.code ?? 'invalid',
    message: issue.message,
  }));
}
