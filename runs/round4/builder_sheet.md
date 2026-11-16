SCORE: 6/10 · level reached 9 · people alive 15 · deaths 0

# Evaluation sheet — Builder · build 3D.173 · seed 21 · days 1–20

Sources: my notes (builder_notes.md) and the run log (builder.jsonl). How I played: three long sessions, D1 08h–D8 05h (~165 game h), D8 05h–D13 21h (~136 h), D13 21h–D20 00h, with `away 22` twice in between (D8 05h, D13 21h).

## Fun score: 6 / 10
For a builder the growth was real: 4 people on D1, 15 on D20, level 9, a Week 2 grade S. But from about D6 to the end every build plan stalled on wood or scrap, on the 2-build limit, or on deliveries that never came. The level timers (48 h to 108 h) were only bearable because I spent renown to rush them.

## Three moments that raised it
1. D15 00h: "HAVEN REVIEW · WEEK 2 · GRADE S … Total 103/120 — title: Beacon of Hope" (Week 1 was B, 74/120). Clear proof the town grew: Population 20/20, Buildings 20/20.
2. D18 15h: "Victory Banner raised: The Toll Collector fell at your gate." I had refused the Toll Kings twice (12 scrap on D5, 24 scrap on D16). Their leader attacked with 10 raiders on D18 08h and lost. The story paid off a choice I made 13 days earlier.
3. D14 21h–D15 12h: once the Armory stood, my fighters equipped themselves ("Noah bought a Riot Vest… Lena bought a Crowbar…"). Babies grew up on schedule too (Ivy born D10, joined D15; Finn and Nora D13 → D18; Kai D15 → D20). The town felt like it was running itself in a good way.

## Three moments that lowered it
1. D17 06h: one night did "Buildings damaged: 4 (202 damage)". Next morning I had scrap 4 and wood 1, and the radio said "not enough wood and scrap for tonight's upkeep (9.9)". Two days earlier I had 71 wood (D15 16h). Repairs eat the whole stockpile with no warning.
2. D18 21h–D19 06h, Mutant Zombie + 13: 7 people down at once by D19 03h, including Eli the medic ("6 zombies next to them: nobody walks in on their own"). Guard Noah was "hiding" at 67% HP. Maya was down from D18 23h to D19 09h. Radio help was gone because I couldn't pay a favour (see Bugs). Nobody died, but I was only watching, not playing.
3. D2–D18, water: barrels seemed to work only when it rained. D2 11h: −4.3/day, 1.5 days left. D18 00h: −6.1/day, 6.6 water left. Staffing the barrels or Rain Collectors moved the forecast by 0.1 on D2 and not at all on D18 (−5.8 before and after). There is no water building that a builder can plan around. Traders (D3) and Houses trips (D18: +9 water) were what saved me.

## Waiting with nothing to do
- Level timers: L3→4 was 48 h (D3 20h), L4→5 60 h (D6 14h), L5→6 72 h (D9 16h), L7→8 96 h (D13 01h), L8→9 108 h (D15 08h), L9→10 120 h (D18 00h). I rushed L6, L7, L8 and L9 with 150 / 75 / 188 / ~212 renown, so renown was never available for anything else.
- Build queue: the 2-build limit plus slow delivery. D15 16h I ordered Cabin + Fenced Farm. The Cabin finished D16 19h and the farm D16 23h, ~27–31 h, while 62 wood sat in stock (D16 08h) and `build ammobench` was refused: "two builds already running (the limit)". The Quarry site sat D13 11h → D14 06h with 29 wood in stock. The 2nd Medical Tent, ordered D19 07h, was still not built by D20 ("nothing delivered for 6 h").
- Early wood: D1–D6 my wood stayed under 25. Each low-risk Lumber trip gave 8–23 wood and usually a collapsed guard.

## Over too quickly or too easy
- Boss nights 1 and 2 (Butcher D6, Stalker D12) were beaten without any input from me, with loot (Crossbow, Kevlar Vest).
- Trading Post = Civic Banner for 14 wood, 5 scrap, 2 cloth (D8 14h → banner D8 20h). It unlocked level 6 almost for free.
- Couples had babies the same hour they became couples (D10 00h Ben+Eli → Ivy; D15 00h Kai). There was no build-up to it.

