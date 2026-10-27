import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { ENV, type Env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * BE-006 : protection CSRF des routes métier authentifiées par cookie.
 * Une requête qui modifie l'état avec un cookie DOIT venir d'une origine de la liste blanche.
 * Une requête qui porte `Authorization` n'est pas concernée, même si elle a aussi un cookie (URLSession
 * sur iOS renvoie les cookies reçus) : un navigateur ne peut pas ajouter cet en-tête à une requête
 * venue d'un autre site sans que CORS, en liste blanche, l'autorise d'abord.
 * Les routes de Better Auth ont leur propre vérification d'origine.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly trustedOrigins: Set<string>;

  constructor(@Inject(ENV) env: Env) {
    // L'origine de l'API elle-même (Swagger UI) est acceptée, comme sur les routes de Better Auth.
    this.trustedOrigins = new Set(
      [...env.CORS_ORIGINS, env.BETTER_AUTH_URL].map((origin) => new URL(origin).origin),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (SAFE_METHODS.has(request.method) || !request.headers.cookie) return true;
    if (request.headers.authorization) return true;

    const origin = request.headers.origin;
    if (origin && this.trustedOrigins.has(origin)) return true;
    if (!origin && request.headers['sec-fetch-site'] === 'same-origin') return true;

    throw new ForbiddenException('Untrusted origin');
  }
}
