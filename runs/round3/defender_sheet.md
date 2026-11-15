SCORE: 5/10 · level reached 7 · people alive 12 (+2 babies growing) · deaths 0

# Evaluation sheet — Defender · build 3D.171 · seed 21 · days 1–20

Every claim cites a day and a number from defender_notes.md or defender.jsonl.

## Fun score: 5 / 10
I met the Defender goal (0 deaths in 19 days), but I didn't feel I achieved it by building defences. The walls never closed (D17: 105 tiles, still "sealed": false), I never found a tower or trap to build, and the run log shows 28 collapses inside the town. My people stayed alive because of rescues, radio help and morning dawns, not because my defence held.

## Three moments that raised it
1. D13 00, third boss night: "☠ BOSS DEFEATED. With its leader dead, the horde scatters". Nobody went down, and at D13 01 we found a Kevlar Vest (def 8) and gave it to Marcus. This was the only night that felt like a defence that worked.
2. D15 14: Body Armor research done at the new Workshop, and 17 armour pieces became craftable. I crafted Kevlar for Lena (14 scrap), a Riot Vest for Eli (D16 07), and a Gas Mask and Football Helmet (D17 07). Kitting out the guards is what this profile wants. It just came on day 15.
3. D18 22, fifth boss (Stalker + 14), with Noah, Eli and Lena down: `radiohelp` "cleared 15 zombies from the town and carried 3 of your people into care". This was a real rescue that I chose to call. The dog barking "raiders spotted near Marcus!" (D10 11, D13 22, D16 13) was a nice small touch too.

## Three moments that lowered it
1. The walls. On D1 there were 22 tiles, D3 42, D5 56 and D17 105. `walls` and `walls 0` always answered "sealed": false, "gaps": []. I put about 60 wood into it in one go on D17 01 and it still didn't seal. Week 1 review (D8 00): "Defense: 4/20". Walkers were inside the town at night anyway (D9 05: 15, D18 22: 19). As a Defender, the wall is the thing I most want to master, and I couldn't even see what was wrong with it.
2. Low-risk trips hurt people on almost every run. D1: Marcus collapsed on the Lumber Yard trip although the sneak succeeded. D3 18: "Stage 1: Lena collapsed" from 100%. D4 08: Lena collapsed and Marcus was at 31/110 at the Pharmacy (low). D6 07: Rosa was at 6/64 by the first card. D10 09: June collapsed on Abandoned Houses (low). The "A HORDE ON THE ROAD" card came up on most Lumber Yard trips (D1, D2, D8, D9 twice, D11, D13). "Low" didn't mean low.
3. The same people collapsed night after night. The run log has 28 town collapses: Lena 10, Noah 4, Eli 3. People were discharged from the medical tent nearly empty. On D19 04 "Eli recovered and returned" at 5% and collapsed at D19 05. On D19 02 Noah "recovered" and collapsed at D19 04. Rescues took hours: D14 02→08 for Lena, D15 23→D16 05 for Noah, Lena and Marcus. Rescuers kept switching ("X is rescuing Eli" six times at D18 22).

## Waiting with nothing to do
- D1–D11: wood starvation. With no wood building, wood came only from Lumber Yard trips, about 4–27 per trip. Idle gathering added almost nothing: wood was 4 at D8 12 and 4 at D8 18, and 15→19→17 over D6 15–D7 11. I spent days unable to build anything, waiting for injured scavengers to heal so I could send them out again. The Lumber Camp only unlocks with the Lodge (D11 13). Once it existed, wood stopped being the problem (D16 07: 65 wood).
- Level timers: L5 was 60 h (D13 02) and L6 66 h (D16 01). I skipped them with `rushlevel all` (65 and 150 renown). L8 shows 89 h (D19 08). Without rushing I would have waited about 3 game days for each level.

## Over too quickly or too easy
Nothing felt too easy. The Toll Kings toll (D6 08, 14 scrap) and the radio-help favour (D9 00 and D20 00, each 15 food and 10 water) were just a tax I had no real alternative to paying.

