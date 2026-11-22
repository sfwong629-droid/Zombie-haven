# Zombie Haven: the big review (22 Nov 2026)

Asked by the owner on 22 Nov: "Run a review of all the update so far. Compare our game with other similar games and see if there are any areas we are lacking or missing. Check for any logic issue. Check for fun factor. Give me a summary of what we can improve." Written in the Planning chat from the repo at 3D.274 (live: 3D.272), the project folder, the long-run test (`12-LONG-RUN.md`) and reviews of nine similar games.

## 1. The short answer

The game is in good shape where it has been worked on (looks, animation, music, story, bug fixes, UI), but **almost none of what we decided in the last week is in the game**. Since 16 Nov we have decided about twenty new systems; the builds since then (3D.176 to 3D.274) are bug fixes, art, music, UI and balance. No chat is building features. That is the single biggest gap, and it is not a design problem: it is a "who builds it" problem.

The top five improvements, in order:
1. **Start the Features chat now** and build what is already approved, in this order: healing and the rescue truck (W129, W130), the daytime threat and Take command, then rule 1 of the long game (one pace for everyone). These fix the three biggest fun problems below.
2. **Settle A12** ("zombies never walk away", branch `a12-never-leave`, never merged). Either merge it with its tuning or close it. The game and the vision disagree until then.
3. **Fix medicine**: you need medicine to build the Clinic and Hospital, but towns sit at 0 medicine for weeks. Something to make medicine early has to exist.
4. **Give the late game something to do**: deeds, the Bell, Legend ranks, the cure (all in `13-LONG-GAME.md`, all approved, none built). Today an open player finishes in 14 to 16 hours and then has nothing to aim at.
5. **Make strongholds and raids feel different** from each other (the new Strongholds chat, section 7).

## 2. What is already strong

- **A real look.** The low-poly 3D town, 46 survivor animations, zombie signature moves and the 1950s "Forever Fresh" story clips give the game its own face. Most mobile zombie games look alike; this one does not.
- **The story is better than the genre's.** Mobile zombie games are often praised for story only in passing; ours has a secret told in layers, tapes, a cure and an ending. Few base builders have that.
- **Night defence with a day/night rhythm** is the same loop Kingdom Two Crowns and They Are Billions are loved for.
- **No pay walls.** The biggest complaint about Last Day on Earth and Doomsday: Last Survivors is pay-to-progress and energy limits. We have none of that, and should keep it that way.
- **Raids that you control**, with stealth, alarms, bosses and carrying limits, are deeper than Fallout Shelter's quests.
- **The working method**: balance targets, a scorecard and a long-run bot (`08-BALANCE.md`, `tools/balance/`) are rare for a game this size, and they found real problems.

## 3. Compared with similar games

| Game | What players love | What players complain about | What it means for us |
|---|---|---|---|
| **Fallout Shelter** | Charming people, easy to pick up, rooms that grow | Repetitive; after the vault is built there is nothing to aim at ("now what?"). Quests and controlled dweller trips were added a year later to fix it | Our late game has the same hole (section 5). Our raids are already the "quests" fix; the end game is what's missing |
| **State of Decay 2** | Your people matter: traits, morale, permadeath with grief; a leader with a "legacy" goal that sets the late game | Procedural missions repeat by the third time; little story | Our survivors have names and jobs but few stories of their own. A per-leader goal (like a legacy) would fit our Banner routes |
| **Frostpunk** | Hard moral choices, laws, people who make demands and go on strike; a built-up final storm everyone remembers | Story events are the same every play | We have no choices with a cost and no "people push back". The Great Storm idea = our boss nights and the end game; make the last one a set-piece |
| **RimWorld** | A storyteller that paces trouble, eases off when the colony is struggling, and gives the player a choice of storyteller | Steep to learn | Our crises are on a timer, not on how the town is doing. The long run showed towns wiped out and towns bored: a storyteller fixes both |
| **They Are Billions** | Build up toward a final wave you can see coming; the joy of a wall that holds | Hard, punishing | Our hordes and bosses can do this. A visible "the big one comes in 3 days" bar is cheap and strong |
| **Kingdom Two Crowns** | Day build, night defend, simple controls | Late game repeats; islands feel the same | The same risk for our strongholds: a new place must play differently, not just look different |
| **This War of Mine** | Choices that come from the situation: a stranger at the door, a neighbour asking for medicine | Bleak | The rescue truck, newcomers and traders could ask things of you that cost something |
| **Last Day on Earth** | Crafting from parts, base raids | Grind, energy, pay walls | Our crafting plan (`11-CRAFTING.md`) borrows the good part; keep away from the grind |
| **Doomsday: Last Survivors** | Heroes, tower defence, story | Pay-to-progress, slow | Same lesson: no waiting walls |

