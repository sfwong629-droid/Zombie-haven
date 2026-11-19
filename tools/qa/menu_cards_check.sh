#!/bin/sh
# tools/qa/menu_cards_check.sh — runs menu_cards_check.js once per phone size (a fresh browser each time), the held radio message at the first size.
# Serve the repo first (python3 -m http.server 8765 from the repo root). Exit 1 if any size fails.
cd "$(dirname "$0")"; rc=0; first=1
for s in phone:390x844 phoneS:360x640 phoneM:375x667 phoneXL:430x932 phoneN:320x568 phoneT:412x915; do
  if [ $first = 1 ]; then node menu_cards_check.js "$s" || rc=1; first=0; else node menu_cards_check.js "$s" nohold || rc=1; fi
done
exit $rc