## Stuck
- Sealing the wall (D1–D17). I tried `walls N` many times (22→105 tiles), `wall 15 15` for the one gap ever reported (D1 20: ok:false with no reason; D2 18: placed, but still not sealed and gaps empty), and `walls 0`. I never got out. Gates were never mentioned in any output, and I can't see the map.
- Beds and L5 (D9–D12). The level needed 9 people, beds stayed at "8/8" after Tents were built on D4 11 and D5 12, and "room for 8 now" never changed. A third Tent on D12 11 finally showed 8/10. Two babies (D13 00) got me through. I don't know why the first two tents didn't count.
- Overrun Clinic (D18 07). Power was 224 against a recommended 175. After 20 s Amy was at 8% with 29 enemies left and the boss at 100%. I retreated (`sh back`, out at 38 s) and gained nothing. The recommended power is far too low.

## Did the game serve your goal or get in its way?
Both. Zero deaths was reachable, and the rescue system (bleed-out of about 15 game hours, `rescue NAME`, radiohelp) is forgiving enough that a careful player never loses anyone. The Recover policy at night clearly helped: on D10–11, D14–15, D16–17 and D17–18 there were no collapses or only one, while the Defend policy night (D7 19–D8 06) had 4. But my profile's tools were missing or blind:
- I found no guard tower, trap or stone-wall build in any canBuild list up to L7 (D18 11). The radio announced Spike Strips and Barbed Wire on D6 06.
- `post` (D3 11) returned ok, scrap went 3→0, and no building ever appeared in state.
- Walls never sealed.

The Defender can only defend through people and gear, and the gear arrived on day 15.

## Bugs and confusing text
Game:
- D1 12, D11 14, D12 08, D14 11, D19 13: "X can't reach a storage door with their load. Check that storage and HQ entrances aren't walled off and that the fence has a gate." It repeats all game, and I have no way to see or fix it. It may explain the "6 buildings are full: tap their bubbles" radio lines (D6 08, D12 08, D15 08).
- Collapse text "Rescue within 270 s" doesn't match state's "bleeds out in 16 game h" (for example D15 23).
- "X recovered and returned" while at 5% HP (Eli D19 04). People are discharged and collapse again within 1–2 h.
- Tents: "Two beds and one zipper that sticks", but beds stayed 8/8 after 2 tents (D5 12, D9 09).
- D17 07 and D19 08: "A FEAST? Spirits are low" while all 11 people were at ♥100+.
- D10 00: the pharmacy report included "A SICK STRANGER: no orders came, so Marcus chose Move on". Play never stopped to show me that card.
- Fires are frequent and long. The Lodge burned down twice (D12 11, D18 02), after fires that lasted 6 h. Other fires: Tent D9 13, Camp D11 06, Trading Post D17 03, Tent D17 14. Each repair silently ate my wood (D8 08: 5→0, D12 12: →0).
- Building orders take their materials only when builders deliver them, while walls take wood at once. Twice my sites starved (barrel and medic stood as "site" from D1 20 to D2 12; the farm from D3 11 to D3 21) with no warning.

## Problems with the test tool (separate from the game)
- `wall 15 15` (D1 20) and `defend` (D16 14) returned ok:false with no "why".
- `tool axe` and `cart` (D7 11) returned only ok:true, but wood went 17→5 and scrap 6→0. No cost was shown before or after, and no effect was visible.
- `walls` output gives "sealed": false with an empty gaps list, so there is nothing to act on. There's no way to see the wall line, gates or the HQ entrance.
- D15 10: "The Workshop is 2×1: place it (turn it with ↻), then Build." This is app UI text with no matching tool command, though the building was built anyway.
- The stronghold squad was ordered with 5 names (D18 07), but the fight showed 4 (Theo missing) with no message why.
- The help text doesn't list `sh hit` or `sh loot`, although the task brief mentions them.

## The one change you would make
Make the wall work for the player. Show where the line is open (or seal it automatically once it's fully placed with gates), and put a guard tower or trap build into the L2–L4 build list. With that, a Defender would be preventing nights like D14 02 (Lena and Rosa down, 6 h rescues) instead of just cleaning up after them. Second, a smaller fix: don't discharge people from the medical tent below about 50% HP.
