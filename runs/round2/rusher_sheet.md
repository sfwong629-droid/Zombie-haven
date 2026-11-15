SCORE: 4/10 · level reached 9 · people alive 6 · deaths 14

# Evaluation sheet — Rusher · build 3D.169 · seed 21 · days 1–20

Every claim cites a day and a number from rusher_notes.md or rusher.jsonl.

## Fun score: 4 / 10
Days 1–13 were a good rush: L2 by D2 23:00, L5 by D6 07, L8 by D13 08, and every level felt earned. Then D16 wiped 12 of 15 people in 11 game hours. I had nothing to press, so it felt like the game took the town away, not that I lost it. The last 4 days were a slog with 5–6 people. Most of them were down every night.

## Three moments that raised it
1. D2 23:00 — L2 one day in, then `rushlevel all` for 25 renown at D3 08 → L3 straight away. Exactly what a Rusher wants: renown turns into speed.
2. D9 02–07 — the Trading Post (14 wood, 5 scrap, 2 cloth) raised the Banner. `levelup` + `rushlevel all` (150 renown) → L6 at D9 07. A clear, cheap goal, and I hit it.
3. D11 00 / D13 00 / D14 00 — Legacy goals 1–3 of 8 ("Complete 4 and reach ★5 to call for the convoy"). This was the first time I knew what the end goal looked like. It gave the rush a destination.

## Three moments that lowered it
1. D16 08 → D17 03 — 12 people down at once, every one "NO rescuer: Amy couldn't get to them (path blocked) · open a gate or clear the way". Then Omar, Eli, Iris, Maya, Ivy, Zed, Lena, Marcus, Rosa, Kira, June and Ben died (D16 16:00 to D17 03:00). Radio help was locked because I had refused a favour on D14 00 with only 9.5 food. `militia` kept saying "healthy civilians band together when no fighter is left" but never fired.
2. D8 11:00 — Sana (100% HP, Guard) died at Stage 1 of a medium Lumber Yard trip. No decision card came before it. The first card I saw only listed Marcus and Ben. The same thing happened to Ben on a low-risk trip on D10 08 (he collapsed at Stage 1). Losing someone before you get any choice feels unfair.
3. D12–D15 — the nightly loop: 10 of 12 hurt (D12 06), 5 down at 8 AM (D15 08), 9 down (D16 03). Mornings were spent on rescue orders, not on building. With 1–2 fighters, a Rusher has no defence. The game warns about bosses at noon, but it never showed me that my defence was too thin for my level.

## Waiting with nothing to do
- Level timers stretched: L4 48h (D3 14), L5 60h (D5 04), L6 72h, L7 84h (D9 19), L8 96h (D11 08), L9 108h (D14 00), L10 116h (D16 03). Renown came in at roughly 20–40 a day, which bought back 12h per 25. From L7 on I spent 1–3 game days per level waiting, with renown at 1–20.
- D18–D20: about 40 game hours where I could only order rescues and press play.

## Over too quickly or too easy
- Levels 1–3 took about 24 game hours (D2 23 → D3 08). Faster than the rest of the game suggests. Fine for a Rusher.
- Water and food felt tight for 15 days (water 1.7 days left D2 15, food 2.9 D11 08, food 2.3 D15 08). After the wipe, food was 85 and water 46.7 on D20 00. The economy only works with 5 people.
- The scrap problem flipped. Scrap was 2 vs 6.3 upkeep on D6 18 (5 buildings at half output on D7). Then it sat at 40–54 unused from D11 on, and the trader never offered food for it (D12 13, D14 13: "trade": []).

## Stuck
- D16 08: the downed people were "path blocked". I tried `wall 15 15 gate` (ok:false, "placed: wood"), `wall 12 14 gate` (ok:false, no reason) and `walls 1` (sealed, 0 placed). Nothing opens a gate in a sealed fence. I did not get out: 12 died. I had sealed the fence myself on D10 07 with `wall 15 15`, after `wall 12 14 gate` failed. I can't tell from the outside whether my sealed fence caused the block.
- D2 21 → D5 02: the radio said "upgrade the Camp to a Lodge" from D2 21:00. But canUpgrade was empty and `upgrade hq2` said "not unlocked yet" until L4 on D5 02.

## Did the game serve your goal or get in its way?
It served the goal well up to L8 (D13 08). The level checklist ("People 6/6 ✓, Buildings 6/6 ✓, READY: order levelup") and `rushlevel` are a perfect Rusher loop. It got in the way after that. The level timers grew to 108–116h while night threat kept climbing, and a town built to rush (2 guards, no gear crafting, no research beyond 3 topics) was not punished bit by bit. It was wiped in one night. Two cheaper warnings would have made the lesson fair: something like "your defence is 8/20" (that number only showed in the Week 2 review, D15 00), or one death on its own.

## Bugs and confusing text
Game:
- D9 11 expedition report: "no orders came, so Marcus (Brave) chose “Too loud, leave it”". I had pressed that button at D9 09 (answer ok).
- D14 08 Wandering Medic, "Everyone is treated before the medic moves on". Afterwards Amy was still at 1% and Kira was listed "40% · down".
- "Rescue within 270 s" next to "bleeds out in 16 game h" in the same status (D4 14 and onwards): two different units.
- D16 08: "Noah is rescuing June" / "Amy is rescuing Zed" repeated 19 times each in one hour, with no progress.
- "✊ MILITIA: SURVIVORS BAND TOGETHER" repeated about 10 times D5 08–16 while nothing visible happened.
- D17 08: a comeback convoy brings a new "Sana", with the same name as the Sana who died D8.
- "Zed is now a Engineer", "needs a Engineer or Farmer" (grammar).
- Mood line "5 friends (+6), 6 friends (+3)" (D10 07): two friend counts for one person.
- "Supplies 20/20" in the Week 2 review (D15 00) while food sat at 2–12 that week.
- Beds read 8/8 with HQ + 4 tents (D4 20), when the start was 4/8 with HQ alone.
- "Upkeep at midnight is 6.3 scrap" (D6 18), but the D7 summary says "Upkeep −3.9 scrap (5 unpaid)".
- The radio says "the Haven can reach the next level" every morning while a level-up is already counting (D5 08, D10 08, D11 08, D13 08).

## Problems with the test tool (separate from the game)
- Several orders return `{"ok":false}` with no "why": `tool bar` (D6 07), the second `upgrade water` (D5 21), `upgrade cabin` (D13 12, D14 00), `buy 5` the second time (D14 17), `wall 12 14 gate` (D10 07, D16 08).
- `walls 0` placed 3 wall tiles (D16 08). I expected it to report without building.
- `cart` silently cost about 9 wood (D6 07, wood 16 → 7). The help text gives no cost.
- The expedition decision card leaves out squad members who are already down (D8 09 card showed Marcus + Ben; Sana was already dead; D10 08 showed only Lena). It reads like they were never sent.
- With no map, I could not tell where the downed people were or which tile to turn into a gate.
- A multi-call `play` loop ran past the 120 s shell limit (D16 14 → D17 02), so I saw 10 deaths only afterwards. There was nothing I could have ordered anyway (radio help locked, militia refused).

## The one change you would make
Don't let a whole town bleed out in one night without a way out. When more than half the people are down and nobody can reach them, give the player one real button, every time. Examples: an emergency gate opening, militia that actually fires, or radio help that a refused favour cannot lock. Also warn earlier when defence lags the level. D16 cost 12 of 15 people at L9 with no decision that could have saved them.
