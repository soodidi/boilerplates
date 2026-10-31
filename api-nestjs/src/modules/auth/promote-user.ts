// BE-010 : donne le rôle admin à un compte existant.
//   npm run user:promote -- <email>   (en local ; en staging et en production : ADMIN_EMAILS, voir README)
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AuthRepository } from './auth.repository.js';
import { UsersService } from './users.service.js';

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const [email] = process.argv.slice(2);
const connectionString = process.env.DATABASE_URL;
if (!email) fail('Usage : npm run user:promote -- <email>');
if (!connectionString) fail('DATABASE_URL est requis.');

const pool = new Pool({ connectionString, max: 1 });
try {
  const users = new UsersService(
    new AuthRepository(drizzle({ client: pool, casing: 'snake_case' })),
  );
  if (!(await users.promoteToAdmin(email))) {
    process.stderr.write(
      'Aucun compte vérifié avec cette adresse : s’inscrire, confirmer l’adresse, puis relancer.\n',
    );
    process.exitCode = 1;
  } else {
    process.stdout.write('Compte promu administrateur. Effet à sa prochaine requête.\n');
  }
} finally {
  await pool.end();
}
