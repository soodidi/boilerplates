---
name: review
description: Fait relire la branche courante ou une PR par les agents reviewer, qa et security, sans rien modifier, puis présente une synthèse. Ex. /review ou /review 42.
argument-hint: '[numéro de PR]'
disable-model-invocation: true
---

Relecture demandée : $ARGUMENTS

1. Cible : si un numéro de PR est donné, `gh pr view <n>` et `gh pr diff <n>` ; sinon la branche courante (`git diff main...HEAD`). Si le diff est vide, dis-le et arrête-toi.
2. Crée `.claude/work/review-<branche ou n>/` et lance **en parallèle** `reviewer`, `qa` et `security` avec ce dossier, en précisant à `qa` de **ne pas écrire de test** : seulement signaler les manques. Ajoute `devops` si le diff touche `.github/`, un `Dockerfile` ou des fichiers `*.tf`.
3. Présente une synthèse unique : verdict global, puis les points `bloquant:` en premier (fichier, problème, ADR, correction proposée), ensuite les suggestions. Pas de doublons entre agents.
4. Ne modifie aucun fichier et ne publie rien sur GitHub. Si l'humain le demande ensuite, tu peux corriger les points ou poster la synthèse en commentaire de la PR (`gh pr comment`).
