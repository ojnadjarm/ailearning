#!/usr/bin/env bash
# Internal links first (every href/src resolves to a built page or file, no link to an unbuilt unit), then requests every
# external http(s) URL in the built pages and bundles and prints its HTTP status (needs network; the internal half runs in ci).
cd "$(dirname "$0")/.." || exit 1
node tools/link-check.mjs || exit 1
find dist -name '*.html' -o -name '*.js' -o -name '*.css' | xargs grep -o -h -E 'https?://[^"<`'"'"' )]+' | grep -v -E '^https?://(www\.w3\.org|127\.0\.0\.1|localhost)' | sort -u | while read -r u; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -L "$u")" "$u"
done