## Stuck
- Walls: I never sealed the town. Outer line left 48 (D1), 34 after placing 30 (D4), then 69 after the Lodge (D6), 47 after I placed 40 more on D17 02h (74 wall tiles). `buildingsInside` was "0/18" (D7) and "1/28" (D17). Every wall tile costs 1 wood, so sealing competed with every building. I gave up on it.
- "The Lodge's door is walled in: only 0 of N buildings can reach it" every night at 03h from D6 to D19. I placed blind gates at 21,9 / 14,9 / 12,9 / 10,9 (D7, D10). The message never went away. The tool gives no map, so I could not find the door. I don't know whether it caused the stalled deliveries ("can't reach a storage door with their load" D1, D6, D9, D13, D14, D15, D16, D19).
- Scrap at the end: D19 07h scrap 7, D20 scrap 9. I couldn't start Gadgets (needs 8 scrap with 35 research) or the Fort (12 scrap, 30 stone; I had 33 stone at D20).

## Did the game serve your goal or get in its way?
Both. Planning was rewarded: Lodge → Lumber Camps → Quarry → Fort is a clear ladder, the tier-2 list on D6 was exciting, and the town grew to 15 with 0 deaths. But my builder plans kept running into three walls:
- 2 builds at once, with deliveries that stall for many hours.
- Repairs that quietly drain the stockpile I was saving (D12 06h: wood 11 → 2 after one 3-wood tent; D17: 202 damage → wood 1).
- Workers being reshuffled. After every trip the returning scavenger was put back on the Scrapyard (D6 10h, D13 10h, D17 10h, D18 09h), which left the Pallet Yard empty. On D17 both Scrapyards were empty.
Idle people stayed idle: Amy and Ben show "free" in almost every state print.

## Bugs and confusing text
- D18 00h favour card: "Pay (15 🍖 10 💧)" with water 6.6. Pressing Pay just showed the same card again with no "not enough water" message. The button text also lost its icons: "Pay (15 \n 10 \n)".
- `levelup` D6 11h → `{"ok":false,"upgrading":false}` with no reason (I was 1 person short). `upgrade workshop` D9 20h and `upgrade water` D18 14h/18h → `{"ok":false}` with no reason (probably the build limit or one-at-a-time).
- `pet Pepper Marcus` D6 09h while Marcus was on a trip → `"why":"pet PETNAME PERSON"` (usage text instead of the real reason).
- Rescue spam D16 22h: "Lena is rescuing Amy. / Maya is rescuing Theo." alternated ~16 times in the same hour. There are many "🩸 Nobody is reaching X" lines while 3–4 people are "rescuing" (Theo down D16 19h–23h, Maya D18 23h–D19 09h).
- "beds" shows a level population cap, not beds: "8/8" after building 3 tents (D4). Building tents gave me nothing I could see.
- Away card D8: "Waiting in the trays: 5 · 5 · 3 · 3 · 9" (no item names or icons).
- Radio says "the Haven can reach the next level" while a level-up is already running (D10 08h, D11 08h, D15 08h, D18 08h, D19 08h).
- Grammar: "Amy is now a Engineer", "while a infected dog breaks in".
- D8 08h: I sent Lena on a "Radio signal" trip of "about 2 days". The next news line was "Lena will staff the Scrapyard", and she collapsed in town D8 22h. I don't know if the trip ever happened.
- Low-risk trips felt high-risk: D3 Marcus "collapsed and is being carried" on Lumber low; D4 Marcus (87%) collapsed in stage 1 of Pharmacy low; D7 Maya (64/64 HP) collapsed in stage 2.

## Problems with the test tool (separate from the game)
- No map and no coordinates for the Lodge door or the gate positions, so the "door walled in" problem could not be solved from the tool. `walls` only lists gaps.
- `away 22` credits only 8 game hours (D8 and D13). That is fine as a rule, but the tool output is the only place I learned about the cap.
- D18 00h: one `play 7` ran past the 120 s shell limit and had to be waited on in the background. The server slowed down late in the run.

## The one change you would make
Show the builder where materials go: a daily wood/scrap ledger (production vs. repairs vs. upkeep vs. builds) and an alert when a delivery is blocked, with the blocked door on the map. Then let a player with spare stock run a third build (or pay renown for it). The 2-build limit plus silent repair drain is what turned a planning game into a waiting game for me.
