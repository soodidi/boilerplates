// Copie de @soodidi/prettier-config/tailwind (GLB-010).
/** @type {import('prettier').Config} */
export default {
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  // FE-005 : ordre des classes Tailwind trié automatiquement.
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles.css',
  tailwindFunctions: ['cn', 'cva'],
};
