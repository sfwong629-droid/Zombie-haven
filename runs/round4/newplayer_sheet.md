SCORE: 5/10 · level reached 11 · people alive 18 · deaths 0

# Evaluation sheet — New player · build 3D.173 · seed 21 · days 1–20 (stopped as D20 00:00 started)

Every claim cites a day and a number from my notes (`newplayer_notes.md`) or the run log (`newplayer.jsonl`). Play pattern: 36 game h on, away 10 h, 36 on, away 14 h. That made 13 sessions.

## Fun score: 5 / 10
The radio, the trip cards and the one stronghold were fun. Too much of the run went on things I couldn't see or fix: building sites that sat for days, a door that was "walled in" for 13 days, one survivor who lay downed for 107 game hours, and from D12 a mass knock-down almost every night. Nobody died (0 deaths), but by D15 I was mostly carrying people, not building a town.

## Three moments that raised it
1. D15 08:00. I cleared the Overrun Clinic stronghold. My squad power was 233 against 175 recommended ("Only 4 fit through: Cyrus stayed home"). The fight lasted 80 s and I used `sh med` twice and `sh focus` once. Maya went down at 30 s and the med call brought her back to 50%. Result: "The Butcher of Ward 3 is dead", +26 renown, +9 meds, and Ada (Medic L3) rescued. It was short and readable, and my calls mattered. Best moment of the run.
2. D9 21:00–23:00, boss night 2 (Stalker + 6). The warning came at noon, I set policy Defend at D9 16, and then got "☠ BOSS DEFEATED … The rest of the night is quiet." Nobody went down. Then at D10 00 Marcus and Amy had a baby (Finn). That felt like a town.
3. D1–D3, the radio and the trip writing. "The fourth rung was imaginary. Lena found out." (D3 15) and "It kicked back. Theo kept all their fingers, barely." (D7 17). The radio walked me through the first rain barrel on D1 08. The early hours were clear and charming.

## Three moments that lowered it
1. D14 05 → D19 16: Theo was downed for 107 game hours. Every hour the news logged 10–15 lines of "X is rescuing Theo", with all 13 people taking turns and nobody reaching him. The state said "Amy couldn't get to them (path blocked) · put a Gate in the wall" (D14 11). I placed 8 gates by guesswork (D8 06, D14 14, D16 12) and nothing changed. I kept him alive with about 15 `bandage` calls (bleed timer 8–11 h → 15–16 h each time). On D16 00 "Theo and Eli welcome little Kai" while Theo was still lying at 0%.
2. D2–D10, the water crisis with no way out that I could see. On D4 04 I ordered a 2nd Rain Barrel and it wasn't built until D6 07 (50 game h). The first Garden Plot took 67 h (ordered D1 08, built D4 03). Most of the time `build barrel` said "no spot in the build area will take it" (D2 17, D4 17, D5 20). Water sat at 3–9 with "runs out in about N h" most hours. I ran 9 Abandoned Houses trips that brought back 1–5 water each.
3. D13 01–04 (boss night 3, Gatling Boss): 9 of 12 people were down at D13 04. I had set policy Defend because it worked on D9. Ammo was 0 ("gunners are clubbing with empty guns"). `militia` was refused ("healthy civilians band together when no fighter is left") and radiohelp was locked because I had refused the favour on D9 00. That favour asked for 15 food + 10 water while I had 2.9 water. Nights stayed like this to the end. D19 06: 13 buildings damaged, 660 damage. D19 13–16: a daytime raid downed 11 of 16 adults.

## Waiting with nothing to do
- D1 08 → D4 03: the first Garden Plot showed "(site)" for 67 h with no message saying why. Wood went 12→2→9→1→5→13 in that time. One of my 2 build slots was blocked the whole time ("two builds already running (the limit)", D1 08, D3 14).
- D4 04 → D6 07: the same thing with the 2nd Rain Barrel (50 h), with 20–31 wood in stock from D4 17. The first useful wait message came on D6 11: "⏳ Lodge: waiting for 🪵 wood (you have none)".
- D11 21 → D12 07/10: Quarry + Tent sat through the whole night. Builders seem not to work at night, but nothing told me.
- D17 06 → D19 21: the HQ→Fort upgrade waited 63 h ("⏳ Fort: nothing delivered for 6/8 h: everyone is busy, or the way to it is blocked", D17 23, D18 01, D19 01). It held a build slot the whole time, so Level 12 (32 buildings, I had 29–30) was out of reach.
- D14 05 → D19 16: watching the Theo rescue loop (above). It wasn't idle, but it was busywork: bandage, play 3 h, bandage.

