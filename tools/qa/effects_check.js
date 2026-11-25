// Music chat (3D.353 on): the remade sound effects. Every effect switched over (NEW_LIVE in js/sound.js) must be a remade effect
// that exists; the remade effects fall back only to the old ones (OLDFX), never to the switched-over ones, so a sound whose
// samples have not loaded yet can't loop; and every recorded file the sound code loads (SFXN) must be in assets/audio/sfx.
// Run: node tools/qa/effects_check.js   (no browser needed)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const sound = fs.readFileSync(path.join(root, 'js/sound.js'), 'utf8');
let bad = 0; const fail = (m) => { bad++; console.log('FAIL ' + m); };

const i = sound.indexOf('const NEWFX = {'), j = sound.indexOf('const NFXV = {');
if (i < 0 || j < 0) { fail('no remade effects (NEWFX) in js/sound.js'); process.exit(1); }
const newfx = sound.slice(i, j);
const names = new Set([...newfx.matchAll(/^    ([a-z_0-9]+): /gm)].map((m) => m[1]));
const lm = sound.match(/const NEW_LIVE = \{([^}]*)\}/);
if (!lm) fail('no NEW_LIVE list');
const live = lm ? [...lm[1].matchAll(/([a-z_]+): '([a-z_0-9]+)'/g)].map((m) => [m[1], m[2]]) : [];
const fxNames = new Set([...sound.slice(sound.indexOf('const FX = {'), sound.indexOf('const OLDFX')).matchAll(/^    ([a-z_0-9]+)[:(]/gm)].map((m) => m[1]));
for (const [k, n] of live) {
  if (!names.has(n)) fail(`'${k}' is switched to '${n}', which is not a remade effect`);
  const newKeys = (sound.match(/const NEW_KEYS = \[([^\]]*)\]/) || [, ''])[1];
  if (!fxNames.has(k) && !new RegExp(`'${k}'`).test(newKeys)) fail(`'${k}' is not an effect the game has (FX)`);
}
const loops = [...newfx.matchAll(/(?<![A-Z.])FX\.([a-z_]+)/g)].map((m) => m[1]);
if (loops.length) fail(`remade effects fall back to the switched-over FX (${[...new Set(loops)].join(', ')}): use OLDFX`);
if (!/const OLDFX = \{ \.\.\.FX \}/.test(sound)) fail('the old effects are not kept (OLDFX)');
if (!/for \(const \[k, n\] of Object\.entries\(NEW_LIVE\)\) FX\[k\] = NEWFX\[n\]/.test(sound)) fail('NEW_LIVE is not applied to FX');
const sm = sound.match(/const SFXN = \[([\s\S]*?)\];/);
if (sm) {
  const files = new Set(fs.readdirSync(path.join(root, 'assets/audio/sfx')).map((f) => f.replace(/\.mp3$/, '')));
  const plain = [...sm[1].matchAll(/'([a-zA-Z0-9_]+)'/g)].map((m) => m[1]).filter((n) => !/^(woodH|woodL|woodM|metalL)$/.test(n));
  for (const n of plain) if (!files.has(n) && !/^(woodH|woodL|woodM|metalL)\d$/.test(n)) fail(`the sound code loads sfx/${n}.mp3, which is missing`);
}
const game = fs.readdirSync(path.join(root, 'src/game')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(root, 'src/game', f), 'utf8')).join('\n');
for (const [k] of live) if (!new RegExp(`SFX\\([^;]*'${k}'`).test(game)) fail(`'${k}' is switched over but the game never plays it (no SFX call names '${k}' in src/game)`);   /* 3D.355 */
console.log(`switched over: ${live.map(([k, n]) => (k === n ? k : k + '=' + n)).join(', ')}`);
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); } else console.log('OK');
