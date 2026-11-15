SCORE: 7/10 · level reached 14 · people alive 21 · deaths 0

# Evaluation sheet — Caretaker · build 3D.172 · seed 21 · days 1–20

(The task brief said build 3D.171; line 1 of caretaker.jsonl says `"build":"3D.172"`, so that is used here.)
Play pattern: 19 sessions of about 24 game hours each, with `away 23` between them, D1 08:00 to D20 00:00. Sources: caretaker_notes.md and caretaker.jsonl.

## Fun score: 7 / 10
For a caretaker the social side is excellent. Over 20 days I got 7 couples, 4 babies who grew up and 7 pets, nobody died, and 20 of 21 people ended "happy" (D20 00:00). It loses points because almost every night 2 to 6 of my people still dropped to 0% and lay in the street for hours, and the one thing that probably caused it (a town that was never sealed) was never shown clearly.

## Three moments that raised it
1. D8 00:00 to D9 00:00: the card "A NEW COUPLE: Amy and Rosa", then 24 h later "A BABY IS BORN … little Ivy". On D12 00:00 there were five cards in one night: Theo+Lena couple, Ben+Dex couple, "IVY HAS GROWN UP", baby Finn, and the legacy "Next generation". This is exactly what this profile plays for.
2. D6 13:00: the trader sold a dog for 6 food and 6 water. I gave it to Ada, who was at ♥3. Pets later show up in mood: June "Scout the dog (+12)" (D7/D9), Theo "Tabby the cat (+9)" (D16), Faye "Rex the dog (+12)" and Della "Socks the cat (+9)" (D20). On D10 09:00 "Moose is barking — raiders spotted near Ada!" made the dog feel useful too. The stray-dog cards (D16 08:00 and D19 08:00, "Adopt (2 food)") are lovely.
3. D15 to D16: the gear I crafted (Kevlar, Army Helmet, Fire Axe, Nail Bat, plus a found Hunting Rifle) raised squad power from 140 (D11) to 262. On D16 01:00 "BOSS DEFEATED … The rest of the night is quiet", and the D16 morning showed only Maya hurt. Then on D16 13:00 the Overrun Clinic was cleared in 62 s without anyone going down. I could see that investing in my people paid off.

## Three moments that lowered it
1. D10 10:00–14:00: a daytime raid by 7 raiders downed Theo, Amy, Hal, Rosa, June and Ben, so 6 people (mostly farmer, cook and medic) were at 0%. `radiohelp` answered "not ready". 1 raider was still in town at D10 18:00. The worst moment for this profile.
2. D12 21:00 to D13 06:00: a Gatling Boss night. Lena, Ada, Maya and Cleo went down (the squad I had just geared), then Rosa, Noah, Della, Ivy and Faye. Canteen, School, Lounge, Tent, Medical Tent and Library all "fell", and the morning card listed 10 hurt and 6 buildings with 378 damage. Lena also "gave birth" (baby Nora, D13 00:00) while she lay downed at 0% HP.
3. D6 00:00: the favour card asked for "15 food 10 water" and I had 9 water. Pressing Pay returned ok:true and showed the same card again, with no "can't afford" message, twice. The only way out was Refuse, which gave "NO MORE FAVOURS … Your people feel bad about it" and "refused the radio (-4)" on 5 people's mood (D6 06:00). Radio help was then gone until D13. On D15 00:00, with enough water, Pay worked straight away ("SQUARED AWAY").

## Waiting with nothing to do
- Wood, almost the whole run. Wood stood at 0–8 on D5 10:00 (0), D6 08:00 (0), D7 08:00 (2), D11 09:00 (~7), D12 08:00 (7), D14 08:00–13:00 (0), D16 17:00 (2) and D17 08:00 (4). Builds then sat waiting for materials: the Lodge was ordered D4 12:00 and got "all materials are in" only on D5 14:00 (~26 game h). The cabin was ordered D7 14:00 with 18 wood in store and got materials at D7 19:00. The D19 08:00 builds got theirs at D19 13:00.
- Stuck at level 10 waiting for a Banner, from D11 08:00 to D16 13:00 (5 sessions; see Stuck).
- Healing outside the hospital barely moves. Ben stayed at 79% from D5 06:00 to D6 06:00. Theo stayed at 58–60% from D5 06:00 to D7 08:00 (fixed only by the wandering medic). Cleo went 75%→75% and Marcus 78%→77% over D16 09:00–13:00. Since trips with anyone under 100% kept ending in collapses (below), I often waited a whole session with no squad to send.

