/** Message de résultat d'un formulaire : erreur (`alert`) ou confirmation (`status`). */
export function FormMessage({
  error,
  success,
}: {
  error?: string | undefined;
  success?: string | undefined;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p role="status" className="text-sm text-success">
        {success ?? null}
      </p>
    </>
  );
}
