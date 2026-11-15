#!/bin/bash
# tools/playtest/start.sh PORT SEED LOGFILE — start a play-test server in the background (stop it with: node tools/playtest/zh.js PORT quit)
D=$(cd "$(dirname "$0")" && pwd)
old=$(pgrep -f "server.js --port $1 "); [ -n "$old" ] && kill $old && sleep 2
nohup node $D/server.js --port $1 --seed $2 --log $3 > $3.server.txt 2>&1 &
for i in $(seq 1 45); do sleep 2; grep -q "play-test server" $3.server.txt && { cat $3.server.txt; exit 0; }; grep -q "Error" $3.server.txt && { cat $3.server.txt; exit 1; }; done; echo "server did not start"; exit 1
