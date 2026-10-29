/// GLB-013 : valeurs légales du projet, à reporter depuis le front web (`src/features/legal/legal-info.ts`).
enum LegalInfo {
    /// Même valeur que `backupRetentionDays` du web et que l'infra de production : durée de conservation
    /// des sauvegardes de la base, annoncée avant la suppression du compte.
    static let backupRetentionDays = 14
}
