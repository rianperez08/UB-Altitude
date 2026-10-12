#!/usr/bin/env bash
# Launch ONE screen in Chrome/Chromium kiosk mode (macOS / Linux).
# Usage: kiosk/screen.sh <page> [x] [y] [host]
#   kiosk/screen.sh /                         seat 1 in-flight screen (host)
#   kiosk/screen.sh "/window.html?frame=0" 1920 0
PAGE="${1:-/}"; X="${2:-0}"; Y="${3:-0}"; HOST="${4:-http://localhost:8080}"
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" google-chrome chromium chromium-browser; do
  if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then CHROME="$c"; break; fi
done
NAME=$(echo "$PAGE" | sed 's#^/##; s#[?&=./].*##'); NAME="${NAME:-ife}"
"$CHROME" --kiosk "$HOST$PAGE" --window-position="$X,$Y" --user-data-dir="${TMPDIR:-/tmp}/altitude-$NAME-$X" --no-first-run --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble >/dev/null 2>&1 &
