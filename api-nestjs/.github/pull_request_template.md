## Quoi

<!-- Ce que fait la PR, en une ou deux phrases. -->

## Pourquoi

<!-- Ticket, contexte, ADR concernés. -->

## Comment tester

<!-- Étapes pour vérifier le comportement. Captures d'écran pour toute UI. -->

## Definition of Done (GLB-009)

- [ ] Un seul sujet, moins de ~400 lignes modifiées (GLB-003)
- [ ] Tests ajoutés : logique métier, non-régression si c'est un bug (GLB-004)
- [ ] Chaque endpoint protégé a un test d'accès refusé (BE-008)
- [ ] Migration relue, compatible avec la version en production (expand/contract, BE-003)
- [ ] Aucune donnée sensible dans les logs ni dans les réponses d'erreur (BE-006, BE-007)
- [ ] Documentation à jour : README, `.env.example`, ADR si une décision a été prise
- [ ] Fonctionnalité risquée derrière un feature flag
