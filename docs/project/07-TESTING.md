# Zombie Haven: testing

Owner, 16 Nov 2026: the tester rounds found bugs but used far too many resources, and missed bugs the owner sees. Use ChatGPT as much as possible.

## The ladder: always start at the top
| Level | What | Cost | When |
|---|---|---|---|
| 1 | Scripted checks (`tests/run_tests.py`, `tools/qa`) | free | every change |
| 2 | Balance bot (`tools/balance`) | free | balance changes only |
| 3 | ChatGPT screenshot review | the owner's ChatGPT plan, about 10 minutes | every visible change |
| 4 | One Claude tester on one question (`tools/playtest`) | small | a specific worry |
| 5 | Full 8-tester round | large | milestones only, on the owner's say |

## Rules
- A bug counts as fixed only when a level-1 check would catch it coming back.
- The suite must be green before a build is published. (Green since 16 Nov: 39 of 39, about 2 minutes. `combat` and `expchoices` each failed once in a full run and pass alone: if one fails, run it again by name before believing it.)
- Don't run the test suite and play-test servers at the same time (out of memory).
- Before any level-5 round: give the play-test tool a map and reasons for refused orders (bug C4). In rounds 2–4 many "bugs" were gaps in the tool.
- Tester scores are badly calibrated: use them as a trend, never to rank priorities.
- **Whole-game bug sweep** (Bugs chat, 21 Nov): `python3 tools/qa/bug_sweep.py SEED DAYS SECONDS OUT` plays a bot town from day 1 to level 20 and on, with bug checks every game hour and a save-and-load comparison every 15 game days (`RESUME=backup.json` carries a town on; `node tools/qa/late_soak.js BACKUP` plays a saved town in 3D). Run it overnight before a milestone or after big changes to how people move or fight. First run: `03-BUGS.md`, "Whole-game bug sweep" (four bugs fixed, B18 to B21).

## ChatGPT: what it is used for
Worked on 15 Nov (details in the archive doc `claude/zombie-haven-chatgpt-testing.md`):
- **Screenshot review**: found the stuck stronghold hint unprompted.
- **Judge**: checks Claude's summaries against sheets and logs; it caught Claude undercounting.

To add:
- **Arguing against design proposals** before the owner decides, with `01-VISION.md` as the yardstick.
- **Reviewing each code clean-up step** for behaviour changes.
- **Art**, as now.

Did not work: ChatGPT playing turn by turn through a relay (slow, and the town changes at every pause).

How: the owner's ChatGPT project "Zombie Haven testing". Claude types the messages through the built-in browser; the owner drags the files in.

### How a screenshot review is done (ChatGPT chat, 18 Nov)
1. **Screens:** `node tools/qa/review_shots.js 6 <folder>` (serve the repo first). The balance bot plays a town for 6 days, then 20 phone screens are saved: main view day and night, People, the four survivor tabs, the four Town tabs, Upgrade Town, Build, a building, Explore, Needs you, the event log, the Zombie test page. About 3 minutes. Don't capture from the live artifact in the built-in browser: there the game frame goes blank whenever the page changes inside it (Start, Zombie test), so no town can be reached.
2. **To the owner's PC:** Claude saves the screens to `Downloads\zombie-haven-<build>-screens` (the owner allowed the Downloads folder on 18 Nov).
3. **Brief:** in three parts of at most 10 screens each; parts 1 and 2 ask for "Got part N" only, part 3 asks for the review. The brief lists the rules from `04-UI.md` B and the open U numbers (so they are not reported again), says the town is a bot's (judge the screens, not the town), and asks for: a score, a table (screen, what, rule broken, high / medium / low, one-line fix), the three biggest changes for the screens the owner cares about, and which known items look fixed. Claude types each part; the owner drags the screens in and presses Send.
4. **Check before logging:** Claude reads the answer and checks every finding against the screens (and measures in the game when it can) before it goes into `04-UI.md` or `03-BUGS.md`. Questions only the owner can answer go to `05-NOW.md`.

### Screenshot reviews
| Date | Build | Screens | Score | Logged |
|---|---|---|---|---|
| 15 Nov | 3D.170 | 24 | 6/10 | U1–U8 |
| 18 Nov | 3D.212 | 21 | 6.5/10 ("looks more finished; information priority hardly better") | U22–U38, U39 after W109 (health stays a count, W108). Two findings were corrected on checking (U26, U37) |

## History
| Round | Build | Average | Deaths | Notes |
|---|---|---|---|---|
| 1 | 3D.162/163 | 3.75 | many | 2 crashes |
| 2 | 3D.169 | 4.5 | 41 | 2 towns lost |
| 3 | 3D.171 | 5.75 | 6 | |
| 4 | 3D.173 | stopped at 4 of 8 | 1 | walled-in door was the top problem |
Sheets, notes and comparisons: `runs/`.

## Offline copy on the owner's iPhone (W275, 25 Nov)
The owner tests on the iPhone where signal is patchy. `python3 tools/build/offline.py /tmp/zh-offline --push` builds the committed game as a Home Screen web app with a saver (service worker) and pushes it to the `gh-pages` branch: https://sfwong629-droid.github.io/Zombie-haven/. Opened once with signal it saves every file (about 84 MB) and then starts with no signal; with signal it updates itself, downloading only changed files. Its saves are separate from the artifact's (move a town with Backup → Copy text and Import). Check: `node tools/qa/offline_check.js /tmp/zh-offline` (saves, then with the network cut opens the title screen, loads the 3D world and the Zombie test, no failed request). Run it after every publish.

**Updates (owner, 25 Nov: W276 "A", and "Can the offline version on my phone auto check for update when i open it?"):** the offline copy follows claude.ai: a chat that publishes runs `offline.py --push`. On the phone the game looks for a new build every time it is opened or comes back to the front (at most once a minute, only with signal); a Home Screen app is often only resumed, so the browser's own check would not run. A new build downloads in the background ("Downloading the update · N%") while the old one keeps running, then a chip says "⬆ Update 3D.N ready · Tap to load"; a tap saves the town and loads it. It never reloads by itself in the middle of play. Check: `node tools/qa/offline_update_check.js /tmp/zh-offline` (puts a newer build on a local server while the game is open, brings it back to the front, expects the chip, taps it, expects the new build).
