# Zombie Haven: the Features chat (started 22 Nov 2026)

The Features chat builds what the other chats decided, one change per build, each with a scripted check. Order: `15-REVIEW.md`, section 6. This page says what is built, how it is checked and what is next.

**Numbers taken by this chat:** builds **3D.284 to 3D.288** and **3D.303** (3D.289 to 3D.302 are the Balance chat's merged overnight builds and the Strongholds chat's); waiting items **W226** (done), **W227**, **W228** (first written as W224 and W225, numbers the Story chat had already taken).

## 1. Where things stand

| Job | Decided | State |
|---|---|---|
| Healing (W130) | 20 Nov, `02-DECISIONS.md`, "Nights and survival" | **Built: 3D.284 to 3D.287. Pushed 22 Nov; not published** |
| The radio rescue truck (W129) | 19 Nov; look C (W228, 22 Nov) | **Builds 1 and 2 of 3 done: 3D.288** (the truck leads the zombies out), **3D.303** (the medics carry the fallen in). Next: the words |
| The daytime threat | 16 Nov, `01-VISION.md` | After the truck |
| Take command | 16 Nov | After the daytime threat |

**W226, push access: done.** The first try was refused; the owner asked again and the second try was granted (22 Nov, 08:57). The nine commits went on top of two newer ones from other chats (`d95cbf3`, `80d3026`; docs and an art tool, no game code), so nothing had to be redone.

## 2. Healing as built

The owner's rule (W130): the tent first, rounds fill the gaps, a slow mend with no zombie about.

| Build | What changed | Check (in `tools/qa/`) |
|---|---|---|
| **3D.284** | **The slow mend.** Once a game hour everyone on their feet in town gets 2% of their health back while no zombie is inside the town. Not while starving or dying of thirst, not lying down or in care. A field wound still stops at 60% | `mend_check.js` |
| **3D.285** | **The tent first.** With no zombie in town, anyone under 80% health (or with a field wound) walks to a medical building that has room, in free time or between jobs, and stays until fully healed (up to 12 rounds of treatment in one stay; it was 3, and only up to 70%). The wound is treated there. People on a shift or a guard post do not go. With a zombie in town only those under 60% set out (before, anyone hurt enough could) | `tent_first_check.js` |
| **3D.286** | **Rounds fill the gaps.** A Medic's round patches to 75% (was 60%) for 1 cloth or 0.1 medicine, and only for people who cannot go to a medical building: on a shift or a guard post, the building full, none built, or a zombie in town. A field wound is patched to 60% only. A worker on shift inside a building is patched at its door (before, people indoors were skipped) | `rounds_check.js` |
| **3D.287** | **The Medic on shift at a medical building** stays while someone is in it, in care there, or on the way (walking or carried), and does rounds when it is empty. With two or more Medics one always stays: a Medic with no medical shift does the rounds; if every Medic staffs a medical building, the first stays in. A Medic walking to a round turns back when a patient sets out for the building (a dressing already begun is finished first) | `medic_shift_check.js` |

Unchanged: the 60% / 50% bars for leaving work; falling back from a fight; sleep heals to 75%; what a treatment heals and what medicine adds; the wait between two rounds on the same person (3.6 game hours).

**Claude's readings, for the owner to overrule:**
- "A slow mend" is 2% an hour (about a quarter of full health over a quiet day).
- "When no zombie is in town" also means the reverse: with a zombie in town, people over 60% no longer walk to the Tent in the middle of a fight; they wait until it is quiet.
- "With two or more medics one always stays" is read as: the one at the building stays, the other does the rounds.

