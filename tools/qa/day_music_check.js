// Music chat (3D.248): the day music is the five Ghibli tunes; (3D.249) the night music is Lanterns. Every day track the game can pick must be a written tune whose
// instruments are all in the game's files; the Day music setting offers exactly those tunes plus the mixes; Meadow is the default.
// Run: node tools/qa/day_music_check.js   (no browser needed)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const sound = fs.readFileSync(path.join(root, 'js/sound.js'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/game/15-save.js'), 'utf8');
let bad = 0; const fail = (m) => { bad++; console.log('FAIL ' + m); };

const tm = sound.match(/const DAY_TRACKS = \[([^\]]*)\]/); if (!tm) { fail('no DAY_TRACKS'); process.exit(1); }
const tracks = [...tm[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
const want = ['meadow', 'morning', 'fair', 'rain', 'harvest'];
if (tracks.join() !== want.join()) fail(`DAY_TRACKS is [${tracks}], should be [${want}]`);
if (!/dayPick = 'meadow'/.test(sound) || !/getItem\('zhDayMusic'\) \|\| 'meadow'/.test(sound)) fail('Meadow is not the default day music');
if (!/!DAY_TRACKS\.includes\(dayPick\)/.test(sound)) fail('a saved pick of an old tune is not moved to Meadow');

const songs = sound.slice(sound.indexOf('const SONGS = {'), sound.indexOf('const MVOL = {'));
const inst = new Set([...sound.match(/const INST = \{([^}]*)\}/)[1].matchAll(/([a-z]+):/g)].map((m) => m[1]));
// 3D.249: the night music is Lanterns
const nm = sound.match(/const NIGHT_TUNE = '([a-z_]+)'/);
if (!nm || nm[1] !== 'lantern') fail(`the night tune is ${nm ? nm[1] : 'not set'}, should be 'lantern'`);
if (!/night \? NIGHT_TUNE :/.test(sound)) fail('the night does not play NIGHT_TUNE');
for (const t of [...want, 'lantern']) {
  if (!new RegExp(`\\n    ${t}: \\{ bpm:`).test(sound)) fail(`'${t}' has no written tune in SONG_DEF`);
  const i = songs.indexOf(`\n    ${t}(x) {`); if (i < 0) { fail(`'${t}' has no arrangement in SONGS`); continue; }
  const body = songs.slice(i, songs.indexOf('\n    },', i));
  for (const m of body.matchAll(/(?:line\(x, |arp\(x, |x\.P\(|x\.PAD\()'([a-z]+)'/g)) {
    if (!inst.has(m[1])) fail(`'${t}' plays instrument '${m[1]}', which is not in INST`);
    else if (!fs.existsSync(path.join(root, 'assets/audio', m[1])) || !fs.readdirSync(path.join(root, 'assets/audio', m[1])).some((f) => f.endsWith('.mp3'))) fail(`'${t}' plays '${m[1]}' but assets/audio/${m[1]}/ has no samples`);
  }
  if (!new RegExp(`[{ ]${t}: [0-9.]+`).test(sound.match(/const MVOL = \{[^}]*\}/)[0])) fail(`'${t}' has no loudness in MVOL`);
}
const dm = save.match(/const DAYMUS = \{(.*?)\};/); if (!dm) fail('no DAYMUS in 15-save.js');
const keys = dm ? [...dm[1].matchAll(/(?:^\s*|, )([a-z]+): \[/g)].map((m) => m[1]) : [];
for (const t of want) if (!keys.includes(t)) fail(`the Day music setting does not offer '${t}'`);
for (const k of keys) if (!want.includes(k) && !['mix', 'slow'].includes(k)) fail(`the Day music setting offers '${k}', which is not a day tune`);
console.log(`day tunes: ${tracks.join(', ')}; night: ${nm ? nm[1] : '-'}; setting offers: ${keys.join(', ')}`);
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); } else console.log('OK');
