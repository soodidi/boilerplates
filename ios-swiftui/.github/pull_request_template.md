## Quoi

<!-- Ce que fait la PR, en une ou deux phrases. -->

## Pourquoi

<!-- Ticket, contexte, ADR concernés. -->

## Comment tester

<!-- Étapes, appareil et version d'iOS. Captures d'écran (clair et sombre). -->

## Definition of Done (GLB-009)

- [ ] Un seul sujet, moins de ~400 lignes modifiées (GLB-003)
- [ ] Tests : ViewModel avec fakes (Swift Testing) (IOS-005)
- [ ] Écran vérifié avec VoiceOver, en mode sombre, en Dynamic Type maximal, sur petit écran
- [ ] Vues avec `#Preview` (cas nominal + cas limite) (IOS-001)
- [ ] Textes dans le String Catalog (fr et en) (GLB-007)
- [ ] Privacy Manifest à jour si une API sensible ou un SDK est ajouté (IOS-003)
- [ ] Fonctionnalité risquée derrière un feature flag
