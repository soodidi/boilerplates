import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n';
import { useExportAccount } from '../api/account-api';

/** GLB-013 : « Exporter mes données » (droit d'accès et de portabilité). */
export function ExportSection() {
  const m = useMessages();
  const exportAccount = useExportAccount();

  return (
    <section aria-labelledby="export-title" className="grid gap-3">
      <h2 id="export-title" className="text-xl font-semibold">
        {m.account.export.title}
      </h2>
      <p className="text-sm text-muted-foreground">{m.account.export.description}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          variant="secondary"
          disabled={exportAccount.isPending}
          onClick={() => {
            exportAccount.mutate();
          }}
        >
          {exportAccount.isPending ? m.account.export.submitting : m.account.export.submit}
        </Button>
        <p role="status" className="text-sm text-success">
          {exportAccount.isSuccess ? m.account.export.done : null}
        </p>
      </div>
      {exportAccount.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {m.account.export.error}
        </p>
      ) : null}
    </section>
  );
}
