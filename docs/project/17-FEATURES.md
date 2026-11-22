# Zombie Haven: the Features chat (started 22 Nov 2026)

The Features chat builds what the other chats decided, one change per build, each with a scripted check. Order: `15-REVIEW.md`, section 6. This page says what is built, how it is checked and what is next.

**Numbers taken by this chat:** builds **3D.284 to 3D.287**; waiting items **W224, W225**.

## 1. Where things stand

| Job | Decided | State |
|---|---|---|
| Healing (W130) | 20 Nov, `02-DECISIONS.md`, "Nights and survival" | **Built: 3D.284 to 3D.287. Not pushed, not published** (W224) |
| The radio rescue truck (W129) | 19 Nov | Next. Not started |
| The daytime threat | 16 Nov, `01-VISION.md` | After the truck |
| Take command | 16 Nov | After the daytime threat |

**W224, push access.** This chat's session could read the repo but was refused push access. The healing builds are eight commits on top of `f0d0d7f` (branch `art-direction-b`) in the session's workspace, and the owner has them as one patch file (`healing-3D.284-287.patch`; apply with `git am`). Until they are pushed, no other chat should use 3D.284 to 3D.287.

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
- The repo is not pushed and nothing is published (W224).
- The project copies of `05-NOW.md` and `02-DECISIONS.md` are not updated (too large to rewrite from this session). Their repo copies are updated in the same commits: W224 and W225 under a new "Features chat" heading, and the built note under "Nights and survival".
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

## 5. Next: the rescue truck (W129)

Decision: when called, a Greenwater truck drives in with its horn and alarm going and leads the zombies out of town down the highway; nobody is killed out of sight; their medics carry the fallen into care; the favour stays. Found in the code so far:
- Today's rescue is `helpTick()` in `src/game/03-stats-gear.js`: when it arrives, every zombie in town is removed at once and everyone lying down is put into care. The rescue that comes by itself (W172) goes through the same code.
- The car-alarm lure is `carAlarm()` in `src/game/23-build-traps.js`: a zombie with a lure point walks to it for a while.
- A low-detail Pickup Truck model already drives on the road for trips (`js/render3d.js`, vehicles).

Plan, one change per build: (1) the truck drives in along the highway and out again, with horn and alarm, zombies in earshot following it instead of being removed, and leaving the map with it; (2) the medics get out and carry the fallen into care; (3) the card and radio words. Question for the owner before build 1: what the Greenwater truck looks like (today's Pickup Truck model in Greenwater's colours is Claude's suggestion).
