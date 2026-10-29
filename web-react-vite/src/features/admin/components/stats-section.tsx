import { useSuspenseQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { useMessages } from '@/i18n';
import { adminStatsQueryOptions } from '../api/admin-api';

const numberFormatter = new Intl.NumberFormat();

export function StatsSection() {
  const m = useMessages();
  const titleId = useId();
  const { data: stats } = useSuspenseQuery(adminStatsQueryOptions());

  return (
    <section aria-labelledby={titleId} className="grid gap-3">
      <h2 id={titleId} className="text-xl font-semibold">
        {m.admin.stats.title}
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        {[
          { label: m.admin.stats.users, value: stats.users },
          { label: m.admin.stats.notes, value: stats.notes },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-md border border-border p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold">{numberFormatter.format(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
