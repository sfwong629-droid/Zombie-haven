# Development phases (plan: docs/MASTER_PROMPT.md)

| Phase | Scope | Status |
|---|---|---|
| 1 Foundation and critical clarity | geometry audit + tests, notification levels, breach alerts, actionable objectives | **Done, V2.34.0** |
| 2 Town management | resource panels (produced / consumed / net / days left), staffing and status panels, emergency actions, shortage warnings | **Done, V2.35.0** |
| 3 Living settlement | task commitment, visible work routines, facility activity, clearer treatment and rescue | **Done, V2.36.0** |
| 4 Combat and strategy | combat indicators, defensive behaviour, town policies, survival balance (multi-seed) | Next |
| 5 Polish | day/night, mobile UI, animation, props and sound, progression pacing | |

## Phase 1 known limitations
- Alerts sit under the HUD on the left half of the map. On a 320×568 screen, two alerts cover about a third of the map; each can be hidden with ✕.
- *Repair first* only reorders the automatic repair crew. There is still no instant manual repair, by design: repairs cost parts and wait until no zombie is within reach.
- Gap finding plugs one tile on each route zombies could take into town. With very irregular walls it may pick a tile next to the one you would choose, but walling every suggested tile always seals the town.
- In old saves, a building that already blocks another building's entrance is flagged, not moved automatically.

## Phase 2 findings to carry forward
- **Phase 3:** workers are on the job only about 12–33% of the day (measured). Task commitment should raise this, and the resource panels will show the change directly.
- **Phase 4:** in auto-player runs (4 seeds × 30 days), 17–37 survivors die per run, mostly during the day, and the territory is never expanded. This was the same before Phase 2. It needs a survival-balance pass.
- Parts income from kills, missions and expeditions is irregular, so it appears in "Last 24 h" rather than in the daily rate.

## Phase 3 findings to carry forward
- **Phase 4:** after this phase, auto-player runs still lose 7–23 survivors in 30 days (mostly from about day 10 onward, many by day), and food and water sit at the storage cap late in the game. Combat and economy both need a pass.
- **Phase 4:** one seed showed a daytime siege where civilians hid 39% of shift time. Defence needs to clear daytime attacks faster.
- Houses hold 1 survivor each, so most of a town sleeps rough until more are built. Check that this pressure feels fair in play.
