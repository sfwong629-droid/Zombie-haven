# Zombie Haven: play-test round 3, all 8 testers (15 Nov 2026)

Seed 21, days 1–20, build 3D.171 (the owner's round-2 decisions: civilian militia, slower walker growth after day 10, low risk never kills, "sealed" = HQ and 3 in 4 buildings inside). Logs, notes and sheets: `runs/round3/`.

**Caveat:** fixes were made while the round ran (3D.172), so the later testers played newer code. New player, Builder, Defender and Raider played 3D.171. Explorer, Collector and Caretaker had part of 3D.172 (the sealed check that floods in from the map edge). Rusher had most of it.

## Scores

| Tester | R1 | R2 | R3 | Level | Alive | Deaths R2 → R3 |
|---|---|---|---|---|---|---|
| New player | 3 | 4 | 5 | 11 | 18 | 5 → 1 |
| Builder | 4 | 4 | 6 | 11 | 19 | 1 → 0 |
| Defender | 2 | 3 | 5 | 7 | 12 + 2 babies | 1 → 0 |
| Raider | 3 | 5 | 6 | 11 | 17 | 1 → 0 |
| Explorer | 5 | 6 | 6 | 9 | 15 | 4 → 3 (all medium trips) |
| Collector | 5 | 4 | 6 | 9 | 14 | 15 (town lost) → 0 |
| Caretaker | 5 | 6 | **7** | 14 | 21 | 0 → 0 |
| Rusher | 3 | 4 | 5 | 10 | 16 | 14 → 2 |

**Averages:**
- Score: 5.75 (round 2: 4.5, round 1: 3.75).
- Deaths: 6 in total (round 2: 41). No town was lost (round 2: two).
- Nobody died on a low-risk trip.

**Weeks 2–3, people down at once (day 12 onwards):**
- Average of each day's peak: 3.9 → 2.8.
- Worst day: 14 → 12 (Rusher).
- Walkers in the late game: 18–20, about the same as before.

## What got better
- Late nights. Fewer people down, and no wipe. The militia shows up in several logs.
- Strongholds stay the high point: the Clinic (5 testers), Blackgate Prison, and the Toll Kings' fort, now that camp raids can be steered (Raider: "exactly what a Raider wants").
- Bonds, couples, babies and pets (Caretaker 7/10: 20 of 21 people happy).
- Renown rushing (Rusher: level 3 on day 2).

## What hurt (most testers first)
1. **Walls (7 of 8).**
   - On 3D.171 the sealed check flooded out from the town centre. A closed camp fence round the HQ trapped it, so a full outer wall never counted (Defender: 105 tiles, never sealed).
   - The gap hints sent players to that camp fence, which could wall in the HQ's door (Collector: supplies didn't arrive).
   - The test tool's `walls` often placed nothing without saying why; it was out of wood.
   - **Fixed in 3D.172.**
2. **People down at home every night (6), and walkers staying in town by day (4).** Better than round 2, still the main drag. Patients were discharged at 02:00 into walkers and went down again (Defender: Lena 10 times). Fixed: they stay in bed while walkers are in town at night.
3. **Trip deaths with no warning, medium risk (3).** Explorer lost 3 people, New player and Rusher 1 each. Two testers again asked for a "turn back" choice on every trip card. **Owner's call** (open since round 2).
4. **Wood (4).** Repairs and upkeep eat it, and build sites wait days. Fixed: a stuck site now says why after 6 hours ("waiting for cloth, you have none" / "nobody is carrying to it").
5. **Banners and factions come late (3).** Level 10–11 needs a second Banner, the Radio Tower rarely shows up, and factions are first met around day 12–18 (Raider: "nothing to raid until day 18").
6. **Smaller:**
   - Trip cards decided while another card was up: fixed, trip cards now jump the queue.
   - Workshop "no room" with no way to clear a tile (2): open.
   - Guards stuck chasing walkers they can't reach (Builder): open.
   - Favour "Pay" failing silently when 1 short (Caretaker): open.
   - Tool problems, all fixed: research refusal reason, `walls 0`, `sh hit` missing from `help`, and `walls` not saying why it placed nothing.

## Questions for the owner
1. A **"turn back" choice on every trip card**, or the next stage's danger shown on it? Medium trips still kill without a choice.
2. **Factions sooner:** should one faction (e.g. the Toll Kings' toll demand) find the town by about day 5–7?
3. **Second Banner:** make the Radio Tower easier to get, or add another non-combat Banner route?
