// tools/playtest/zh.js PORT COMMAND [ARGS...] — talk to a running play-test server (tools/playtest/server.js) and print the answer.
//   node tools/playtest/zh.js 8801 state full      node tools/playtest/zh.js 8801 build barrel      node tools/playtest/zh.js 8801 play 6 morning
const http = require('http');
const [port, cmd, ...args] = process.argv.slice(2);
const body = JSON.stringify({ cmd, args });
const req = http.request({ host: '127.0.0.1', port: +port, method: 'POST', path: '/', headers: { 'content-type': 'application/json' } }, (res) => {
  let s = ''; res.on('data', (c) => s += c); res.on('end', () => { try { console.log(JSON.stringify(JSON.parse(s), null, 1)); } catch (e) { console.log(s); } });
});
req.on('error', (e) => { console.error('no play-test server on port ' + port + ': ' + e.message); process.exit(1); });
req.end(body);
