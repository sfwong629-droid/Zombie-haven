# Zombie Haven: now (16 Nov 2026)

## Frozen
New features, balance changes, new art in the game, full tester rounds.

## The next three jobs
1. **Finish this folder.** `01-VISION.md` was approved by the owner on 16 Nov. Still to write: `06-ASSETS.md` (from the repo's `assets/` folder).
2. ~~**Bug A1, the sliding survivors.**~~ Fixed in 3D.176 (16 Nov) with a scripted check; waiting for the owner to confirm in play. A4 (taps opening the radio) fixed in 3D.177. Next owner bugs: A5 (Ben can't reach the Garden Plot), A2 (emoji flashing), A3 (the game froze). A5 (the Raiders note showed a zombie) fixed in 3D.178.
3. **Make the test suite trustworthy** (bugs C1, C2), so the code clean-up can start safely. Started 16 Nov in the Code clean-up chat: C2 fixed, C1 down from 35 failures to 18 and a full run from 14 minutes to 2. Next: go through the 18 one at a time (list in `03-BUGS.md`). The `game.js` split does not start until the suite is green.

## After that (not started, in this order)
- Split `js/game.js` by area, one area per session.
- UI work from `04-UI.md`, one screen at a time, **in its own chat** (owner, 16 Nov).
- The rest of `03-BUGS.md` section B.
- After the freeze, first: write `08-BALANCE.md`, the balance targets page (owner, 16 Nov; in the Planning chat, the owner answers the target questions).
- After the freeze: build the daytime zombie threat and the Take command button for fighters in town (both decided 16 Nov; see `01-VISION.md`).

## Waiting on the owner
Every chat brings its open items back in every reply until they are done (rule in `00-START-HERE.md`). Tick items off here.

Planning chat:
- ~~W1. Corrections to the vision draft (`01-VISION.md`).~~ Done 16 Nov.
- ~~W2. Yes or no on Claude's guesses in the draft.~~ Done 16 Nov (all yes; a little gore is fine).
- ~~W3. Anything else in the game that feels wrong.~~ Closed 16 Nov: the daytime threat, nothing else for now. The owner can add more any time.
- ~~W4. When the land grows, do existing walls move out for free?~~ Decided 16 Nov: no, the player rebuilds or moves them.
- ~~W13. Daytime zombie threat.~~ Decided 16 Nov: roaming groups by day plus a warned daytime horde every few days.
- ~~W14. Steering in town.~~ Decided 16 Nov: a Take command button for fighters during an attack, optional.
- ~~W15. Which zombies are allowed a weapon?~~ Decided 16 Nov: none.
- ~~W16. The Gatling Boss's gun arm.~~ Decided 16 Nov: no change to him; he is the one exception.
- ~~W18. Add a balance targets page?~~ Decided 16 Nov: yes, `08-BALANCE.md`, first job after the freeze.
- ~~W29. Hide "12 h sooner" when it would finish the upgrade anyway?~~ Decided 16 Nov: yes (UI problem U17; built in the UI chat).
- Nothing is waiting on the owner in the Planning chat.

Bugs chat:
- ~~W5. Start the Bugs chat.~~ Done 16 Nov.
- ~~W6. Bug A1: what the survivor was doing just before it froze.~~ Closed 16 Nov: the tracker logs answered it.
- ~~W12. Bug A1: the tracker log.~~ Done 16 Nov (two logs; they showed the cause).
- W20. Bug A1: play 3D.176 and say whether anyone still freezes in one pose.
- W17. Bug A2 (emoji flashing): which emoji, and where on the screen? A screenshot or a few words is enough.
- W19. Bug A3 (the game froze): did the picture stop or the whole page, and does it happen again in 3D.176?
- W21. Bug A4 (tapping a person opened the radio): play 3D.177 and say whether tapping people works now, in the People list and on the map.
- W32. Bug A5 (Ben can't reach it): yes or no to a "Copy save" button in Settings (a test tool, like the Animation tracker), so the owner can send the town when something like this happens. Also: is the Garden Plot inside a fence or wall, and does it have a gate?
- W7. Any other bugs they have seen.

UI chat:
- ~~W8. Their own UI complaints (for `04-UI.md` section C).~~ Started 16 Nov: People & survivor details and the Town panel (crowded, hard to read, confusing or too many taps); first, buttons overlaying each other. The owner can add more any time.
- ~~W25. Radio while a menu is open.~~ Decided 16 Nov: hidden, for every menu.
- ~~W26. Alert button while a menu is open.~~ Decided 16 Nov: it sits under the menu, never part of the menu.
- ~~W22. The alert button and the menu's top edge.~~ Decided 16 Nov: the menu covers the button completely.
- ~~W23. The "Paused" pill covers the mission card.~~ Decided 16 Nov: centred on the menu's top edge.
- W24. People & survivor details and the Town panel: besides overlapping buttons, what bothers you there? A screenshot with a circle is enough.
- ~~W27. Build the overlap fix now or after the `game.js` split?~~ Decided 16 Nov: after the split. U13, U14 and U18 are decided and wait for it.
- ~~W28. Bug A5, what the Raiders note should show.~~ Decided 16 Nov: a raider in the Toll Kings' kit, fixed in the UI chat (3D.178).
- W32. Bug A5: say whether the new Raiders picture is right (screenshot sent in the UI chat). The note shows once per game, the first time raiders come, so seeing it in play needs a new game.

Code clean-up chat:
- ~~W31. Delete the old 2D drawing checks from four tests?~~ Decided 16 Nov: yes. Done.

Later:
- W9. Claude Code setup on the PC (optional; makes the checks faster).
- W10. Batch 5 armour (Tripo models): after art unfreezes.
- W11. When to end the freeze.

## Parked
- Round 4 play-test: stopped half way. 4 of 8 sheets are in the repo under `runs/round4/` (commit 2df273c); no comparison was written.