**What mobile players expect:** about 40% come back the next day, 15 to 20% after a week, 6 to 10% after four weeks. Sessions are about 15 minutes. The games that keep people have a clear reason to come back tomorrow at the end of day 1, and new things to see after day 3 (the usual drop-off is "seen it all by day 3").

**Missing compared with these games (nothing approved covers it yet):**
- **Choices with a cost.** Nothing in the game asks "who gets the last medicine?" or "take in the sick stranger?". Frostpunk and This War of Mine are remembered for this.
- **People who push back.** Survivors have mood but never make demands, argue or leave over a decision.
- **A pacing storyteller.** Trouble comes by the clock, not by how the town is doing.
- **A countdown to something big**, visible days ahead.
- **Something to come back for tomorrow** that is not just a timer: a daily goal, a trip coming home, a newcomer due.

## 4. Logic issues found

Ordered by how much they hurt play. Each has where it lives.

1. **Medicine is a closed loop.** The Clinic costs 2 medicine and the Hospital 6 (`js/world.js`), but long-run towns sat at 0 medicine for 24 to 68 days (`12-LONG-RUN.md`). Medicine is spent by many things (treatment, field aid, bandages, the Medkit, hybrid specialists, the Quarantine clean-up, events). And field aid uses cloth before medicine, which hides the shortage until it is too late. Fix: an early, slow way to make medicine (a herb garden, or the Clinic costing cloth), and the healing plan (W130).
2. **The game and the vision disagree on zombies leaving.** The vision says a lost night is a setback of a day or two; in the live game zombies walk away at dawn. The fix is built on `a12-never-leave` and has waited since 19 Nov.
3. **Away time is capped at 8 hours** (`AWAY_MAX_H = 8`, `12-people.js`) but the long-game plan wants a day away to count. Someone who plays once a day loses two thirds of it.
4. **Trips drink water** while away, so a long trip can drain the town (long run).
5. **The open player finishes in a day.** With the game open, time runs about 36 times faster than while away, so an open player gets through everything in 14 to 16 hours. Rule 1 (one pace for everyone) is approved and not built.
6. **Things pile up with nothing to buy.** Scrap and renown climb with no use late on (rule 4 of the long game: "something to buy with every stock", not built).
7. **Too many zombies at once**: 200 to 257 on screen in the long run. Hard on phones and hard to read. (3D.274 now caps The Tide at 60 standing; other nights are not capped.)
8. **Small things:**
   - B12, "Lena is now a Engineer": one-line fix, open since the ChatGPT round.
   - Kids are called "Kid 1, Kid 2" when the name list runs out (`12-people.js`).
   - Pets have no limit.
   - The Needs-you list gets squeezed when many rows pile up; some rows never clear (W147).
9. **Documents drift.** `00-START-HERE.md` still says the Video chat has 15 clips and is waiting on W150 and W151 (both done; 40 clips). Fixed with this review.

## 5. Fun factor

**The first 15 minutes: good.** The look, the music and the first night land well. The approved plan for the first 30 minutes (W183: a reward for each first goal, wood that lasts the first day, a small boss night at minute 20 to 25, and three more) is not built yet; it is cheap and would make the opening stronger still.

**Day 1 to day 3: OK, but no hook to come back.** The scorecard (`08-BALANCE.md`, section 12) says nights are rough, towns stay small and wood is always the short stock. A player who quits after a hard night has no strong reason to return. Fix: healing (people get better while you are away), a trip coming home, and a "big night in 3 days" countdown.

**Week 1: the middle sags.** Most of what makes the middle interesting is approved but not built: the daytime threat, Take command, the eleven new zombies, crafting, the seven new buildings, the story scenes. Today the middle is "same night, bigger numbers".