## Over too quickly or too easy
- Level timers mean nothing to a daily player. Every `away 23` finished the level timer whatever its length: level 4 (27 h, D4), level 5 (41 h, D5), level 6 (61 h, D6), level 8 ("4 days of game time", D9), level 9 ("4 days 12 h", D10) and level 10 ("5 days", D11). An away is credited as only 8 game hours of production ("Your people kept their shifts for 8 game hours"), yet the level timer seems to run on real time.
- Renown piles up without the game saying so: 911 renown on D16 15:00. Two `rushlevel all` took me from level 10 to 12 in one hour (300 each), and another took 13→14 on D19 16:00.
- The Overrun Clinic stronghold (D16 13:00), the only way through the D11 banner wall, took 62 s and 3 `fight` calls. Recommended power 175, mine 262, boss killed, nobody downed.
- Week reviews gave Grade A on D8 00:00 (83/120) and Grade S on D15 00:00 (110/120), with "Defense 19/20" in a week where 2–4 people collapsed most nights. The grade does not match what I saw.

## Stuck
- **Banner for level 11 (D11 08:00 → D16 13:00).** The requirement said: "Clear a stronghold (the Overrun Clinic) · Defeat a faction (coming) · Make an ally (coming) · Finish a civic project: a Trading Post, or the Radio Tower". My Trading Post was already "civic (used)" on D4. No Radio Tower ever appeared in canBuild (checked D11, D17), and the faction routes say "(coming)". The only real path was a combat stronghold, which this profile wants to avoid. My squad was at 140 against 175 recommended on D11 09:00. I got out by researching Body Armor and Bladesmithing and crafting gear (178 on D12 18:00, 262 on D16 06:00), then clearing it on D16. That is 5 days stuck.
- **The walls (D1 → D14, found late).** I first ran `walls 8` on D14 08:00. It answered "sealed": false, "buildingsInside": "0/32", with a gap "15,15: an open tile in an inner fence". After fixing that gap and a Kennel-doorway gate (D14 13:00), gaps were [] but buildingsInside stayed "2/32" up to D15 16:00, and further `walls` placed 0. So the ring is complete, yet the town is outside it, and I could not get further without HQ tier 3 (still being built at D20 00:00). In 14 days the only hints were six "X can't reach a storage door … check that the fence has a gate" lines (D1, D3, D5, D9, D10, D11) and a mission "Close the Gaps" (D13). The state output never said "your buildings are outside the wall". Not checking is my mistake, but a caretaker who never opens the walls screen has no warning.
- **The Clinic upgrade (D13 13:00):** "the Clinic is bigger: no room around the old one (clear a neighbouring tile)". No order exists to clear or move anything, so I built a second Medical Tent instead.

## Did the game serve your goal or get in its way?
**Mostly it served the goal, strongly on bonds and pets.**
- Friendships form steadily and noticeably faster during crises: 8 new friendships on D6 22:00–D7 07:00, after the boss night.
- Bonfire Night (D2 10:00) took Rosa from ♥3 to ♥15 and June from ♥4 to ♥12.
- Feasts give "+15 ♥ for everyone" (D10, D13, D18).
- Residents buy their own gear at the Armory (Omar's Hawaiian Shirt and Straw Hat on D12, Ben's Riot Vest on D17), which is charming.
- **The cost is the violence.** Almost every night got in the way: collapses on D4, D6/7, D9, D10 (twice), D11, D12/13, D13/14, D15, D18 (twice) and D18/19.
- **Low-risk trips are not low risk.** Lena collapsed on solo low-risk trips on D1 14:00 and D5 10:00, Rosa on D1 17:00, and Ada was at 26/68 HP one hour into a low-risk pharmacy run (D6 17:00). For this profile, "Low risk" should not mean "someone gets carried home".
- Rescues work and nobody died, but downed people often lay out for 3–5 h. Cleo and Lena were down from D18 06:00–07:00 until D18 11:00, even with "Dex is coming".

