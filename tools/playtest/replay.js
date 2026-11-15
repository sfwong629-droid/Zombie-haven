// tools/playtest/replay.js LOG PORT [UNTIL_DAY UNTIL_HOUR] — replays a tester's orders from a run log against a fresh server
// (same seed and build: the game is deterministic), stopping before the first order at or after the given day/hour.
const fs = require('fs'), http = require('http');
const [LOG, PORT, UD, UH] = process.argv.slice(2);
const call = (cmd, args) => new Promise((ok) => { const r = http.request({ host: '127.0.0.1', port: +PORT, method: 'POST', path: '/' }, (res) => { let s = ''; res.on('data', (c) => s += c); res.on('end', () => ok(JSON.parse(s))); }); r.end(JSON.stringify({ cmd, args })); });
(async () => { const L = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((l) => l.t === 'cmd' && !['state', 'help', 'stash', 'power'].includes(l.cmd));
  let n = 0, last; for (const l of L) { if (UD && (l.day > +UD || (l.day === +UD && l.hour >= +UH))) break; last = await call(l.cmd, l.args); n++;
    if (last.day !== undefined && l.cmd !== 'play' && (last.day !== l.day || last.hour !== l.hour)) { console.log('DRIFT at', n, l.cmd, l.args, 'log', l.day, l.hour, 'now', last.day, last.hour); break; } }
  console.log('replayed', n, 'orders; now day', last && last.day, 'hour', last && last.hour); })();
