import { lazyRouteComponent } from '@tanstack/react-router';

// API publique de la feature (FE-003). Le reste de l'app n'importe que ce fichier.

/** GLB-013 : export des données et suppression du compte. Page privée, chargée à la demande. */
export const AccountPage = lazyRouteComponent(() => import('./routes/account-page'), 'AccountPage');