## Bugs and confusing text
- D6 00:00 favour: "Pay (15 🍖 10 💧)" pressed with 9 water returns `"ok":true,"pressed":"Pay…"` and the same card again, with no reason. The only exit is Refuse, which carries a mood penalty.
- Friendship news repeats for pairs that are already friends:
  - "June and Eli are now friends" on D8 08:00, D9 10:00, D10 06:00 and D16-ish
  - "Amy and Ada are now friends" on D8 21:00 and D9 01:00
  - "Rosa and Eli are now close friends" on D11 19:00 and D12 05:00
  - "Ivy and Hal are now close friends" on D17 20:00 and D18 00:00
  - "Ivy and Faye are now friends" and "Theo and Ivy are now friends" each twice on D14 22:00–D15 00:00
- D19 00:00 news spam: "Nora is rescuing June" and "Finn is rescuing Amy" each repeated 7+ times in the same hour.
- Radio "A little bird says: 11 empty beds" (D8 08:00, beds 12/15) and "17 empty beds: choose who moves in" (D13 08:00 beds 20/21; D14 08:00; D16 08:00). The numbers are wrong.
- D9 00:00 "Ivy … will grow up … in 5 days", but "IVY HAS GROWN UP" came on D12 00:00 (3 days).
- D17 00:00 legacy "Room to breathe: Expand the territory 3 times: done". I never ordered `expand`, and state said land needs HQ tier 3.
- D17 00:00 legacy "The radio tower can call for the convoy (Goals)", but no Radio Tower was ever buildable.
- D13 00:00 a baby is born to Lena while she is downed at 0% in the street.
- "Ready for the next level: open Upgrade" news fired while the requirements were not met (D4 10:00 → `levelup` on D5 08:00 answered upgrading with 41 h left; D9 18:00 "Ready…" was fine). The message seems to be sent early or stay stale.
- Wood went from 13 (D8 ~15:00) to 79 (D9 08:00) with no news line explaining it.
- Week 2 "Defense: 19/20" against nightly collapses (see above).
- I first suspected that dogs given to Maya and Ada did nothing (D7 08:00, no dog line in mood). Mood lines only list the top 2 reasons, and Theo's cat did show later, so this is probably not a bug. A full "why" breakdown would help, though.

## Problems with the test tool (separate from the game)
- `tool axe` (D1 15:00) returned `{"ok":false}` with no reason.
- `upgrade workshop` (D9 10:00) returned ok:false with no reason; the same order worked at D9 13:00 (the slot limit was probably the cause, but it was not stated).
- `wall 15 15` and `wall 10 18 gate` returned ok:false, placed null, with no reason while wood was 0 (D14 08:00 and 10:00). Both worked once there was wood.
- Some trip decision cards were resolved during an `away` without being shown to me: "STACKED LOGS SHIFT: no orders came, so Lena chose…" (D3). The away freezes the town, yet the expedition "carried on too".
- Mood, canBuild and research only appear in `state full`, so plain `state` hides mood, the thing this profile cares about most.
- `levelup` answers `"ok":false,"upgrading":true` when an upgrade is already running, which reads like a failure.

## The one change you would make
Make "is my town inside its walls?" a plain line in the morning card and in state, for example "Fence: 2 of 32 buildings inside, nights will reach your people". Then tie it to the "can't reach a storage door" message. Behind 14 days of nightly collapses was a fence that, by the numbers, never protected anything, and a player who cares about their people deserves to be told so on day 1, not to find it in a walls report on day 14.
