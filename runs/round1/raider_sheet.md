SCORE: 3/10 · level reached 7 · people alive 0 · deaths 12

# Evaluation sheet — RAIDER · build 3D.162 · seed 21 · days 1–15 (town lost D15 01:00)

Note: days 1 to D9 ~10 were played by an earlier tester with the same profile (their notes are the top half of raider_notes.md). I took over at D9 10 and played until the town was lost at D15 01, so day 20 was never reached. Sessions: S1 D1 08 to D4 08, S2 D4 08 to D9 07 (47 h over because of a rescue deadlock), S3 D9 07 to D12 07, S4 D12 07 to D15 01 (town lost). There was an `away 20` between each pair of sessions.

## Fun score: 3 / 10
The stronghold fight, the Clinic, works: it was tense three times out of four, and one high-risk trip really did turn into a much stronger squad. Almost everything around it worked against a raider. People froze in rescue loops for days, the food and water went into crisis again and again, the only faction raid had no combat at all and still ended an alliance, and in the end the whole town bled out in about 20 game hours with 20 meds in storage.

## Three moments that raised it
1. D8 17, Clinic attempt 2 (earlier tester): power 166 vs rec 175 (only 4 of the 5 took part). At 65 s the boss was on 86%, Lena 21%, Theo 11% and 0 meds left. A real choice between back and focus; focus won at 73 s. Loot +25 renown, +6 scrap, +6 meds, Dr. Ines rescued.
2. D11 10, Clinic attempt 3: power 139 vs 175 (80% of rec), with an unarmed medic in the squad. Rosa hit 1% at 20 s and Zed went down at 61 s, and both were saved with `sh med`. I won at 64 s with 0.75 meds left. The med call mattered in every slice.
3. D13 11-18, Military Checkpoint HIGH (Marcus, Eli, Lena): scrap 19 → 105, cloth 0 → 20, meds 8.6 → 20, plus gear. I crafted 4 sledgehammers and a katana, and squad power went from 214 to 280-284 against the Toll Kings' rec 300. This is the "prepare, then hit harder" loop the profile wants. It cost a lot: Eli and Lena came home down and Marcus was on 11%.

## Three moments that lowered it
1. D12 07, Raid on Greenwater (power 184 vs rec 200): in 195 s of `fight` there were 0 kills, 0 damage either way and 16 enemies still left, and `sh focus` changed nothing. Greenwater's traders turned up at my gate mid-raid (D12 08) offering 6 food for 10 water. I had to `sh back`, and I got "Greenwater will never forgive this. The alliance is over" and +5 renown. On D15 00 they sent 7 raiders "to get it back". I paid the full diplomatic price for a raid that never happened.
2. D13 05, Noah died after about 41 game hours down (from ~D11 12) with "Nurse Pat is coming" on his status. Nurse Pat had left the town from hunger at D12 00. `rescue Noah` never reassigned him to anyone. It took 8+ bandages to keep him alive that long. A bug killed him, not the zombies. The same ghost-rescuer bug happened to Amy from D13 when Nurse Pat left a second time (D14 00).
3. D14 00 to D15 01, the collapse: 8 down at D14 00, then "10 down, too few left to fight" (D14 03), then all 11 down (D14 05). militia was refused ("healthy civilians band together" when there were none) and radio help was locked for a week. Nine walkers stayed in town all of daytime D14, so nobody could ever pick anyone up. Cloth went 20 → 0 on bandages and the 20 meds could not be used. Between D14 20 and D15 00 all 11 rose as zombies.

## Waiting with nothing to do
- Rescue deadlocks: the earlier tester's D7 06 → D8 17 (35 game h). Mine were D10 11 → D10 18 (7 h, broken by radiohelp), D11 08 → D11 11 (broken only by sending the frozen rescuers into a stronghold), and D13 07. In each one, 3 to 7 healthy people sat in `rescueTo` and every hour's news was 40 lines of "X is rescuing Y". Health numbers froze too: Marcus 60-75% from D3 to D8, and Rosa/Marcus/Faye stuck at 30% on D10 13-16. Once the deadlock broke they jumped (Marcus 22 → 95% within about 2 h on D11).
- Level 7 → 8: on D9 10 it said 207 min, on D11 08 170 min, and it only finished during the away. The level timer barely moves in play.
- The farm → field upgrade I ordered on D11 19 only finished on D13 06 (35 game h), because repairs ate all the wood (wood went 28 → 10 on D10 and 2 on D11 08).

## Over too quickly or too easy
- The boss in every stronghold. Clinic boss: 86% → 21% in 5 s on D8, 85% → 0 in 9 s on D11 (focus), and 79% → 0 in 10 s on D13 without focus. The fight ends the moment the boss dies (10, 9 and 9 enemies were still up). The adds in the first 60 s are the whole fight, and `sh focus` hardly matters.
- Recommended power is soft. I won at 139/175 (D11) and at 163/175 (D13). The only loss came from the earlier tester's retreat at 81/175 on D4.
- Clinic loot never changes: +25-27 renown, +6-9 scrap, +6 meds, and "Nurse Pat, a Medic, was rescued", with the same card text "The Butcher of Ward 3 is dead" on D8, D11 and D13. A sledgehammer costs 16 scrap, so one clear doesn't pay for one weapon.

