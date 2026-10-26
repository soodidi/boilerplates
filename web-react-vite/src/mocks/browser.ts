import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export async function startMockWorker() {
  const worker = setupWorker(...handlers);
  // Les requêtes non mockées (assets, config.json) passent normalement.
  await worker.start({ onUnhandledFrame: 'bypass' });
}
