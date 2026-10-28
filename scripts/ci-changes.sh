#!/usr/bin/env bash
# OPS-002 : sur une PR, seuls les boilerplates touchés sont vérifiés. Un fichier hors des dossiers
# des boilerplates (_shared, .github, scripts, fichiers racine) relance tout ; un push sur main aussi.
# Usage : scripts/ci-changes.sh <event> [fichier de sortie]   (lit la liste des fichiers modifiés sur stdin)
set -euo pipefail

PROJECTS=(web-react-vite api-nestjs infra-scaleway android-compose ios-swiftui)
event="${1:?event}"
output="${2:-/dev/stdout}"

changed=' '
run_all=false
if [[ "$event" != "pull_request" ]]; then
  run_all=true
else
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    project="${file%%/*}"
    if [[ "$file" == */* && " ${PROJECTS[*]} " == *" $project "* ]]; then
      changed+="$project "
    else
      run_all=true
    fi
  done
fi

for project in "${PROJECTS[@]}"; do
  if $run_all || [[ "$changed" == *" $project "* ]]; then value=true; else value=false; fi
  echo "$project=$value" >> "$output"
done
