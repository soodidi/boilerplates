---
name: feature
description: Développe une fonctionnalité de bout en bout selon GLB-011 (issue → plan validé → code → contrôles par les agents → PR). À utiliser avec un numéro d'issue GitHub ou une description courte, ex. /feature 12.
argument-hint: <numéro d'issue ou description>
disable-model-invocation: true
---

Tu orchestres le développement de : $ARGUMENTS

Suis ces étapes dans l'ordre. Tu es le seul à lancer les agents ; ils échangent via les fichiers de `.claude/work/<sujet>/`.

## 1. Comprendre

- Si c'est un numéro d'issue : `gh issue view <n> --comments`. Sinon, considère la description comme l'issue.
- Choisis un `<sujet>` court en kebab-case et crée `.claude/work/<sujet>/`.
- S'il manque des critères d'acceptation vérifiables, propose-les à l'humain et attends sa réponse.

## 2. Planifier

- Lance l'agent `planner` avec l'issue complète et le dossier de travail.
- Présente le plan à l'humain en quelques lignes (fichiers, tests, risques, questions) et **attends sa validation**. Exception : changement trivial.

## 3. Implémenter

- Pars de `main` à jour : `git switch main && git pull`, puis `git switch -c <type>/<sujet>` (GLB-002).
- Implémente étape par étape en suivant `AGENTS.md`, tests compris. Un commit Conventional Commits en anglais par étape cohérente.
- Lance la commande de vérification indiquée dans `AGENTS.md` jusqu'à ce qu'elle passe. Ne contourne jamais un hook ni une règle de lint.

## 4. Contrôler

- Lance **en parallèle** `reviewer` et `qa`, plus `security` et/ou `devops` si le plan le prévoit ou si le diff le justifie. Donne à chacun le dossier de travail.
- Corrige chaque `bloquant:`. Traite les `suggestion:` utiles, ignore les `nit:` si elles coûtent cher.
- Si un rapport contient une section « À transmettre », lance l'agent nommé.
- Relance seulement les agents dont les points étaient bloquants. **Deux tours maximum** : au-delà, ou si deux agents se contredisent, expose le désaccord à l'humain et attends sa décision.
- Relance la vérification complète après les corrections.

## 5. Livrer

- `git push -u origin <branche>` puis `gh pr create` en remplissant le template de PR : résumé, `Closes #<n>`, comment tester, et une section **Contrôles IA** qui résume chaque rapport (corrigé, ouvert, actions manuelles).
- **Ne fusionne jamais la PR.** Termine par le lien de la PR et la liste des actions qui restent à l'humain (relecture, validation en staging, secrets, `tofu apply`…).
