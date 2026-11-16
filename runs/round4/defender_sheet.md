SCORE: 5/10 · level reached 7 · people alive 11 (+3 babies) · deaths 0

# Evaluation sheet — Defender · build 3D.173 · seed 21 · days 1–20

Every claim cites a day and a number from defender_notes.md or defender.jsonl.

## Fun score: 5 / 10
I met the Defender goal: nobody died in 19 days. But I got there because downed people bleed out slowly (13–16 game h timers) and hospitals heal fast, not because my defences worked. Walls, the post and research never gave me a town that holds at night. Most nights ended with 4–9 names on the "Hurt" list, and I watched it happen without a lever to pull.

## Three moments that raised it
1. D12 21 – D13 06: Bloater Queen + 8. June threw two Molotovs on her own ("3 hit", "4 hit"), "BOSS DEFEATED" at D13 02, and the morning card said "Hurt: Marcus" only. This was the one night where gear I bought (2 molotovs for 6 scrap) clearly paid off.
2. D11 09: the Lumber Camp went up. Wood went from 0 to 14 by D11 20 without sending anyone out. After 10 days of wood shortage it felt like relief.
3. D10 07–12: 6 raiders downed Marcus, Noah, Ben and Amy at once ("4 down, too few left to fight"). Everyone got carried in by D10 11 and nobody died. It was tense and I cared about these people. Couples, babies (Ivy D8, Finn D13, Nora D16, Kai and Wren D19) and grown-up children joining as workers kept the town feeling alive.

## Three moments that lowered it
1. D6 10: `walls 13` put down 13 tiles, and outerLineLeft went UP from 13 to 47. By then I had spent about 45 wood on walls since D1. The line was never sealed ("buildingsInside 0/16" on D11, "0/18" on D15). For a Defender this is the core fantasy, and it broke.
2. D14 24, then every night at 03:00 until D19: "The Lodge's door is walled in: only 0 of 16 buildings can reach it. Put a Gate in the fence". My own walls had cut off the HQ. That explains the "can't reach a storage door" lines (D1 12, D2 18, D7 10, D10 19, D15 15, D16 14, D18 08) and the "path blocked" rescues on D12 02. Nothing told me clearly until D14, and I never managed to fix it (see Stuck).
3. Rescue loops: Theo was down for 13 h (D18 02 → D18 15), Lena for 8 h (D8 03 → 11), Theo 9 h (D10 18 → D11 03), Ivy 5 h (D16 22 → D17 03). News showed "X is rescuing Theo" about 15 times with nobody picking him up. The `rescue` and `bandage` orders said "ok" and changed nothing I could see, except that bandage raised the bleed timer from 9 to 11 h on D18 10.

## Waiting with nothing to do
- Level timers: L3→4 took 48 h (D4 06), L4→5 60 h, L5→6 72 h (D13 00), L6→7 84 h (D16 00), L7→8 96 h (D19 00). From D13 on I was mostly waiting out level timers while running the same lumber trip.
- Wood, D1–D11: wood sat at 0 for much of every session (D1 15, D5 07, D6 10, D7 06, D9 10, D11 07). The only answer was another "low risk" Lumber Yard trip. I ran about 14 of them, and they were all alike: "Go round the long way / Leave them".

## Over too quickly or too easy
- Banner for L5→6: built a Trading Post (14 wood) on D7 15 and was done. No fight needed.
- Away sessions: 20 h away finished the 60 h level timer at once (D6 10 L5, D15 10 L6, D18 12 L7). The tool says "nobody heals" while away, but on D18 12 everyone came back at about 100%. Away was the safest part of the game.
- Death felt close to impossible. Bleed timers of 12–16 game h, plus hospital recovery from 1% to 69% in 1 h (D10 09), meant my "nobody dies" goal never felt at real risk. Only the long rescue loops made it uncertain.

