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
- Si le besoin est flou (plusieurs lectures possibles, choix d'UX ou de modèle de données ouvert), **cadre** avant le plan : pose une question à la fois, puis propose deux ou trois approches avec leurs compromis et ta recommandation. Attends le choix de l'humain.

## 2. Planifier

- Lance l'agent `planner` avec l'issue complète et le dossier de travail.
- Présente le plan à l'humain en quelques lignes (fichiers, tests, risques, questions) et **attends sa validation**. Exception : changement trivial.

## 3. Implémenter

- Pars de `main` à jour : `git switch main && git pull`, puis `git switch -c <type>/<sujet>` (GLB-002).
- Implémente étape par étape en suivant `AGENTS.md`, tests compris. Un commit Conventional Commits en anglais par étape cohérente.
- Lance la commande de vérification indiquée dans `AGENTS.md` jusqu'à ce qu'elle passe. Ne contourne jamais un hook ni une règle de lint.
- **Vérifier avant d'annoncer** : n'écris jamais qu'une étape est finie ou que les tests passent sans avoir lancé la commande dans cette étape et cité son résultat (nombre de tests, sortie en échec).

## 4. Contrôler

- Lance **en parallèle** `reviewer` et `qa`, plus `security` et/ou `devops` si le plan le prévoit ou si le diff le justifie. Donne à chacun le dossier de travail.
- Corrige chaque `bloquant:`. Traite les `suggestion:` utiles, ignore les `nit:` si elles coûtent cher.
- Si un rapport contient une section « À transmettre », lance l'agent nommé.
- Relance seulement les agents dont les points étaient bloquants. **Deux tours maximum** : au-delà, ou si deux agents se contredisent, expose le désaccord à l'humain et attends sa décision.
- Relance la vérification complète après les corrections.

## 5. Livrer

- `git push -u origin <branche>` puis `gh pr create` en remplissant le template de PR : résumé, `Closes #<n>`, comment tester, et une section **Contrôles IA** qui résume chaque rapport (corrigé, ouvert, actions manuelles).
- Active la fusion automatique : `gh pr merge <n> --squash --auto --delete-branch`. **Jamais `--admin`** ni autre contournement des checks : c'est GitHub qui fusionne quand la CI requise est verte (GLB-011, règle temporaire).
- Attends la CI : `gh pr checks <n> --watch`. Si un job échoue : `gh run view <id> --log-failed`, corrige la cause, pousse. Deux tentatives au plus ; au-delà, arrête-toi et explique à l'humain ce qui bloque.
- Termine par le lien de la PR, son état (fusionnée ou en attente de CI) et ce qui reste à l'humain (validation en staging, secrets, `tofu apply`…).
