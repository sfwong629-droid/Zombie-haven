SCORE: 5/10 · level reached 10 · people alive 16 (+ baby Nora) · deaths 2

# Evaluation sheet — Rusher · build 3D.172 · seed 21 · days 1–20

Every claim cites a day and a number from rusher_notes.md or rusher.jsonl.

## Fun score: 5 / 10
For a Rusher, levels 1 to 8 were great: rushing the level timer with renown made progress feel fast (L3 by D2 13, L8 by D12 08). From D7 on, every night the same thing happened: walkers inside the walls, 5 to 12 people down, hours of rescues, and repairs that used up all the wood. On D16 13 I hit a second Banner gate and spent the last 3.5 days stuck at L10 with 85–99 renown I had nothing to spend on.

## Three moments that raised it
1. D2 01 → D2 13: `levelup` then `rushlevel all` for 25 renown each time took me from L1 to L3 in 12 game hours. Exactly what a rusher wants.
2. D16 14–18: Gas Station medium with Marcus/Theo/Tomas, the 35% pump gamble paid off, +27 fuel. Felt like a smart push toward the Radio Tower banner.
3. D12 13 → D13 04: upgrading to the Fort under the Defend policy. That night (Gatling Boss + 9) did only 36 building damage, against 246–440 on the Balanced nights around it (D7: 204, D8: 440, D12: 246). It was the only night that felt "solved".

## Three moments that lowered it
1. D7 16–20: Lena (60% HP, made a resident that same hour) died at Stage 1 of a Medium Lumber Yard trip. No decision card came first. I only learned it from "Lena 💀 lost" in the squad line of a raider-toll card at D7 18.
2. D18 09–19: Tomas was already down, went "bleeding out" at D18 16, and died and "rose again as a zombie" at D18 18. My `play 10` never stopped, because he was down before the call. Death 2.
3. D16 13 → D20: L10 needed a second Banner, because the Trading Post banner was "civic (used)". The Radio Tower needed 10 wood. Wood went 15 → 1 overnight on D16 from repairs, sat at 0–2 for about 20 game hours on D17–18, and expeditions were blocked by "Quarantine cordon: nobody leaves until day 19". The tower was still a "radio (site)" at D20 01.

## Waiting with nothing to do
- D17 08 → D19 08 (48 game h): waiting out the Quarantine cordon with wood at 0–2. I could not build, expedition or level, so I only reissued rescue orders.
- D16 13 → D20 (about 84 game h): no level timer running. Renown climbed to 99 with nothing to spend it on (`expandLand` jumped from 60 to "320 renown + 50 wood, 25 mat" by D14 08).
- Each level timer grew: 6h (L2), 48h (L4), 60h (L5), 72h (L6), 84h (L7), 96h (L8), 108h (L9), 120h (L10). Renown income was about 48/day (D11 08: 28 → D12 08: 76), so rushing kept up through L10.

## Over too quickly or too easy
- Early levels: L1 → L3 in 12 game hours (D2 01 → D2 13) for 50 renown total. The timer barely exists early on.
- Research finishes instantly: `research walls` at D9 07 was "Research complete" in the same tick, and so was medicine at D13 11.
- `away 8` moved the L9 timer from about 50 game h left (61h at D13 08, minus 11 played) to 1h (D13 19), while trays were credited only 8 game h. Either intended (real hours) or a big skip; either way it was far stronger than rushing.

