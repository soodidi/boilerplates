#!/usr/bin/env bash
# Hook PostToolUse de Claude Code (GLB-011) : formate et lint le fichier que l'IA vient de modifier.
# Les erreurs restantes sont renvoyées à l'IA (code de sortie 2) pour qu'elle les corrige tout de suite.
# Les outils absents sont ignorés : le hook ne bloque jamais faute d'outil installé.
set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | python3 -c 'import json, sys
try:
    print(json.load(sys.stdin).get("tool_input", {}).get("file_path", ""))
except Exception:
    print("")' 2>/dev/null)

[[ -z "$file" || ! -f "$file" ]] && exit 0
case "$file" in
  */node_modules/* | */dist/* | */build/* | */.build/* | */.claude/work/*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
errors=""
run() {
  local out
  if ! out=$("$@" 2>&1); then
    errors+="\$ $*"$'\n'"$out"$'\n'
  fi
}
has() { command -v "$1" >/dev/null 2>&1; }
has_node_tool() { [[ -x "node_modules/.bin/$1" ]]; }

case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs)
    has_node_tool prettier && run node_modules/.bin/prettier --write --log-level warn "$file"
    has_node_tool eslint && run node_modules/.bin/eslint --fix --no-warn-ignored "$file"
    ;;
  *.json | *.md | *.css | *.yml | *.yaml | *.html)
    has_node_tool prettier && run node_modules/.bin/prettier --write --log-level warn --ignore-unknown "$file"
    ;;
  *.kt | *.kts)
    has ktlint && run ktlint --format "$file"
    ;;
  *.swift)
    has swiftformat && run swiftformat --quiet "$file"
    has swiftlint && run swiftlint lint --quiet --strict "$file"
    ;;
  *.tf | *.tfvars)
    has tofu && run tofu fmt "$file"
    ;;
esac

if [[ -n "$errors" ]]; then
  printf 'Erreurs restantes dans %s après formatage et lint automatiques :\n%s' "$file" "$errors" >&2
  exit 2
fi
exit 0
