// Music chat (W100): every sound the game asks for must exist in js/sound.js, and every ranged weapon must have its own shot.
// Run: node tools/qa/sfx_names_check.js   (no browser needed)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const sound = fs.readFileSync(path.join(root, 'js/sound.js'), 'utf8');
const src = fs.readdirSync(path.join(root, 'src/game')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(root, 'src/game', f), 'utf8')).join('\n');

// names the sound module defines: FX keys, GUNS keys (spread into FX)
const block = (name) => { const i = sound.indexOf(`const ${name} = {`); let d = 0, j = sound.indexOf('{', i); const s = j; for (; j < sound.length; j++) { if (sound[j] === '{') d++; else if (sound[j] === '}' && --d === 0) break; } return sound.slice(s, j + 1); };
const keys = (b) => { const out = new Set(); let d = 0; for (const line of b.split('\n')) { const m = line.match(/^\s*([a-z_0-9]+):/); if (m && d === 1) out.add(m[1]); for (const ch of line) { if (ch === '{') d++; else if (ch === '}') d--; } } return out; };
const have = new Set([...keys(block('FX')), ...keys(block('GUNS'))]);

let bad = 0; const fail = (m) => { bad++; console.log('FAIL ' + m); };
const asked = new Set([...src.matchAll(/SFX\('([a-z_0-9]+)'\)/g)].map((m) => m[1]));
for (const n of asked) if (!have.has(n)) fail(`the game plays '${n}' but js/sound.js has no such sound`);

const sm = src.match(/const SHOT_SFX = \{([^}]*)\}/); if (!sm) fail('no SHOT_SFX table: guns have no shot sounds');
const map = Object.fromEntries([...(sm ? sm[1] : '').matchAll(/'?([A-Za-z ]+)'?: '([a-z_]+)'/g)].map((m) => [m[1].trim(), m[2]]));
const ranged = [...src.matchAll(/name: "([^"]+)"[^}]*ranged: true/g)].map((m) => m[1]);
for (const w of ranged) { if (!map[w]) fail(`ranged weapon '${w}' has no shot sound in SHOT_SFX`); else if (!have.has(map[w])) fail(`'${w}' plays '${map[w]}', which js/sound.js does not have`); }
for (const m of src.matchAll(/SFX\(w\.ranged \? '([a-z_]+)'/g)) if (!have.has(m[1])) fail(`the game plays '${m[1]}' for guns but js/sound.js has no such sound`);

console.log(`${asked.size} sounds asked for by name, ${ranged.length} ranged weapons (${ranged.join(', ')}), ${have.size} sounds defined`);
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); } else console.log('OK');