## Over too quickly or too easy
- Levelling with renown was too easy once renown piled up. I used `rushlevel all` 7 times: D8 14 (125), D10 02, D11 19 (150), D15 08 (75), D16 09 (50), D18 08 (150) and so on. Level 4→11 took D8–D18 mostly by rushing. Each level raised the threat (the D5 20 radio talks about a "threat ceiling set by your Haven level"), and the nights got worse right after. As a new player I had no reason not to press the button.
- Away time completes levels: I came back to "LEVEL 4" (D5 20), "LEVEL 8" (D13 09, with 4 days of timer left when I started it on D12 14) and so on, without playing them.
- The Week 2 review gave GRADE S, 103/120, "Beacon of Hope", Defense 17/20 (D15 00). That night Theo was 19 h down and 4–9 people went down every night. The grade didn't match what I saw.

## Stuck
1. **The Lodge door was walled in, D6 21 → D19 (13 days).** "🚪 The Lodge's door is walled in: only 0 of N buildings can reach it. Put a Gate in the fence (Build → Defend → Gate, tap a wall section)" came back every night at 03:00 (N = 9 … 28). I tried `wall 15 9 gate` (D8 06), `wall 7 12 gate` (D14 14) and 6 gates on the listed gap tiles (D16 12). `walls 0` only ever lists "open tile in the outer wall line" gaps (outer line 72 → 82 tiles). It never shows which wall blocks the door. I didn't get out. Related messages: "Lena can't reach a storage door with their load" (D6 16, D18 11, D19 09), Theo's 107 h rescue, and the 63 h Fort upgrade.
2. **Build space.** From D2 17 on, `build barrel` mostly failed with "no spot in the build area will take it". On D16 09 it said "Tile occupied" on 34 spots and "Entrance is blocked" on 27. `upgrade clinic` (D14 17): "the Clinic is bigger: no room around the old one (clear a neighbouring tile)". I don't know how to clear a tile. `expand` worked once (D4 08); later it said "needs a bigger HQ (land tier 3 needs HQ tier 3)", and the HQ upgrade got stuck as in point 1. Partly got out: some builds fit (tent, campfire, library) and some didn't.
3. **Ammo.** It went from 40 to 6 over D9–D10 once I equipped guns, and was 0 from D10 15. "Make rounds at an Ammo Bench" — I built one D10 20, but it needs a Mechanic and nobody had that job. I made grown-up Ivy a Mechanic (D11 02), but ammo stayed 0–2 until Cyrus (Mechanic L2) joined D14 11. Then it rose to 19 (D17 21) and 26 (D18 08). Got out, after about 4 days.

## Did the game serve your goal or get in its way?
My goal as a new player was to follow the radio and the level card. For D1–D9 they served it well. The radio told me what to build, the level list was clear ("People 4/6, Buildings 1/6"), and the banner rule was explained in plain words (D8 14). Building the Trading Post was the obvious path and it worked (D9 08 "Civic Banner raised").

From D6 on the game got in the way, through things a new player can't see: walled-in doors, blocked paths, sites with no workers at night, and a slot held by a stuck upgrade. The messages named the problem ("put a Gate in the fence") but never where it was. The nightly knock-downs from D12 on (D13: 9 of 12; D16: 9 hurt; D19: 8 hurt; D19 daytime raid: 11 down) meant every session started with 5–10 `rescue`/`bandage` calls. Nobody ever died (0 deaths in 20 days), so the danger felt more tedious than scary.

