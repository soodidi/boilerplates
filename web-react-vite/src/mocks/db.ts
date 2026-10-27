import { type Note } from '@/features/notes';

export type MockNote = Note & { ownerId: string };

const DEMO_ID = '019a1f3e-0000-7000-8000-00000000000a';

/** Notes du compte de démonstration ; `ownerId` reste interne aux mocks (l'API filtre par utilisateur). */
const seed = (): MockNote[] => [
  {
    id: '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e7f',
    title: 'Lire les ADR du frontend',
    content: 'Commencer par adr/frontend/README.md.',
    createdAt: '2026-10-20T09:00:00.000Z',
    ownerId: DEMO_ID,
  },
  {
    id: '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e80',
    title: 'Brancher la vraie API',
    content: 'Mettre apiUrl dans public/config.json et enableMocks à false.',
    createdAt: '2026-10-21T14:30:00.000Z',
    ownerId: DEMO_ID,
  },
];

export type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  emailVerified: boolean;
};

/** Comptes de démonstration des mocks (jamais utilisés avec la vraie API). */
export const DEMO_USER: MockUser = {
  id: DEMO_ID,
  name: 'Demo',
  email: 'demo@example.com',
  password: 'demo-password-123',
  emailVerified: true,
};

export const OTHER_USER: MockUser = {
  id: '019a1f3e-0000-7000-8000-00000000000c',
  name: 'Other',
  email: 'other@example.com',
  password: 'other-password-123',
  emailVerified: true,
};

export const UNVERIFIED_USER: MockUser = {
  id: '019a1f3e-0000-7000-8000-00000000000b',
  name: 'Unverified',
  email: 'unverified@example.com',
  password: 'unverified-password',
  emailVerified: false,
};

/** Base en mémoire partagée par les mocks du navigateur et des tests. */
export const db = {
  notes: seed(),
  users: [DEMO_USER, OTHER_USER, UNVERIFIED_USER],
  /** Utilisateur connecté (le cookie de session de la vraie API). */
  sessionUserId: null as string | null,
};

export function resetDb() {
  db.notes = seed();
  db.users = [DEMO_USER, OTHER_USER, UNVERIFIED_USER];
  db.sessionUserId = null;
}

/** Tests : démarre avec l'utilisateur de démonstration connecté. */
export function signInAsDemo() {
  db.sessionUserId = DEMO_USER.id;
}
