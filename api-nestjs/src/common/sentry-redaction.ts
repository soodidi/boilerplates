import { type ErrorEvent, type NodeOptions } from '@sentry/nestjs';
import { redactUrl } from './redact-url.js';

type Span = Parameters<NonNullable<NodeOptions['beforeSendSpan']>>[0];

const redactValue = (value: unknown): unknown => {
  if (typeof value === 'string') return redactUrl(value);
  if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return { ...value, value: redactUrl(value.value) };
  }
  return value;
};

/** BE-007 : nom et attributs d'un span (URL, route) sans token. Sentry ne masque que `?token=`. */
export function redactSpan(span: Span): Span {
  const attributes = Object.fromEntries(
    Object.entries(span.attributes).map(([key, value]) => [key, redactValue(value)]),
  ) as Span['attributes'];
  return { ...span, name: redactUrl(span.name), attributes };
}

/** BE-007 : erreur envoyée à Sentry sans token dans l'URL, la transaction ou les fils d'Ariane. */
export function redactErrorEvent(event: ErrorEvent): ErrorEvent {
  if (event.request?.url) event.request.url = redactUrl(event.request.url);
  if (event.transaction) event.transaction = redactUrl(event.transaction);
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (typeof breadcrumb.data?.url === 'string')
      breadcrumb.data.url = redactUrl(breadcrumb.data.url);
    if (breadcrumb.message) breadcrumb.message = redactUrl(breadcrumb.message);
  }
  return event;
}
