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
 * Les clients mobiles (`Authorization: Bearer`, sans cookie) ne sont pas concernés.
 * Les routes de Better Auth ont leur propre vérification d'origine.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly trustedOrigins: Set<string>;

  constructor(@Inject(ENV) env: Env) {
    this.trustedOrigins = new Set(env.CORS_ORIGINS.map((origin) => new URL(origin).origin));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (SAFE_METHODS.has(request.method) || !request.headers.cookie) return true;

    const origin = request.headers.origin;
    if (origin && this.trustedOrigins.has(origin)) return true;
    if (!origin && request.headers['sec-fetch-site'] === 'same-origin') return true;

    throw new ForbiddenException('Untrusted origin');
  }
}
