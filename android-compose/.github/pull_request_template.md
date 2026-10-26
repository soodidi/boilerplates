## Quoi

<!-- Ce que fait la PR, en une ou deux phrases. -->

## Pourquoi

<!-- Ticket, contexte, ADR concernés. -->

## Comment tester

<!-- Étapes, appareil et version d'Android. Captures d'écran (clair et sombre). -->

## Definition of Done (GLB-009)

- [ ] Un seul sujet, moins de ~400 lignes modifiées (GLB-003)
- [ ] Tests : ViewModel avec fakes, test UI si l'écran change (AND-005)
- [ ] Écran vérifié avec TalkBack, en mode sombre, avec une grande taille de police, sur petit écran
- [ ] Composables avec `@Preview` (cas nominal + cas limite) (AND-001)
- [ ] Textes dans `strings.xml` (fr et en) (GLB-007)
- [ ] Aucun secret ni donnée personnelle dans le code ou les logs (AND-004)
- [ ] Fonctionnalité risquée derrière un feature flag
