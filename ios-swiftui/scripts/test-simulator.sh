#!/usr/bin/env bash
# IOS-005 : lance les tests du schéma iOSApp sur un simulateur iPhone (Keychain, tests de l'app).
# Le simulateur est le premier iPhone disponible : les noms changent d'une version de Xcode à l'autre.
# Usage : scripts/test-simulator.sh   (depuis la racine du projet, après `xcodegen generate`)
set -euo pipefail
cd "$(dirname "$0")/.."

udid=$(xcrun simctl list devices available --json | python3 -c '
import json, sys
devices = json.load(sys.stdin)["devices"]
iphones = [d for runtime, ds in sorted(devices.items(), reverse=True) if ".iOS-" in runtime for d in ds if d["name"].startswith("iPhone")]
print(iphones[0]["udid"] if iphones else "")
')
if [[ -z $udid ]]; then
  echo "Aucun simulateur iPhone disponible : installer la plateforme iOS dans Xcode." >&2
  exit 1
fi

# Signature locale (« Sign to Run Locally », sans équipe) : l'app hôte des tests a besoin
# d'un trousseau, donc de ses entitlements. CODE_SIGNING_ALLOWED=NO donnerait -34018.
xcodebuild test -project iOSApp.xcodeproj -scheme iOSApp \
  -destination "id=$udid" CODE_SIGN_IDENTITY=-
