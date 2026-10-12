# Development phases (plan: docs/MASTER_PROMPT.md)

| Phase | Scope | Status |
|---|---|---|
| 1 Foundation and critical clarity | geometry audit + tests, notification levels, breach alerts, actionable objectives | **Done, V2.34.0** |
| 2 Town management | resource panels (produced / consumed / net / days left), staffing and status panels, emergency actions, shortage warnings | **Done, V2.35.0** |
| 3 Living settlement | task commitment, visible work routines, facility activity, clearer treatment and rescue | **Done, V2.36.0** |
| 4 Combat and strategy | combat indicators, defensive behaviour, town policies, survival balance (multi-seed) | **Done, V2.37.0** |
| 5 Polish | day/night, mobile UI, animation, props and sound, progression pacing | **Done, V2.38.0** |
| 6 Gap closure | Town Advisor (§9), rank unlocks (§10), touch gestures (§12), road and staffing tests (§17) | **Done, V2.39.0** |

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

## Phase 4 findings to carry forward
- **Phase 5, progression:** rank 5 (900 Renown plus a Hospital) is not reached in 30 auto-player days. Food and water sit at the cap from about day 10. Both need pacing work: more ways to use a surplus, and a reachable final star.
- Balance testing method: compare versions over at least 8 seeds (single seeds diverge chaotically). Look at deaths, share of downed who die, and kill stalls (4-day windows with fewer than 8 kills).

## After Phase 5: known limitations and ideas
- Eye pixels are made consistent only when a character is redrawn (owner decision). Brute frames and map props were redone in V2.33.
- Food and water still reach the cap in mid-game auto-play. The Trade Caravan gives that surplus a use, but the bot uses it rarely (it needs both above 70–75% of the cap).
- Night lights add a little draw cost; the setting can turn them off on slow phones.
- Nothing has been tested on a real iPhone or Safari from here: headless Chromium only.

## Stage 2: strategic depth (from V2.42)
Audit before starting (V2.41): saves had slots and migration but no protection against a failed load, silent write failures or two tabs; personality existed only as job-based AI, so two Guards acted the same; expeditions had a recall choice but no branching; guards "patrol" a random point on the north road; there is one fixed start and nothing after Rank 5.
Order agreed with the owner: 1 save reliability, 2 personalities, 3 expedition choices, 4 patrol areas and guard posts, 5 replayability (starts, difficulty, long-term goals). Impact ranking: personalities > expedition choices > replayability > patrols.

- **V2.42 save reliability.** Day backup per slot, damaged saves never overwritten (copied to `_bad`, slot locked), failure and second-tab alerts, export/import backups (share sheet, download, copy; file or paste), persistent-storage request, weekly backup reminder.
- **V2.43 personalities.** One trait per survivor (8 traits), each with an upside and a cost, wired into existing decisions only: fight range and hurt threshold (Brave, Cautious, Night Owl), retreat threshold (Brave −10%, Cautious +15%), rescue choice (Caring), break thresholds, fatigue and output (Hard-working, Scrounger, Night Owl), bedtime (Night Owl), rations and HP (Big Eater), friendships and grief (Caring, Loner), expedition loot and injuries (Scrounger, Loner, Cautious). Explained in the survivor panel; shown in People, the squad picker and arrival pop-ups.

### Untested so far
- Real iPhone / Safari: the share-sheet export (`navigator.share` with a file), file import from the Files app, and Safari's storage eviction can only be checked on a device. Headless Chromium covers download, copy, paste and file-input import.
- V2.43 balance (16 seeds × 30 days): deaths 8.1 per run, same as V2.42; Rank 5 median day 20. In auto-play, Brave and Scrounger/Caring survivors die most often (they fight and rescue more) and Big Eaters and Loners least. A player can offset this with the retreat slider, posts and squads.
