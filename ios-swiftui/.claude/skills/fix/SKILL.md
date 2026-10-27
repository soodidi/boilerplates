---
name: fix
description: Corrige un bug selon GLB-004 et GLB-011 (reproduire par un test qui échoue, corriger, contrôler, PR). Plus léger que /feature : pas de planner ni de validation du plan sauf si la correction s'étend. Ex. /fix 34.
argument-hint: <numéro d'issue ou description du bug>
disable-model-invocation: true
---

Bug à corriger : $ARGUMENTS

Tu es le seul à lancer les agents ; ils échangent via les fichiers de `.claude/work/<sujet>/`.

## 1. Comprendre

- Si c'est un numéro d'issue : `gh issue view <n> --comments`. Sinon, considère la description comme l'issue.
- Il te faut le comportement observé, le comportement attendu et un moyen de reproduire. S'il en manque un, demande-le à l'humain et attends sa réponse.
- Choisis un `<sujet>` court en kebab-case et crée `.claude/work/<sujet>/`.

## 2. Reproduire avant de corriger

- Pars de `main` à jour : `git switch main && git pull`, puis `git switch -c fix/<sujet>` (GLB-002).
- Trouve la cause, pas seulement le symptôme :
  1. Rassemble les faits : message d'erreur exact, trace, étapes de reproduction, dernier changement dans la zone (`git log -p`).
  2. Formule **une hypothèse à la fois** et vérifie-la (log, test, lecture du code) avant d'en changer.
  3. Pas de correctif tant que la cause n'est pas établie. Après trois correctifs qui échouent, arrête-toi : expose à l'humain ce que tu as essayé et remets l'approche en question.
- Note la cause en deux ou trois lignes dans `.claude/work/<sujet>/cause.md`.
- Écris d'abord le **test de non-régression** au bon niveau (GLB-004) et vérifie qu'il **échoue** pour la bonne raison. Si le bug ne se reproduit pas par un test, explique pourquoi à l'humain avant d'aller plus loin.

## 3. Corriger

- Corrige au plus près de la cause, en suivant `AGENTS.md`. Pas de refactoring opportuniste dans la même PR : note-le pour une autre issue.
- Si la correction touche plus de trois fichiers de production, une migration, l'authentification ou un contrat d'API, **arrête-toi** : présente le plan à l'humain et attends sa validation, comme dans `/feature`.
- Le test ajouté passe, puis la vérification complète indiquée dans `AGENTS.md` passe. Ne contourne jamais un hook ni une règle de lint.
- **Vérifier avant d'annoncer** : n'écris jamais que le bug est corrigé sans avoir lancé le test et la vérification dans cette étape et cité leur résultat.

## 4. Contrôler

- Lance `reviewer` avec le dossier de travail, plus `security` si le bug touche une entrée externe, l'authentification, des données personnelles ou une dépendance, et `devops` si la CI, Docker ou l'infra changent.
- Corrige chaque `bloquant:`. **Deux tours maximum**, puis l'humain tranche.

## 5. Livrer

- Commit Conventional Commits en anglais (`fix: …`), `git push -u origin fix/<sujet>`, puis `gh pr create` : cause, correction, `Closes #<n>`, comment vérifier, et une section **Contrôles IA**.
- Active la fusion automatique : `gh pr merge <n> --squash --auto --delete-branch`. **Jamais `--admin`** ni autre contournement des checks : c'est GitHub qui fusionne quand la CI requise est verte (GLB-011, règle temporaire).
- Attends la CI : `gh pr checks <n> --watch`. Si un job échoue : `gh run view <id> --log-failed`, corrige la cause, pousse. Deux tentatives au plus ; au-delà, arrête-toi et explique à l'humain ce qui bloque.
- Termine par le lien de la PR, son état (fusionnée ou en attente de CI) et ce qui reste à l'humain (vérification en staging…).
