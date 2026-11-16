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
- The suite must be green before a build is published. (Today it has 1 standing failure, `profession` (bug B17), down from 35 on 16 Nov: bug C1. Until that is fixed, compare the list of failing tests before and after.)
- Don't run the test suite and play-test servers at the same time (out of memory).
- Before any level-5 round: give the play-test tool a map and reasons for refused orders (bug C4). In rounds 2–4 many "bugs" were gaps in the tool.
- Tester scores are badly calibrated: use them as a trend, never to rank priorities.

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

## History
| Round | Build | Average | Deaths | Notes |
|---|---|---|---|---|
| 1 | 3D.162/163 | 3.75 | many | 2 crashes |
| 2 | 3D.169 | 4.5 | 41 | 2 towns lost |
| 3 | 3D.171 | 5.75 | 6 | |
| 4 | 3D.173 | stopped at 4 of 8 | 1 | walled-in door was the top problem |
Sheets, notes and comparisons: `runs/`.