**The late game: empty.** The long run's clearest finding. Once the town is built there is nothing to aim at, and late deaths are high, which feels unfair rather than exciting. Fallout Shelter and Kingdom Two Crowns lost players at exactly this point. Our plan for it (deeds, the Bell, Legend ranks, the cure, the end game) is written and approved; none of it is built.

**The horde payoff is the best moment** and should be used more: a visible countdown, the music change (already there), a "the wall held" moment after, and a reward you can see.

## 6. What to improve, in order

**Now (start this week):**
1. Open the **Features chat** and build, one per build: healing (W130), the rescue truck luring zombies (W129), the daytime threat, Take command.
2. **Balance chat:** finish A12 (merge with tuning, or close), then medicine (section 4.1) and the 8-hour away cap.
3. **Bugs chat:** B12 and the "never clears" rows in Needs you.

**Next:**
4. Rule 1 (one pace) and rule 4 (something to buy with every stock) from `13-LONG-GAME.md`.
5. The story scene player and Story tab, then scenes in order.
6. The new zombies, one per build, starting with the ones that change how a night plays (not just new skins).
7. A **countdown to the big night** on the screen (small UI job, big effect).

**After that:**
8. **Choices with a cost**: 5 to 10 small events where the town must pick (give the medicine, take the stranger, split the food). Story chat writes them, Features chat builds.
9. **A pacing storyteller**: trouble eases after a lost night and grows when the town is comfortable. Balance chat.
10. The end game: deeds, the Bell, Legend ranks, the cure.
11. Crafting (`11-CRAFTING.md`) and the seven new buildings.

**Keep away from:** energy limits, waiting walls, paid speed-ups, and missions that repeat word for word.

## 7. Strongholds and faction maps (for the new Strongholds chat)

**Today:**
- 12 places you play on a map (`16-loot-expeditions.js`): the Overrun Clinic, Blackgate Prison, 4 seasonal strongholds (the Drowned Greenhouse, the Burning Refinery, the Harvest Fair, the Frozen Depot) and 6 faction raids (the Toll Kings' fort, the Foundry yard, Checkpoint Bravo, the Helix field lab, the Hollow's chapel, Greenwater Commune). The other trips (Lumber Yard, Gas Station, Military Checkpoint, Old Quarry, Warehouse District and the like) are played out in text.
- The 6 non-faction strongholds share **one 10-room plan** drawn in 3 layouts (hall, yard, glass: `SH_LAY` in `19-strongholds.js`).
- Every faction raid is the **same fenced 28 × 28 square** with the gate in the south and rings of buildings, valuables in the middle (`20-raid-camps.js`). What changes between factions is numbers: guards, how soon patrols come, how tough they are.
- So they look a little different and play almost the same. Kingdom Two Crowns was criticised for exactly this.

**What would make each one play differently** (ideas for the chat to pick from):
- **A twist per place**: dark (torches matter), flooded (slow, noisy), a timer (the building is burning), a hostage to walk out, a lock that needs a part from another trip.
- **Different shapes**: a long road, a tower to climb floor by floor, a yard with two gates, a place underground.
- **A faction with its own way of fighting**: the Toll Kings with roadblocks and trucks, Helix with clean rooms and alarms, the Hollow in one big crowd that never runs, Checkpoint Bravo with rifles on towers, Greenwater with traps in the orchard.
- **A reward only that place gives** (the owner's own rule from the vision review: raids and strongholds give exclusive things).
- **A reason to go back**: a second visit changes the place (the faction rebuilds, or a survivor you freed is there).
- **Story places** the story and end game need (`09-STORY.md` section 10, `13-LONG-GAME.md` section 7).

The Strongholds chat owns the plan, the order and the list of models the Art chat must make; the Features chat (or the Strongholds chat itself, if the owner prefers) builds them.

## 8. Sources

Reviews and articles read for section 3: Game Informer, GameSpot, Wccftech and TheXboxHub on State of Decay 2; GameSpot, Android Central and Bethesda on Fallout Shelter's quests update; PC Gamer (the Frostpunk developers on the ending), a Frostpunk critical-play report, Fandom's Frostpunk review, and Edge on giving people agency; plus earlier searches on RimWorld's storytellers, They Are Billions, Kingdom Two Crowns, This War of Mine, Last Day on Earth, Doomsday: Last Survivors, and mobile retention benchmarks.
