SCORE: 5/10 · level reached 9 · people alive 13 (game counts 15 with 2 babies) · deaths 1

# Evaluation sheet — Raider · build 3D.169 · seed 21 · days 1–20

Every claim cites a day and a number from raider_notes.md or raider.jsonl.

## Fun score: 5 / 10
For the first 12 days the raider part of the game was out of reach. Squad power went from 42 (D1) to 121 (D9), and the first stronghold needed 175. I spent those days on water, wood and food. From D13 to D19 I cleared 2 strongholds, won a raid and got a 53-scrap haul. That part was fun, but bugs kept getting in the way: a raid that froze, an Armory that undid the gear I crafted, and loot that vanished at the storage cap.

## Three moments that raised it
1. D13 06h: squad power reached 191 against the clinic's 175. **The Overrun Clinic** fell in 67 s: 24 kills, boss killed, +26 renown, +9 scrap, +9 meds. Nurse Pat was rescued inside. That banner then let me rush L6 and L7 within one game hour (150 + 175 renown).
2. D16 14h: **Blackgate Prison** (rec 350, mine 370) was the only fight where my calls mattered. I used `sh med` twice (Lena 38→88, Eli 18→68), then `sh focus` at boss 43%, and the boss died within 5 s. +25 renown, +15 scrap.
3. D16 15–23h: the **Military Checkpoint** (high risk) brought back +53 scrap, +21 meds, +167 ammo, +33 fuel and a Hazmat Suit. This is the haul a raider plays for. (Most of it then vanished; see Bugs.)

## Three moments that lowered it
1. D18 08–13h: the **Greenwater raid** (rec 200, mine 408) froze for 340 s, which is 5 game hours: 0 kills, all 16 enemies left, everyone at 100%, and `sh focus` changed nothing. When I used `sh back` I still got "Greenwater will never forgive this. The alliance is over". So I paid the betrayal price and got no fight and no loot (+5 renown). Meanwhile raiders hit the town and downed Noah, Ben, June, Theo and Pat (D18 13–16h).
2. D19 15h: **Marcus died** on the Warehouse District trip (high risk). He was my L8 guard and Lena's partner. Stage 1 left him at 50/179 HP. Then the report just says "Stage 2: Marcus did not make it." No card offered a way home after he got that low. His Katana and Military Armor were lost with him, and no grief news or mood change followed.
3. D8–D12 **death spiral**. On the D8 review, Defense scored 6/20. On D8, 6 buildings took 454 damage. On D9 the radio-rescue group's favour cost 15 food and 10 water, and I couldn't pay. Scrap hit 0 on D9 18h, so 5 buildings ran at half output. "Out of food / Out of water" hit at midnight on D12 and D13, with Noah "starving" and Ivy and Maya "dying of thirst". In those days every trip left the town to the militia.

## Waiting with nothing to do
- **D1–D12: no raider content at all.** Strongholds were locked by level (clinic at L3) and then by power: 42 (D1), 59 (D4), 108 (D6), 92 (D7), 121 (D9) against 175. Raids needed "Meet X first". Toll Kings were met on D9, but their fort needed 300. For 12 game days the only fighting was expedition cards and night defence.
- **Level timers**: L4 took 48 h (D3), L5 54 h (D7), L6 72 h (D13), L7 84 h, L8 96 h, L9 4 d 12 h. I only skipped them because renown piled up (554 on D13) with nothing else to buy.
- **Wood**: the Lumber Camp (built D5 23h) showed "Open staff slot: Lumber Camp" in every daily summary from D6 to D20. Wood sat at 0–3 on D8, D10, D14, D15 and D16, which blocked walls, the Fort and the tier-2 builds. I kept running lumberyard trips (+12 to +50 each).

## Over too quickly or too easy
- `rushlevel all` took me from L5 to L7 in one game hour on D13 (325 renown), then L8 on D14 (200) and L9 on D16 (225). The level wall stops mattering once renown builds up.
- The clinic can be farmed: I cleared it 3 times (D13, D15, D19) in 61–67 s each, and loot shrank each time (scrap 9/9/6, meds 9/6/2.75).
- With `sh focus` the boss dies almost at once: D15 boss 22%→dead in about 1 s, D19 boss 100%→dead within 7 s. Strongholds need almost no steering.

## Stuck
- D5 → D11: the farms and barrels had open staff slots while Farmers stood "free" (Ben D10 17h). There's no command to put a person on a building. I got out by retraining June and Ivy as Farmers (D11 07h).
- D8 → D11: walls never sealed. `walls 8` placed 8 tiles and left a gap at 15,15 with `sealed: false`. Two more batches then opened a new gap at 15,9 and used up all my wood (D8 08–15h). I never sealed them.
- D14 12–15h, Toll Kings raid: after the boss died, 2 enemies stayed alive for 90 s while Marcus and Eli went down. I only got out with `sh back`. The news line "Grab what you can and walk out" (D14 13h) never showed up in the fight view.
- D18 Greenwater raid: frozen (see the lows). Not solvable from my side.
- D13–D20: I couldn't address the second "Theo" (see Bugs).

