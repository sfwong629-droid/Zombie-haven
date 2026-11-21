#!/bin/bash
# The balance check (docs/project/13-LONG-GAME.md, section 9). Run from the repo root.
#   tools/balance/check.sh quick OUT_DIR   about 30 to 40 minutes: 2 daily towns for 14 real days, 2 open towns for 30 game days
#   tools/balance/check.sh full OUT_DIR    overnight: 3 towns for each of the three players, to level 20 or 75 real days
# Then: python3 tools/balance/scorecard.py --daily OUT_DIR/daily --keen OUT_DIR/keen --open OUT_DIR/open --md OUT_DIR/scorecard.md
# PY is the Python that can start the browser (in the cloud workspace: "python3 /home/claude/scratch/wrap.py").
set -e
MODE=${1:-quick}; OUT=${2:-runs/check-$(date +%Y%m%d-%H%M)}; PY=${PY:-python3}; export ZROOT=${ZROOT:-$PWD}; mkdir -p "$OUT"
run() { # player seed check-ins-or-days budget-seconds
  case $1 in
    daily) CHECKIN_MIN=10 FIRST_MIN=30 AWAY_H=24 $PY tools/balance/long_study.py $2 $3 $4 "$OUT/daily" > "$OUT/daily_$2.log" 2>&1 ;;
    keen)  CHECKIN_MIN=20 AWAY_H=12 $PY tools/balance/long_study.py $2 $3 $4 "$OUT/keen" > "$OUT/keen_$2.log" 2>&1 ;;
    open)  $PY tools/balance/long_study.py $2 $3 $4 "$OUT/open" > "$OUT/open_$2.log" 2>&1 ;;
  esac; }
if [ "$MODE" = quick ]; then
  run daily 5 14 1500 & run daily 7 14 1500 & wait
  run open 5 30 900 & run open 7 30 900 & wait
else
  for s in 5 7 13; do run daily $s 75 7000 & done; wait
  for s in 5 7 13; do run keen $s 60 9000 & done; wait
  for s in 5 7 13; do run open $s 260 7000 & done; wait
fi
$PY tools/balance/scorecard.py --daily "$OUT/daily" --keen "$OUT/keen" --open "$OUT/open" --md "$OUT/scorecard.md"
