// Démarrage du projet en développement, en une commande et relançable sans risque :
//   1. .env créé ou complété depuis .env.example (secrets de dev générés) ;
//   2. PostgreSQL et Mailpit démarrés (compose.yaml) ;
//   3. migrations appliquées avec l'image de production (même Dockerfile qu'en staging et en prod).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { syncEnv } from './env-file.mjs';

const step = (message) => process.stdout.write(`\n▸ ${message}\n`);

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
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
      : `  complété : ${added.join(', ')}\n`,
  );
}

try {
  execFileSync('docker', ['info'], { stdio: 'ignore' });
} catch {
  process.stderr.write(
    '\nDocker ne répond pas : démarrer Docker Desktop, puis relancer npm run setup.\n',
  );
  process.exit(1);
}

step('PostgreSQL et Mailpit');
run('docker', ['compose', 'up', '--detach', '--wait', 'postgres', 'mailpit']);

step('Migrations (image de production)');
run('docker', ['compose', '--profile', 'app', 'run', '--rm', '--build', 'migrate']);

process.stdout.write(`
Prêt. Ensuite :
  npm run dev      API avec rechargement à chaud     http://localhost:3000/docs
  npm run stack    API dans l'image de production    http://localhost:3000/docs
  Mailpit          e-mails envoyés en local          http://localhost:8025
`);
