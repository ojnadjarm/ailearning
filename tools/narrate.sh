#!/usr/bin/env bash
# Renders only the named clips with Kokoro and merges only them into the shipped bundle: tools/narrate.sh <unit slug> <clip id>...
# Needs KOKORO_PY (the Kokoro venv's python) and KOKORO_RENDER (render_narration.py). The render dir is seeded from the shipped cues.json,
# so an older render there never leaks in; raw WAVs stay in content/.render/. Shipped clips are 24 kbps unless NARRATION_KBPS says otherwise.
set -euo pipefail
[ $# -ge 2 ] || { echo "usage: tools/narrate.sh <unit slug> <clip id>..." >&2; exit 2; }
slug=$1; shift
render=content/.render/$slug ship=public/bundles/$slug
mkdir -p "$render"
cp "$ship/cues.json" "$render/cues.json"
NARRATION_KBPS=${NARRATION_KBPS:-24} "${KOKORO_PY:?set KOKORO_PY}" "${KOKORO_RENDER:?set KOKORO_RENDER}" "units/$slug/unit.json" "$render" "$@"
python3 - "$render/cues.json" "$ship/cues.json" "$@" <<'PY'
import json, sys, pathlib
new, ship = (json.loads(pathlib.Path(p).read_text()) for p in sys.argv[1:3])
for c in sys.argv[3:]:
    ship["clips"][c] = new["clips"][c]
pathlib.Path(sys.argv[2]).write_text(json.dumps(ship, indent=1) + "\n")
PY
for c in "$@"; do cp "$render/audio/$c.opus" "$render/audio/$c.m4a" "$ship/audio/"; done
echo "narrate: merged $* into $ship"