## Did the game serve your goal or get in its way?
**D1–D12: in the way. D13–D19: mostly served.**
- The gear loop works: the Workshop (D6), Bladesmithing, Body Armor and Firearms let me build power from 54 for one person (machete, D6) to 408 for the squad (D18).
- But the **Armory overrode my choices**:
  - It spent my scrap on its own: Marcus Hawaiian Shirt −2, Eli Crowbar −5 and Riot Vest −7, Theo Riot Vest −7 and Tactical Cap −4 on D11. That's 25 scrap.
  - It gave a Kevlar Vest to June, a farmer (D13 13h).
  - It swapped Theo's crafted Sledgehammer (atk 36) for a Crowbar (D15 08h), then for a Rifle (D17 10h).
- **The power number ignores helmets**: a riot helm (D9, 54→54) and SWAT + Army helmets (D16, 370→370) added nothing.
- **Factions**: met Greenwater (D4), Toll Kings (D9) and The Foundry (D17). One raid paid out (a banner, no loot) and one was broken. The Foundry raid (500) stayed out of reach at 408.

## Bugs and confusing text
**Problems with the game**
- **Greenwater raid froze**: 340 s, 0 kills, nobody hurt, yet the betrayal still applied (D18).
- **Loot lost at storage caps, with no message**: after +33 fuel and +167 ammo (D16 23h), fuel stayed 20 and ammo stayed 60. On D19 22h I got "Out of ammo: gunners are clubbing with empty guns".
- **Supply forecasts are wrong**:
  - D12 21h: water 8.4 and "Water runs out in about 20 h", then "Out of water" at D13 00h.
  - D11 23h: "Food runs out in about 27 h", then "Out of food" one hour later.
- **Week-2 review contradicts the day**: "Supplies 20/20" on the same midnight as "Out of food: rations were short today" (D15 00h). Happiness was 3/20 while 10 of 13 people showed ♥100.
- **Duplicate names**:
  - Two people named "Theo". "Theo is rescuing Theo." (D15 00h).
  - `expedition military high Marcus,Theo` sent the civilian Theo Ortiz (D16 15h).
  - `expedition lumberyard low "Theo Ortiz",Noah` silently sent Noah alone (D15 07h).
  - `job "Theo Ortiz" Farmer` returned `{ok:false}` with no reason.
- **Resources arrive in lumps**: wood went 3→65 and scrap to 38 between D11 08h and 18h, with no news line explaining it. The radio said "11 buildings are full: tap their bubbles to collect" (D16 08h, D19 08h) even though taps are said to be automatic.
- **Contradictory card after the Toll raid**: "The Toll Kings will come for revenge" next to "they scatter for 60 days" (D14 15h). The Greenwater "they will hit back" never came by D20 04h.
- **Radio mentions an upgrade that isn't unlocked**: on D4 14h it said "upgrade the Camp to a Lodge", but `upgrade hq2` answered "not unlocked yet" (it needs L4).
- **Repeated news lines**: "✊ MILITIA: SURVIVORS BAND TOGETHER" every hour (5× on D8 11h alone).
- **Grammar**: "a infected dog" (D10 01h, D14 03h).
- **Expedition events repeat**: "A HORDE ON THE ROAD" came up 3 times in 2 days (D1, D3 10h, D3 19h).
- **Expedition squad cards drop people**:
  - Lumberyard D4: the card showed only Theo and Lena; Marcus had collapsed.
  - Houses (low risk) D10: Lena (83%) and Ivy (100%) both collapsed in stage 1, and Ivy "collapsed" twice.
- **Amy didn't show up in the clinic fights**: she was sent on D13, D15 and D19 but never appeared in the fight squad, and was found "work"ing at home. She did appear in the raids.
- **The dog can't be given to anyone**: the stray dog (D2) "Give the dog to a survivor from their Gear tab", but it never appeared in the stash.
- **`militia` refused** with "healthy civilians band together when no fighter is left" (D8 02h). `defend` returned `{ok:false}` with no reason (D11 11h).

**Problems with the test tool**
- `upgrade water` returned `{"ok":false}` with no reason when the 2-build limit was hit (D12 12h). `build` gives the reason.
- Trader offers print as raw JSON (`{"k":"item","id":"riothelm","cost":{...}}`, D9 17h). Item names like "dogtags" have no description. The `trade` list was always empty, even with 20 fuel and a Trading Post (D9, D12, D15, D19).
- The fight view doesn't show news. I missed the "walk out" hint in the Toll raid (D14 13h).
- The `power` result reads only the first name; `power Pat` needed "Nurse Pat".
- Card text loses its emoji after a `play` (e.g. "Give food (3 )", D16 07h).
- The away credit is always 8 game hours for 20 h away (D8, D13, D16, D19). That may be by design, but nothing tells you up front.

## The one change you would make
Make the stronghold and raid fight trustworthy and rewarding:
- Fix the frozen raid (D18) and the endless last enemies (D14).
- Let `sh back` after a boss kill keep the loot.
- Never let a high-risk trip kill a fighter without first offering a turn-back card once they drop below about 30% (D19 Marcus).

Right behind that: stop the Armory from swapping out gear I crafted and equipped.
