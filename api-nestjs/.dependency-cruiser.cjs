/**
 * BE-002 : frontières entre modules vérifiées en CI (`npm run arch`).
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Pas de dépendance circulaire.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'module-internals',
      severity: 'error',
      comment:
        "Un module n'importe que l'index.ts d'un autre module, jamais ses fichiers internes (BE-002).",
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/.+',
        pathNot: ['^src/modules/$1/', '^src/modules/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'shared-does-not-import-modules',
      severity: 'error',
      comment: 'common/, config/, database/ et mail/ ne dépendent jamais d’un module métier.',
      from: { path: '^src/(common|config|database|mail)/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'controllers-do-not-touch-database',
      severity: 'error',
      comment: "Un contrôleur n'accède pas à la base : il passe par un service (BE-002).",
      from: { path: '\\.controller\\.ts$' },
      to: { path: ['^src/database/', '\\.repository\\.ts$', 'node_modules/drizzle-orm'] },
    },
    {
      name: 'mail-internals',
      severity: 'error',
      comment: "Le reste du code n'importe que src/mail/index.ts, jamais le transport (BE-009).",
      from: { pathNot: '^src/mail/' },
      to: { path: '^src/mail/.+', pathNot: '^src/mail/index\\.ts$' },
    },
    {
      name: 'nodemailer-only-in-mail',
      severity: 'error',
      comment: 'Seul src/mail/ utilise nodemailer (BE-009).',
      from: { pathNot: '^src/mail/' },
      to: { path: 'node_modules/nodemailer' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.spec\\.ts$' },
  },
};
