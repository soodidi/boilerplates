import { useMessages } from '@/i18n';
import { StatsSection } from '../components/stats-section';
import { UsersSection } from '../components/users-section';

/** BE-010 : page réservée (`requirePermission`). Ses données viennent de routes réservées de l'API. */
export function AdminPage() {
  const m = useMessages();

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">{m.admin.title}</h1>
      <StatsSection />
      <UsersSection />
    </div>
  );
}
