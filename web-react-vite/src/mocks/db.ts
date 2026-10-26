import { type Note } from '@/features/notes';

const seed: Note[] = [
  {
    id: '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e7f',
    title: 'Lire les ADR du frontend',
    content: 'Commencer par adr/frontend/README.md.',
    createdAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: '019a1f3e-7b2c-7d4e-9f10-2a3b4c5d6e80',
    title: 'Brancher la vraie API',
    content: 'Mettre apiUrl dans public/config.json et enableMocks à false.',
    createdAt: '2026-10-21T14:30:00.000Z',
  },
];

/** Base en mémoire partagée par les mocks du navigateur et des tests. */
export const db = {
  notes: [...seed],
};

export function resetDb() {
  db.notes = [...seed];
}
