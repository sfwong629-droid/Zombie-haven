// Music chat (3D.248): the day music is the five Ghibli tunes; (3D.249) the night music is Lanterns; (3D.255) fights play Stand Firm A/B by day, hordes and bosses The Tide. Every day track the game can pick must be a written tune whose
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
// 3D.255: a fight plays Stand Firm A and B in turn by day; a horde or a boss plays The Tide
const ft = sound.match(/const FIGHT_TUNES = \[([^\]]*)\], BIG_TUNE = '([a-z_]+)'/);
const fights = ft ? [...ft[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : [];
if (fights.join() !== 'stand_a,stand_b') fail(`the fight tunes are [${fights}], should be [stand_a,stand_b]`);
if (!ft || ft[2] !== 'tide') fail('the horde and boss tune is not tide');
if (!/danger \? \(bigFight \? BIG_TUNE : FIGHT_TUNES\[dayN % 2\]\)/.test(sound)) fail('a fight does not pick Stand Firm by day or The Tide when big');
const loop = fs.readFileSync(path.join(root, 'src/game/26-input-loop-init.js'), 'utf8');
if (!/SND\.danger\(\(S\.musDanger \|\| 0\) > tick, S\.z\.some\(\(z\) => z\.boss/.test(loop)) fail('the game does not tell the music when a boss or a big crowd is in town');
for (const t of [...want, 'lantern', ...fights, 'tide']) {
  if (!new RegExp(`\\n    ${t}: \\{ bpm:|SONG_DEF\\.${t} = \\{ \\.\\.\\.SONG_DEF\\.[a-z]+`).test(sound)) fail(`'${t}' has no written tune in SONG_DEF`);
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
console.log(`day tunes: ${tracks.join(', ')}; night: ${nm ? nm[1] : '-'}; fight: ${fights.join('/')}, big: ${ft ? ft[2] : '-'}; setting offers: ${keys.join(', ')}`);
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); } else console.log('OK');