## Stuck
- Walls never sealed. On D5 00 `walls 8` placed 8 tiles (32 wood), then `wall 15 15` and gate `10 18`: "buildingsInside 1/18", gaps []. On D8 15 `walls 12` placed 0, gaps [], "2/25". On D15 13 it was "2/28". The order gives no next step. From then on walkers were inside every night and still there after dawn (7 walkers at D8 11, 11 at D15 08). I did not get out of this.
- Path blocked, D15 13: Wes and Ben were 6 h from bleeding out with "Eli couldn't get to them (path blocked) · put a Gate in the wall (Build → Defend → Gate, tap a wall section)". The test tool has no way to find which wall tile, and `wall 15 15 gate` failed. Re-ordering `rescue` worked 2 h later (Theo got both at D15 15).
- Second Banner at L10 (see lows #3). Not resolved by D20.

## Did the game serve your goal or get in its way?
It served the goal up to L8: renown rushing is a strong, clear lever. It got in the way through upkeep. Water crises (0.6 on D4 08; Hana left on D10 00 "couldn't take another day without water", although that day's line read Water +22.3 −11.3) and food crises (5.8 on D12 08) came from staffing. Every barrel and farm needs a Farmer, and on D14 18 there were 6 empty workplaces with beds capped at 16/16. Wood went to night repairs. I spent the run as a nurse, not a rusher. The "convoy" goal (D7: "Complete 4 legacy goals and reach ★5") was the only hint of a City-type endgame. I finished with 3 of 8 legacy goals (D7, D13, D16) and never saw what ★5 means.

## Problems with the game
- Expeditions hurt hard, even Low ones. Amy went 100% → 32/74 at Stage 1 of Abandoned Houses Low (D11 08). Marcus and Ozzy both "collapsed and is being carried" at Stage 1 of the Quarry, Medium (D14 14).
- A "Wounded until treated at a medical building" person shows 100% in `state` (Lena, D5 07) and collapses at Stage 1. The send screen gives no warning (Rosa was sent at 6/82 on D15 16).
- Night defence: 11 of 15 down on D15–16, 12 of 15 down at D19 06. `militia` is refused while any fighter is standing, even at 8–11% HP (D19 06), even though the message itself says "call radio help or the militia".
- Refusing the rescue team's favour (D9 00, when water was 3.9 and I could not pay 10) locked radio help for a week. It was a fair trade, but it meant the D11 raid ran with no help.
- Rescue order behaviour: at D11 13–16, 4 raiders stood over the downed and nobody went in. The same orders at D11 20 worked within 1 h.
- Toll Kings toll: "No raids for 4 days" (D7 08). A 4-raider daytime raid came on D11 11, the same day the protection ran out.

## Bugs and confusing text
- "Stage 1: Marcus collapsed and is being carried." on a solo squad (D3 16), and on a 2-person squad where both collapsed (D14 14). Who carries?
- "✊ MILITIA: SURVIVORS BAND TOGETHER" as a bare news line with no context (D3 08, D3 19, D5 09, D9 09), sometimes in daytime with nothing happening.
- "Too late: They searched until dark and found nothing." arrived at D9 11:00, in the morning. Both searchers had collapsed inside the town at D9 10–11.
- Rescue spam: "Ozzy is rescuing Ben" / "Opal is rescuing Wes" repeated about 13 times each within D15 08.
- "[X] can't reach a storage door with their load. Check that storage and HQ entrances aren't walled off" repeated from D1 12 (before any walls existed) to D14 11, with no way to tell which entrance.
- A couple formed and their baby was born in the same tick (Amy + Marcus → Ivy, D11 00).
- The radio announced a trader on D9 09, D11 09, D13 09 and D18 09, but `trader` was null each time I checked. One trader did appear on D17 18, with no wood for sale.
- `research blades` returned ok at D4 08. On D6 it answered "needs 20 research points" instead of "already researched".
- `foodDaysLeft: 3031.3` (D10 00).
- Water drops between midnights with no shown cause: 4.7 → 2.8 on D10 00 → 09 while waterPerDay showed +4.7.

## Problems with the test tool
- `play H` stops on a *new* "someone is down" but not on "bleeding out" of someone already down. Tomas died inside a single `play 10` (D18 16–18).
- A resident request stops `play` every game hour until answered (D12 23 → D13 03, D17 19 → D18 00), and the request text is not in the play output. I had to call `state` to see it.
- `walls` and `wall` never give the coordinates of the wall tiles, so the game's "put a Gate in the wall" advice (D15 13) can't be followed.
- Trader buy lines are raw JSON (`{"k":"item","id":"medpouch","cost":{"mat":6,"food":3}}`, D17 18).
- Some emoji are stripped in card text (D12 23 "Give food (3 )", D18 08 "Fill the order ( 14 12)").
- The Quarantine cordon showed up only as a cardsRead line and radio news. I found it by being refused an expedition (D17 12).

## The one change you would make
Make the wall line say what it needs: `walls` (and the in-game wall tool) should name the missing tiles or the building that is outside, until the town is sealed. Every other low in this run (wood lost to repairs, 10+ people down a night, the D15 path-blocked scare, Tomas's death, the stalled Radio Tower) came from zombies being inside an unsealed town every night from D7 on.
