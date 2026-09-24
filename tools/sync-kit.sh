#!/usr/bin/env bash
# Vendors the Cutaway and explainer kits (sources + fonts only) and records a sha256 per file in src/kit/VERSION.
set -euo pipefail
: "${CUTAWAY_KIT:?set CUTAWAY_KIT to the cutaway kit folder}"
: "${EXPLAINER_KIT:?set EXPLAINER_KIT to the explainer kit folder}"
cd "$(dirname "$0")/.."
rm -rf src/kit public/fonts
mkdir -p src/kit/cutaway src/kit/explainer public/fonts
cp -r "$CUTAWAY_KIT/src/." src/kit/cutaway/
cp -r "$EXPLAINER_KIT/src" "$EXPLAINER_KIT/adapters" src/kit/explainer/
cp "$CUTAWAY_KIT"/fonts/*.woff2 "$CUTAWAY_KIT"/fonts/OFL-*.txt public/fonts/
node tools/kit-verify.mjs --write