**Also changed:**
- `tests/run_tests.py`: the `profession` test follows the new rule (no round for someone who can walk to a Tent with room; a round patches to 75%). The suite is green: 39 of 39.
- `tools/qa/lib.js`: `ZH_NOSERVER=1` makes every browser check read the game straight from the repo folder, with no local web server. (This session was not allowed to start one. It may also help Claude Code on the owner's PC, W93.)
- `tools/balance/KNOBS.md`: a Healing row with the numbers above (`MEND_PCT`, `TENT_PCT`, `TENT_STAYS`, `PATCH_CAP` in `src/game/22-field-aid.js`).
- The Field Notes line on professions says Medics patch to 75%.

## 3. Not done
- Nothing is published: the live game is still 3D.279. Healing goes live with the next publish (any chat that publishes carries it).
- The project copies of `05-NOW.md` and `02-DECISIONS.md` are now updated from the repo copies.
- No ChatGPT or tester look. The owner has not seen it in the game.

## 4. The first balance runs (22 Nov)

The decision asks for healing to be checked with the balance bot against the danger targets. Run: the "game left open" test player, 30 game days a town, the build before healing (3D.283) next to 3D.287. Too few towns to judge: the bot does not play the same town twice the same way (seed 5 was run twice on 3D.287 and gave 29 and 62 downs).

| | Before (2 towns) | After (3 towns) | Target |
|---|---|---|---|
| Ordinary nights with nobody down | 14 and 11 of 21 (52% to 67%) | 18, 15 and 13 of 21 (62% to 86%) | 65% to 85% |
| Times someone went down, 30 nights | 48 and 75 | 29, 45 and 62 | |
| Deaths | 0 and 0 | 0, 0 and 1 | a handful before level 15 |
| People who walked out (no water) | 1 and 4 | 6, 4 and 6 | 2 or fewer an era |
| Cloth at the end | 8 and 30 | 0 and 0 (third town not read) | |

For the Balance chat:
1. **Run the full check** (`tools/balance/check.sh`) on 3D.287; these five towns only say healing did not make nights worse.
2. **Cloth.** Both towns with healing ended with no cloth. Rounds cost 1 cloth each and now patch to 75%, so more people qualify, most of all during a night fight. Cloth is used before medicine, which the review already named (`15-REVIEW.md`, 4.1).
3. **Seen once, cause not found:** in one town with healing two people were reported standing in one building for 48 game hours ("useFacility", days 26 to 30, a town short of water). It did not come back in a second run of the same seed, and no cause was found in the code. If the full check reports it again, it is a bug for this chat.
4. Both builds showed the old report "one spot for 48 game hours, repairing the wood fence" (with tiredness at 100): not from healing; for the Bugs chat.

## 5. The rescue truck (W129)

Decision: when called, a Greenwater truck drives in with its horn and alarm going and leads the zombies out of town down the highway; nobody is killed out of sight; their medics carry the fallen into care; the favour stays. **Look: C** (owner, 22 Nov, W228: "c"), Greenwater's farm stake truck with barrels of the Old Brine and one big horn on a pole. The three mock-ups: `runs/features/rescue_truck_options.png`, `rescue_truck_scene.png` (source `tools/features/truck_mock.html`).

| Build | What changed | Check |
|---|---|---|
| **3D.288** | **The truck leads them out.** When the rescue comes (called, or by itself when nobody is standing), the fallen stop bleeding at once and Greenwater's truck drives in off the highway's east end with its horn and alarm going (one "HONK HONK" over it at a time); zombies in town turn toward the noise. It parks two tiles short of the Camp's door, and the fallen go into care (as before, for now). After about 15 game minutes it drives back out the way it came and every zombie in and near town follows it, walking down the highway and off the map, ignoring people on the way (they are not killed: before, they were removed on the spot). The truck crawls ahead of the nearest follower, at most 3.5 tiles ahead. If no road leads in, the team comes on foot as before. The card says what happened ("they are leading N zombies out of town down the highway") | `truck_check.js` (and `never_lost_check.js`, updated). A picture of it in the game: `runs/features/truck_in_game.png` |
| **3D.303** | **The medics carry the fallen in.** When the truck parks, two Greenwater medics (Rosa and Abe, in Medic clothes) get out. Each walks to the nearest person who is down and nobody else is fetching, loads them onto a stretcher cart, and wheels them to the medical building (or the Camp if there is none), then fetches the next. People ride the cart as they do when a survivor carries them. The truck waits until nobody is left down and both medics are back on board; meanwhile its horn holds the zombies round it (in 3D.288 they set off the moment it parked; with the longer stop they would have been far ahead of it). Then it leaves and they follow. If the carrying takes longer than 6,000 ticks (6 game hours), whoever is still down is taken in at once. Survivors still standing can carry people in too; a medic never takes someone a survivor is already carrying. The card says "their medics are carrying N of your people into care". Found while building: a save made while a medic was carrying someone failed (the medic and the person pointed at each other); a medic is now saved without those links and finds the person again after loading | `truck_check.js` (both medics, every fallen person carried, the truck leaves only after), `truck_save_check.js` (a save mid-carry loads and finishes), `never_lost_check.js` (waits for the medics). Picture: `runs/features/truck_medics.png` |

Numbers (`TRUCK` and `MEDIC` in `src/game/03-stats-gear.js`; medics walk at 0.045 tiles a tick, a little slower with the cart; at most 6,000 ticks parked): drives in at 0.05 tiles a tick (about 800 ticks, some 50 game minutes, from the highway's end to a level 1 Camp; the fallen do not bleed meanwhile), parks 240 ticks (about 15 game minutes), out at 0.022 tiles a tick, waits for the nearest follower beyond 3.5 tiles. In the check, Walkers reached the map's edge about 6 game hours after it parked; a legless Crawler took about twice that (they ignore people all the way).

Next: **(3)** the radio words and the card (one build). Then the daytime threat and Take command.

A check to harden: `medic_shift_check.js` (3D.287) sometimes fails to catch the Medic walking out to a round, the moment its "turn back" step needs (1 run in 6 on 3D.303, after the overnight builds made newcomers come sooner); the game's behaviour is not at fault, the step only reports that it could not set itself up.

Seen, not changed: the medics are not attacked (zombies only go for the town's own people), and the blue ring over someone on a stretcher shows their bleed timer standing still, the same as when a survivor carries them. Also seen: the truck honks with the car-alarm sound; a horn of its own is for the Music chat.