## Stuck
- Rescue deadlock (see above). What I tried: rescue NAME, defend, bandage, policy recover, job changes. What worked: radiohelp once (D10 16 → 18, but it cost a favour of 15 food + 10 water, and refusing it locked radio help for a week on D12 00), or starting a stronghold with the frozen rescuers. `expedition` refused them ("Marcus is hurt or busy", D11 10) but `stronghold` took them, which is inconsistent and amounts to an exploit.
- Food and water, every day: D9 11 food 5.5 (-2/day); D10 08 food 1.0; D12 00 "Out of food" and Nurse Pat left; D14 00 "Out of food" and "WATER under 1 day". Day reports always say "Food +0.0" (D3, D12, D14, D15), so I could never see what my farms made. Report lines like "Open staff slot: Fenced Farm, Rain Collector…" (D14 00) appeared even with three people set to Farmer, and `job Ben Farmer` → ok:false with no reason (D9 11).
- I did not get out. The town was lost at D15 01.

## Did the game serve your goal or get in its way?
It mostly got in the way. The raider loop (gear up, compare power, fight with calls, loot) exists and is fun for about 70 s per Clinic. It took until D7 00 (6 machetes) to reach the Clinic's recommended power, and until D13 18 to get close to 300 for a second target. Over 15 days I chose 4 stronghold fights, and only 3 worked: the raid on Greenwater was broken. The town economy never let a strong squad stay healthy. Every high-risk trip came home with people down (D13: 2 of 3), and with too few fighters left at home that turned into a town-wide bleed-out. `power` counts only weapons: Riot Vest D9 11 54 → 54, Kevlar + gloves + Hockey + Gas mask D12 07 184 → 184. So I could not tell whether armor was worth its scrap, and the 5th and 6th names in `power` were silently ignored when the fight started (earlier tester, D8 17). Weapon prices do not match their power. On D13 18 Marcus went machete 62 → katana (21 scrap) 80 → sledgehammer (16 scrap) 84, and the stash shows no weapon stats at all. The Riot Zombie tip (D10 20: "blades do half damage") was a good gear decision to make, but I had no way to see who or what my fighters were facing in a stronghold.

## Bugs and confusing text
- Greenwater raid: 0 contact for 195 s ("enemiesLeft": 16, "kills": 0, every squad health value unchanged), and the alliance broke anyway (D12 07-10).
- Ghost rescuer: "Noah · down (bleeds out in 0 game h; Nurse Pat is coming)" for 29 h after "Nurse Pat couldn't take another day without food and left" (D12 00 → D13 05, Noah died). The same thing happened to Amy from D14 00.
- Rescue deadlock with the "X is rescuing Y" spam, which hit the 40-line news cap every hour. Because of that I never saw what happened to Cass, who vanished between D12 19 and D13 01; the run log has no line for it either.
- "Move-in request Ben/Eli/Amy/Theo wants to make the Haven home" for people who already live in town (D9 10, D10 10, D12 13). It reads like a stranger asking to move in. I declined Eli on D10 10 thinking it was a duplicate.
- Day report "Food +0.0 −7.0 · Water +0.0 −12.6" (D12 00), with farms and collectors standing.
- Boss nights (Butcher D6, Gatling Boss D9 21, Bloater Queen D12 21) never say whether the boss was killed or what it did.
- The Military Checkpoint HIGH report card never reached me (cardsRead was empty when the squad came home on D13 18); I worked out the loot from the change in materials.
- "June/Faye can't reach a storage door with their load. Check that storage and HQ entrances aren't walled off" (D12 16, D13 01). Nothing tells me which wall is the problem.
- `upgrade water` twice in a row: the second gives ok:false with no reason (D12 16, D13 18). Probably the 2-build limit.
- Toll Kings attack (D10 08, after I refused the 18-scrap toll): "THEY ATTACK" with no result line afterwards.
- Healing rate: Marcus 22 → 95% in about 2 h after the D11 Clinic fight, but 60-75% for 5 days earlier on (D3-D8).

## Problems with the test tool (separate from the game)
- `upgrade clinic` (medic → clinic, D13 08) answers "The Clinic is 2×1: place it (turn it with ↻), then Build". zh.js has no way to place it, and cloth went 3 → 0 at about that time with no building to show for it.
- `fight` slices report nothing about enemy types (riot zombie, lasher), so I could not use the blunt-vs-blade knowledge the game had just taught me.
- On D9 10 `state` listed Marcus and Lena as "away" on the gas-station trip, but the report showed Eli, June and Amy were the squad.

## The one change you would make
Make sure people who are down always get picked up. Whenever someone is down, the nearest free person (or anyone at all once the zombies leave at dawn) must take over the rescue, and a rescuer who leaves or dies must free the job. Let meds revive someone directly when cloth runs out. Every big loss in this run (Noah D13, all 11 on D14-15) and most of the dead hours (D7-8, D10, D11, D13) came from rescues that never happened, not from losing fights.
