# Zombie Haven: play-test round 1, all 8 testers

Seed 21, days 1–20 (or until the town was lost or the test game crashed). Each tester was a Claude agent playing one kind of player through the play-test controls (`tools/playtest`). Every claim on a sheet can be checked against that run's log.

**Caveats**
- The first three testers (New player, Defender, Raider) played build 3D.162, with the work split between Fable and Opus. The other five played 3D.163 (Opus), which fixed the rescuer who froze inside a Canteen when its door faced a fence. Rescue-related scores aren't comparable across the two groups.
- Two runs ended early because the test game crashed (Explorer D15 during a raid fight, Caretaker D14 after the Clinic). Neither crash has been reproduced.
- The tool cut each story card to 400 characters, so some trip reports looked truncated to the testers. Part of the "people vanish on trips" finding may come from this.

## Scores

| Tester | Build | Score | Level | Alive | Deaths | Their one change |
|---|---|---|---|---|---|---|
| New player | 3D.162 | 3/10 | 6 | 4 | 15 (+1 vanished) | Dependable, readable rescue and bandaging; say why nobody is reaching the downed |
| Defender | 3D.162 | 2/10 | 4 | 6 (all down) | 9 | Rescue must beat combat, or say what blocks it |
| Raider | 3D.162 | 3/10 | 7 | 0 | 12 | The nearest free person always picks up the downed; meds revive when cloth runs out |
| Builder | 3D.163 | 4/10 | 6 | 16 | 0 (Rosa missing) | Level timer on game time or met requirements; show staffing with "fill empty slots" |
| Explorer | 3D.163 | 5/10 | 6 | 11 | 2 | Event cards per destination; show trip cost and real odds before sending |
| Collector | 3D.163 | 5/10 | 6 | 12 | 1 (Lena vanished) | A result card for every trip, stronghold and night, marking NEW / duplicate items |
| Caretaker | 3D.163 | 5/10 | 10 | 16 named (game says 18) | 0 | Show each person's mood and its top reason; add a "rest / keep inside" order |
| Rusher | 3D.163 | 3/10 | 4 | 0 | 12 | Cut the L3→4 and L4→5 timers, let renown speed them up, warn before land tier 2 |

Average 3.75/10. On 3D.162 the average was 2.7 with 9–15 deaths per run. On 3D.163 it was 4.4, and deaths fell to 0–2 for everyone except the Rusher.

## What hurt (most testers first)

1. **Rescue (fixed in 3D.161–3D.163).** It caused almost all deaths on 3D.162. After the Canteen-door fix, a check run to day 8 had no frozen rescuers and no deaths. Still to do: one line saying *why* nobody is reaching a downed person.
2. **Level timers are very long** (Builder, Rusher, Collector, Explorer). The timer runs on real time (105–210 minutes shown for the middle levels), and meeting the requirements early doesn't shorten it. Renown piles up unused (Rusher: 473). **This is your design call.**
3. **People vanish on trips with no report** (Rosa, Lena, June; earlier Noah). Needs checking: partly the tool's 400-character limit, possibly a missing card in the game.
4. **The daily summary always read "Food +0.0 / Water +0.0"** (4 testers). **Fixed in 3D.164**: food and water collected from trays, pumps, greenhouses and taps weren't being counted. A check run now shows e.g. "Day 2 · Food +6.0 −7.0".
5. **No explanation for mood/happiness** (Caretaker). There's no number and no reason.
6. **Staff slots and jobs are unclear** (Builder): which job staffs which building, and which slots are empty.
7. **Wood is scarce while scrap piles up**, and scrap can't be turned into wood (several).
8. **Trips feel the same**: the same 4 event cards at every destination, and no cost or odds shown before sending (Explorer).
9. **Smaller items:**
   - The wall line is full but "not sealed" (Builder, Rusher, New player). Not yet verified.
   - Faction raid waves never seem to end (Explorer).
   - Duplicate names (two Junes).
   - Land tier 3 needs "town rank 3", which nothing explains.
   - Land tier 2 sharply raises night pressure without warning (Rusher).

## What worked

- **The radio rescue team** was the single most-praised moment ("cleared 14 zombies … carried 5").
- **Banner goals with choices** ("clear the Clinic, or finish a Trading Post or a Radio Tower") taught well.
- **Clinic stronghold fights**, with meds, focus and pull-back.
- **Bonds and couples**, and the Lodge unlock.
- **The first days teach well**: the morning card after a good night ("Walkers stopped: 13 · Hurt: nobody") made preparation feel worth it.

## Suggested fix order

1. ~~Daily summary +0.0~~ (done, 3D.164).
2. Trip vanishings: raise the tool's card limit, re-run one Collector, and make sure every trip death or loss gets a card.
3. One "why nobody is coming" line for downed people.
4. Mood number plus its top reason in the people list.
5. Staffing view with "fill empty slots".
6. Trip pre-check showing supplies packed and risk.
7. Verify "not sealed" walls, endless raid waves and duplicate names.
8. **Decision for you:** level timers. The options are game time instead of real time, shorter timers, or renown to speed them up.
9. Later: destination-specific trip cards; a scrap → wood recipe.

Sheets and notes: `runs/round1/` (3D.162) and `runs/round1c/` (3D.163).
