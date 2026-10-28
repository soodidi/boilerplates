import { type ErrorEvent, type NodeOptions } from '@sentry/nestjs';
import { redactUrl } from './redact-url.js';
import { scrubErrorText } from './scrub-error.js';

type Span = Parameters<NonNullable<NodeOptions['beforeSendSpan']>>[0];

const redactValue = (value: unknown): unknown => {
  if (typeof value === 'string') return redactUrl(value);
  if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return { ...value, value: redactUrl(value.value) };
  }
  return value;
};

/**
 * GLB-013 : attributs ajoutés par l'instrumentation HTTP quelle que soit `dataCollection` :
 * navigateur, adresse du client, en-têtes.
 */
const PERSONAL_ATTRIBUTE =
  /^(user_agent\.|client\.|network\.peer\.|user\.|http\.request\.header\.)/;

/**
 * BE-007 / GLB-013 : span sans token (Sentry ne masque que `?token=`) ni donnée du client.
 * Appelé pour chaque span avec `traceLifecycle: 'stream'` (défaut du SDK 11).
 */
export function redactSpan(span: Span): Span {
  const attributes = Object.fromEntries(
    Object.entries(span.attributes)
      .filter(([key]) => !PERSONAL_ATTRIBUTE.test(key))
      .map(([key, value]) => [key, redactValue(value)]),
  ) as Span['attributes'];
  return { ...span, name: redactUrl(span.name), attributes };
}

/**
 * BE-007 / GLB-013 : erreur envoyée à Sentry sans token (URL, transaction, fils d'Ariane) ni
 * valeurs de requête SQL dans le message.
 */
export function redactErrorEvent(event: ErrorEvent): ErrorEvent {
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubErrorText(exception.value);
  }
  if (event.request?.url) event.request.url = redactUrl(event.request.url);
  if (event.transaction) event.transaction = redactUrl(event.transaction);
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (typeof breadcrumb.data?.url === 'string')
      breadcrumb.data.url = redactUrl(breadcrumb.data.url);
    if (breadcrumb.message) breadcrumb.message = redactUrl(breadcrumb.message);
  }
  return event;
}