## Stuck
- Gate for the Lodge (D14–D20): the tool has no map, so I could not see where the Lodge door meets the fence. I guessed: `wall 12 12 gate`, `14 11`, `13 11`, `7 14`, `8 14`, `11 11`, `12 11`. Some calls on D15 06 returned "placed": "wood" (they put down a fence, not a gate) or "Not enough: need 🪵 1". The warning kept coming back (D16 03, D17 03, D18 03, D19 03). I did not get out.
- Clinic: `upgrade clinic` on D14 17 said "no room around the old one". `build barrel` on D8 17 said "A wall or fence is in the way on 38 spots". My walls had used up the build area. I got around it with a 2nd Medical Tent (D15 04), but never got the Clinic.
- Reinforced Walls research: on D13 14 `research walls` said "needs 30 research points (have 37) and 10 scrap (have 21)", which I met, and walls had dropped off the research list. I never got it.
- Traps: Dusk Radio (D6 06) talks about Spike Strips, Barbed Wire and a Noise Lure. I found no command or building for them. Gadgets research (D13 20) turned out to be "stat accessories".

## Did the game serve your goal or get in its way?
Half and half. Gear and people served it: the Machete (D6), Firefighter Coat and Army Helmet for Marcus, Biker Leathers and Riot Vest, Molotovs, the dogs barking at raiders (D10 09, D18 01), and a Police Officer (D18). The Week 2 review moved Defense from 9/20 (D8) to 17/20 (D15).

The walls got in its way. My most-used Defender tool trapped my own HQ and took up my build space, and the line kept growing. "Low risk" trips also hurt people often: Marcus came back at 11% (D4 10), Ben collapsed (D6 10), Marcus collapsed at 143/143 health (D8 10), June and Maya both collapsed in one stage (D8 17), Maya collapsed in stage 1 (D11 07). As a Defender I could not keep people safe outside the walls or inside them. Daytime collapses of people at low health who were working (Noah D6 16, Maya D11 14, Marcus at 6% D13 08, Lena at 70% D17 09) suggest workers go out to unprotected spots.

## Bugs and confusing text
Game:
- D13 14: `research walls` → "needs 30 research points (have 37) and 10 scrap (have 21)". Both were met and walls was missing from the list.
- D4 06 morning card: "Buildings damaged: 0 (24 damage)", but news at D4 04 said "A walker wrecked the Camp".
- D3 17 radio: "upgrade the Camp to a Lodge ... ⚙ 4 🪵 8". The real cost was "hq→hq2: 20 wood, 5 mat".
- D5 07: 3 tents ("Two beds" each) but beds stayed at "8/8". Beds seem tied to level, not to tents.
- D8 08: the wandering medic "treated" Lena to 40%, but she stayed "down" until carried at D8 11.
- D8 10: "Short on supplies: the trip is riskier" appeared only in the report, after Marcus collapsed. There was no warning before I sent the squad.
- D4 10: the STACKED LOGS card resolved with "no orders came", but `play` did not stop for it (it came after an Eli-sick card).
- Rescue loop: the same people "rescuing" a downed person for 5–13 h without a pickup (D6 16, D10 18, D16 22, D18 02).
- D8 00: the favour (15 food 10 water) took water from 17 to 1.9 with no warning. D9 00 then said "Out of water: rations were short today".
- Workers listed as "free" while assigned to a workplace (Ben D4 18, Noah D6 14, Lena D15 10).

Test tool:
- `tool` with no arguments → JS error "Cannot read properties of undefined (reading 'tiers')" (D1 15). `tool axe`, `tool pick` and `cart` → ok:false with no reason (D1, D2, D7).
- `post` returns ok:true (D3 09, D10 12) but no building or news appears. I could not tell whether a guard post exists.
- `upgrade workshop` (D18 17) and `levelup` (D6 06, D18 17) → ok:false with no "why".
- `walls 2` placed 4 tiles (D1 08).
- `wall X Y gate` sometimes reports "placed": "wood" (D15 06).
- No map or coordinates for buildings, doors or downed people, so the game's "put a Gate in the fence" advice can't be followed through the tool.
- My own process error: session 1 ran 98 game h instead of 72 (D1 08 → D6 10) before my first away.

## The one change you would make
Make walls safe to build: auto-place a gate wherever a wall would cut off a building's door (or refuse that tile). Also keep the outer wall line from growing after you've paid for it, or tell the player ahead of time that a level-up moves it. For a Defender, the wall line has to be something you can finish and trust. In this run it was a 47-tile, moving target that locked my own HQ.