## Bugs and confusing text
- **The first site never progresses, with no reason given.** First Garden Plot ordered D1 08, built D4 03 (67 h). Rain Barrel ordered D4 04, built D6 07 (50 h). In both cases a Campfire / Tent ordered later was built in 1–3 h (D3 07→D3 10, D5 05→D5 10).
- **Rescue loop.** "X is rescuing Theo" logged 10–15 times per game hour for 107 h (D14 05 → D19 16). It switched between "NO rescuer: the nearest free survivor will come" and "Amy couldn't get to them (path blocked)".
- **A downed person has a baby.** D16 00: "A BABY IS BORN / Theo and Eli welcome little Kai" while Theo had been at 0% and downed since D14 05.
- **Downed at 40%.** D13 09: "Amy · Medic L5 · 40% · down (bleeds out in 12 game h…)". June and Lena were the same.
- **Wrong numbers for beds and newcomers.** D9 08 radio: "6 empty beds: choose who moves in" when beds were 10/10. D12 08: "11 empty beds" when beds were 12/15. D6 06 bunker: "Invite them in · no room (8/8)" right after I built a 2nd tent (D5 10).
- **Water numbers that don't agree.** D6 00 daily line "Water +6.5 −6.9", while state said waterPerDay −13.8. On D7, the daily total was "Water +17.6 −7.1", yet water fell from 12.4 (D7 17) to 5.9 (D8 06). "Water runs out in about N h" jumped 4 → 8 → 10 → 12 → 17 → 6 h over D5 15–D6 01.
- **Morning card says 0 kills.** D16 06: "🧟 Walkers stopped: 0" after a boss night with 6 buildings damaged (282) and 9 hurt.
- **"Low risk" that isn't.** "Lena collapsed and is being carried" (D2 10, solo, from 100% to 10%). Marcus collapsed on stage 1 (D3 11). Rosa collapsed from 100% (D5 14). Maya collapsed on stage 1 (D11 14). I only see HP on the first trip card, after the squad has left.
- **"Marcus (Guard, here 4 days) wants to become a resident"** (D5 17). He had been there since minute one. The same request came for every starting member.
- **Lost child results.** D8 08: I sent Amy & Maya, and the same hour "Maya will staff the Canteen. Amy will staff the Medical Tent." Ivy was found anyway at D8 15. On D12 08 I sent Marcus & Lena; "Lena will staff the Lumber Camp" the same hour, then D12 14 "Too late. They searched until dark and found nothing." It was 14:00, not dark.
- **Wood check is wrong.** D14 11: `wall 12 9 gate` → "Not enough: need 🪵 1." while I had 2 wood.
- **Crafting text contradicts itself.** "craftNeeds: a Workshop and the research…", yet `craft machete` worked with only a Workbench and Bladesmithing (D16 16).
- **The Hunting Rifle disappeared.** I gave it to Marcus D9 08. On D18 15 it was gone (`equip Marcus rifle` failed; Marcus wore machete/riot vest/cap). I never got a message that it was sold or broke.
- **Grammar.** "needs a Engineer or Medic" (D13 16, D16 00, D18 00). "a infected dog" (D13 21, D18 23).
- **Two costs for one building.** D1 23 radio: "build a Garden Plot ⚙ 3 🪵 6 ★ 4", while the build list said "farm (Garden Plot): 4 wood". It's the same with the Scrapyard (D4 07).
- **The favour asks for what you don't have.** D9 00: the rescue team wanted 15 food + 10 water when I had 2.9 water. Refusing cost me radiohelp for a week, and I needed it on D13 03.

## Problems with the test tool (not the game)
- **No map.** The only wall info is `walls 0`, which lists outer-line gap coordinates. I had no way to find the wall blocking the Lodge door or the path to Theo. On a phone I would see the map. This probably made the "stuck" sections worse than a real player would have it.
- **"Claim the reward from the alert or the Goals screen".** This came about 15 times (D2 11, D2 14, D3 08, D4 03, D6 11, …) and no command claims it. I never got those rewards.
- **Failures with no reason.** `tool axe` → {"ok":false} (D2 08). `upgrade cabin` → {"ok":false} (D10 13, probably the build limit). `equip Marcus rifle` → {"ok":false} (D18 15).
- **A trip card got auto-resolved.** D5 08–11: while Theo's sickness card was open, the play run didn't stop for Maya's "FAMILY PHOTO ALBUM" card. It resolved as "no orders came, so Maya (Caring) chose…".
- **One `play 5` ran past 120 s** (D14 01) and got moved to the background. After that I used `play` of 3–4 h at most. Every other call took about 5 s.
- **`state` printed some sections twice** in one output (D4 08, D11 02: "people", "buildings", "canBuild" each repeated). It was harmless but confusing.

## The one change you would make
Point at the exact blocked tile when a door or path is walled in or a site can't be supplied: highlight it on the map and make the alert tap jump there. Better still, auto-place a gate there when one is possible. That one problem caused the 67 h and 50 h build hangs, the 63 h Fort upgrade, Theo's 107 h rescue loop, and the "can't reach a storage door" messages. A new player can't fix what the game won't show them.
