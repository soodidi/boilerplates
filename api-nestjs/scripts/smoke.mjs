// Test de fumée de `npm run stack` : l'API tourne dans l'image de production, avec PostgreSQL
// et Mailpit. Vérifie la santé, une inscription réelle et l'e-mail de confirmation reçu.
import { setTimeout as sleep } from 'node:timers/promises';

const API = 'http://localhost:3000';
const MAILPIT = 'http://localhost:8025/api/v1';
const email = `smoke-${Date.now()}@example.com`;

function check(condition, message) {
  if (!condition) {
    process.stderr.write(`✗ ${message}\n`);
    process.exit(1);
  }
  process.stdout.write(`✓ ${message}\n`);
}

const ready = await fetch(`${API}/health/ready`);
check(ready.ok, 'GET /health/ready répond 200 (base joignable)');

const signUp = await fetch(`${API}/v1/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
  body: JSON.stringify({ email, password: 'smoke test password', name: 'Smoke' }),
});
check(signUp.ok, `POST /v1/auth/sign-up/email répond 200 (${signUp.status})`);

let received = false;
for (let attempt = 0; attempt < 20 && !received; attempt++) {
  const { messages } = await (await fetch(`${MAILPIT}/messages`)).json();
  received = messages.some((message) => message.To.some((to) => to.Address === email));
  if (!received) await sleep(500);
}
check(received, 'e-mail de confirmation reçu dans Mailpit');
