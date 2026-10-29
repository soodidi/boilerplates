import { lazyRouteComponent } from '@tanstack/react-router';

// API publique de la feature (FE-003). Le reste de l'app n'importe que ce fichier.

/** Page chargée à la demande (FE-008 : routes en lazy). */
export const AdminPage = lazyRouteComponent(() => import('./routes/admin-page'), 'AdminPage');

export { ADMIN_PAGE_PERMISSIONS, adminStatsQueryOptions } from './api/admin-api';
