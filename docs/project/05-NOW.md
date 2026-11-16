# Zombie Haven: now (16 Nov 2026)

## Frozen
New features, balance changes, new art in the game, full tester rounds.

## The next three jobs
1. **Finish this folder.** `01-VISION.md` was reviewed by the owner on 16 Nov; three points in it are still open (W13, W14, W16). Still to write: `06-ASSETS.md` (from the repo's `assets/` folder).
2. **Bug A1, the sliding survivors.** Find it, reproduce it with a scripted check, fix it. *(16 Nov: the check exists, 3D.175 in the repo, not published; not reproduced in the cloud yet. See the A1 notes in `03-BUGS.md`.)*
3. **Make the test suite trustworthy** (bugs C1, C2), so the code clean-up can start safely.

## After that (not started, in this order)
- Split `js/game.js` by area, one area per session.
- UI work from `04-UI.md`, one screen at a time, **in its own chat** (owner, 16 Nov).
- The rest of `03-BUGS.md` section B.
- After the freeze: design the daytime zombie threat (vision, 16 Nov; needs W13) and steering fighters in town (needs W14).

## Waiting on the owner
Every chat brings its open items back in every reply until they are done (rule in `00-START-HERE.md`). Tick items off here.

Planning chat:
- ~~W1. Corrections to the vision draft (`01-VISION.md`).~~ Done 16 Nov.
- ~~W2. Yes or no on Claude's guesses in the draft.~~ Done 16 Nov (all yes; a little gore is fine).
- W3. Not a question: an open invitation to name anything else in the game that feels wrong. (First answer, 16 Nov: zombies should be a threat by day as well as by night.) "Nothing else for now" closes it.
- ~~W4. When the land grows, do existing walls move out for free?~~ Decided 16 Nov: no, the player rebuilds or moves them.
- W13. Daytime zombie threat: yes, no or changes to Claude's recommendation (16 Nov): small roaming groups outside the walls by day, plus a daytime horde every few days that the radio warns about hours ahead; nights stay the biggest fights. (Built after the freeze.)
- W14. Steering in town: the owner wants it, especially for fighters (16 Nov). Yes, no or changes to Claude's recommendation: fighters only, optional ("Take command" during an attack, same controls as raids), and the town must still survive a fair fight on its own. Also: what did "combat manual" mean, a manual-control switch or a how-to guide?
- ~~W15. Which zombies are allowed a weapon?~~ Decided 16 Nov: none.
- W16. The Gatling Boss is a zombie and his model has a gun on its arm. Keep him as the one exception, or change him (after the art freeze)?

Bugs chat:
- ~~W5. Start the Bugs chat.~~ Done 16 Nov.
- W6. Bug A1: what the survivor was doing just before it froze. (Answered 16 Nov: the pose is standing, arms down, legs straight; they don't seem to recover.)
- W12. Bug A1: say yes to publishing 3D.175 (the frozen-pose check; nothing in the game changes), then when someone freezes: Settings > Animation tracker, wait 5 seconds, Copy log, paste it in the Bugs chat.
- W7. Any other bugs they have seen.

Later:
- W8. Their own UI complaints (for `04-UI.md` section C; the UI chat will ask).
- W9. Claude Code setup on the PC (optional; makes the checks faster).
- W10. Batch 5 armour (Tripo models): after art unfreezes.
- W11. When to end the freeze.

## Parked
- Round 4 play-test: stopped half way. 4 of 8 sheets are in the repo under `runs/round4/` (commit 2df273c); no comparison was written.