/**
 * BE-006 : en-tête interne qui porte l'IP du client calculée par Fastify (`TRUST_PROXY_HOPS`).
 * Il est écrasé à chaque requête (app.setup.ts) : un client ne peut pas l'imposer.
 */
export const CLIENT_IP_HEADER = 'x-client-ip';
