#!/usr/bin/env bash
# GLB-011 : copie le kit IA commun (_shared/) dans chaque boilerplate.
# Usage : scripts/sync-shared.sh          → met à jour les copies
#         scripts/sync-shared.sh --check  → échoue si une copie diffère (utilisé en CI)
set -euo pipefail
cd "$(dirname "$0")/.."

boilerplates=(web-react-vite api-nestjs infra-scaleway android-compose ios-swiftui)
# source → destination relative au boilerplate
pairs=(
  "_shared/claude/agents:.claude/agents"
  "_shared/claude/skills:.claude/skills"
  "_shared/claude/hooks:.claude/hooks"
  "_shared/github/ISSUE_TEMPLATE/feature.yml:.github/ISSUE_TEMPLATE/feature.yml"
)

status=0
for bp in "${boilerplates[@]}"; do
  for pair in "${pairs[@]}"; do
    src=${pair%%:*}
    dest="$bp/${pair#*:}"
    if [[ ${1:-} == --check ]]; then
      if ! diff -r "$src" "$dest" >/dev/null 2>&1; then
        echo "✗ $dest diffère de $src : lancer scripts/sync-shared.sh" >&2
        status=1
      fi
    else
      mkdir -p "$(dirname "$dest")"
      rm -rf "$dest"
      cp -R "$src" "$dest"
    fi
  done
done

if [[ ${1:-} == --check ]]; then
  [[ $status -eq 0 ]] && echo "✓ kit IA identique dans tous les boilerplates"
else
  echo "✓ kit IA copié dans : ${boilerplates[*]}"
fi
exit $status
