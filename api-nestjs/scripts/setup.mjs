// Démarrage du projet en développement, en une commande et relançable sans risque :
//   1. .env créé ou complété depuis .env.example (secrets de dev générés) ;
//   2. PostgreSQL et Mailpit démarrés (compose.yaml) ;
//   3. migrations appliquées avec l'image de production (même Dockerfile qu'en staging et en prod).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { syncEnv } from './env-file.mjs';

const step = (message) => process.stdout.write(`\n▸ ${message}\n`);

function fail(message) {
  process.stderr.write(`\n✗ ${message}\n`);
  process.exit(1);
}

function run(command, args, hint) {
  try {
    execFileSync(command, args, { stdio: 'inherit' });
  } catch {
    fail(hint);
  }
}

/** Le port est-il libre sur la machine ? */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => server.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
}

/** Le conteneur PostgreSQL de ce projet tourne-t-il déjà (il occupe alors le port 5432) ? */
function composePostgresRunning() {
  try {
    return (
      execFileSync('docker', ['compose', 'ps', '--quiet', '--status', 'running', 'postgres'])
        .toString()
        .trim().length > 0
    );
  } catch {
    return false;
  }
}

step('Fichier .env');
const current = existsSync('.env') ? readFileSync('.env', 'utf8') : null;
const { content, added } = syncEnv(readFileSync('.env.example', 'utf8'), current);
if (content === null) {
  process.stdout.write('  déjà à jour\n');
} else {
  writeFileSync('.env', content);
  process.stdout.write(
    current === null
      ? '  créé depuis .env.example (secrets de développement générés)\n'
      : added.length > 0
        ? `  complété : ${added.join(', ')}\n`
        : "  secret resté à sa valeur d'exemple (publique) : régénéré\n",
  );
}

try {
  execFileSync('docker', ['info'], { stdio: 'ignore' });
} catch {
  fail('Docker ne répond pas : installer ou démarrer Docker Desktop, puis relancer npm run setup.');
}

// Un PostgreSQL installé sur le poste peut occuper 5432 sans bloquer Docker : npm run dev
// se connecterait alors à la mauvaise base.
if (!composePostgresRunning() && !(await isPortFree(5432))) {
  fail(
    'Le port 5432 est déjà utilisé (un autre PostgreSQL ?). Arrêter ce service, puis relancer npm run setup.',
  );
}

step('PostgreSQL et Mailpit');
run(
  'docker',
  ['compose', 'up', '--detach', '--wait', 'postgres', 'mailpit'],
  'PostgreSQL ou Mailpit ne démarre pas (port 5432, 1025 ou 8025 déjà pris ?). Voir le message de Docker ci-dessus.',
);

step('Migrations (image de production)');
run(
  'docker',
  ['compose', '--profile', 'app', 'run', '--rm', '--build', 'migrate'],
  'Les migrations ont échoué : voir le message ci-dessus.',
);

process.stdout.write(`
Prêt. Ensuite :
  npm run dev      API avec rechargement à chaud     http://localhost:3000/docs
  npm run stack    API dans l'image de production    http://localhost:3000/docs
  Mailpit          e-mails envoyés en local          http://localhost:8025

  dev et stack utilisent tous deux le port 3000 : arrêter l'un (npm run stack:down) avant l'autre.
`);
