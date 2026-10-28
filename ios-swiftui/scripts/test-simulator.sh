#!/usr/bin/env bash
# IOS-005 : lance les tests du schéma iOSApp sur un simulateur iPhone (Keychain, tests de l'app).
# Le simulateur est un iPhone du runtime le plus récent que le SDK du Xcode actif sait cibler :
# les noms d'appareils changent d'une version de Xcode à l'autre, et un runner CI peut avoir
# des runtimes plus récents (bêta) que ce SDK.
# Usage : scripts/test-simulator.sh   (depuis la racine du projet, après `xcodegen generate`)
set -euo pipefail
cd "$(dirname "$0")/.."

sdk=$(xcrun --sdk iphonesimulator --show-sdk-version)
udid=$(xcrun simctl list devices available --json | python3 -c '
import json, re, sys
sdk = tuple(int(part) for part in sys.argv[1].split("."))
best = None
for runtime, devices in json.load(sys.stdin)["devices"].items():
    match = re.search(r"\.iOS-(\d+)-(\d+)$", runtime)
    if not match:
        continue
    version = (int(match[1]), int(match[2]))
    if not (26, 0) <= version <= sdk:
        continue
    iphones = [device for device in devices if device["name"].startswith("iPhone")]
    if iphones and (best is None or version > best[0]):
        best = (version, iphones[0]["udid"])
print(best[1] if best else "")
' "$sdk")
if [[ -z $udid ]]; then
  echo "Aucun simulateur iPhone iOS 26.0 à $sdk : installer la plateforme iOS dans Xcode." >&2
  exit 1
fi

# Résultats détaillés (logs, captures des tests UI) : publiés par la CI en cas d'échec.
result=build/TestResults.xcresult
rm -rf "$result"

# Signature locale (« Sign to Run Locally », sans équipe) : l'app hôte des tests a besoin
# d'un trousseau, donc de ses entitlements. CODE_SIGNING_ALLOWED=NO donnerait -34018.
xcodebuild test -quiet -project iOSApp.xcodeproj -scheme iOSApp \
  -destination "id=$udid" -resultBundlePath "$result" CODE_SIGN_IDENTITY=-
