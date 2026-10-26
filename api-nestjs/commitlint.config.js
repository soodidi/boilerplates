// GLB-002 — copie de @soodidi/commitlint-config (GLB-010).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'build', 'ci', 'chore', 'revert', 'adr'],
    ],
    'header-max-length': [2, 'always', 100],
  },
};
