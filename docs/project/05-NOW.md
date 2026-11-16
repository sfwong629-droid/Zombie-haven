# Zombie Haven: now (16 Nov 2026)

## Frozen
**Full tester rounds only** (owner, 16 Nov, afternoon). No full testing for now.

New features, balance changes and new art in the game are allowed again. The working rules in `00-START-HERE.md` still apply: the owner's bugs first, one change per build with a scripted check, every change checked against the vision.

## The next three jobs
1. **Finish this folder.** `01-VISION.md` was approved by the owner on 16 Nov. Still to write: `06-ASSETS.md` (from the repo's `assets/` folder).
2. ~~**Bug A1, the sliding survivors.**~~ Fixed in 3D.176 (16 Nov). Owner bugs fixed the same day: A4 (3D.177), A5 (3D.178, UI chat), A7 Stalker skin (3D.179), A2 angry face flashing (3D.180); A3 closed. Still open: A6 (Ben can't reach the Garden Plot), waiting for the owner's backup.
3. **Make the test suite trustworthy** (bugs C1, C2), so the code clean-up can start safely. Started 16 Nov in the Code clean-up chat: C2 fixed, C1 down from 35 failures to 18 and a full run from 14 minutes to 2. Next: go through the 18 one at a time (list in `03-BUGS.md`). The `game.js` split does not start until the suite is green.

## After that (not started, in this order)
- Split `js/game.js` by area, one area per session.
- UI work from `04-UI.md`, one screen at a time, **in its own chat** (owner, 16 Nov).
- The rest of `03-BUGS.md` section B.
- Write `08-BALANCE.md`, the balance targets page: the next job in the Planning chat (owner, 16 Nov; the owner answers the target questions, W38).
- Build the daytime zombie threat and the Take command button for fighters in town (both decided 16 Nov; see `01-VISION.md`), in a Features chat. Starts only after the `game.js` split (owner, 16 Nov).

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
- ~~W11. When to end the freeze.~~ Decided 16 Nov: everything is unfrozen except full tester rounds.
- ~~W37. When to build the new features.~~ Decided 16 Nov: after the `game.js` split (so after the test suite is green too).
- W38. The balance targets page (`08-BALANCE.md`) is now the next job in the Planning chat: say go, and Claude asks the target questions (pace, danger, hordes, routes, economy).

Bugs chat:
- ~~W5. Start the Bugs chat.~~ Done 16 Nov.
- ~~W6. Bug A1: what the survivor was doing just before it froze.~~ Closed 16 Nov: the tracker logs answered it.
- ~~W12. Bug A1: the tracker log.~~ Done 16 Nov (two logs; they showed the cause).
- ~~W20. Bug A1: does anyone still freeze?~~ Owner, 16 Nov: not seen so far in 3D.176+.
- ~~W17. Bug A2: which emoji?~~ Answered 16 Nov: the angry one.
- ~~W19. Bug A3 (the game froze).~~ Closed 16 Nov: it doesn't happen now.
- ~~W21. Bug A4: does tapping people work?~~ Confirmed 16 Nov.
- ~~W32. Bug A6: a "Copy save" button?~~ Owner said yes, 16 Nov; not needed, the game already has one (More → event log → Backup this town → Copy text).
- W36. Bug A6 (Ben can't reach it): next time someone is stuck on "Couldn't reach it", open More → event log → Backup this town → Copy text, and paste it in the Bugs chat.
- W34. Bug A2 (angry face flashing): play 3D.180 and say whether it still flashes. If it does: who, and what their status line says.
- W35. Bug A7 (Stalker): say whether the Stalker looks right now, in the note and in play.
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
- ~~W30. Bug A5: is the new Raiders picture right?~~ Done 16 Nov: the picture is OK.
- W33. Town raiders' weapons (owner, 16 Nov: the weapon should change with the raider). Decided: in the town each kind of raider carries its own weapon, and the Raiders note shows the kind that came. Today each raider gets a random one (bat, knife, crowbar, pistol or machete). Proposal sent in the UI chat: Thief knife, Brute sledgehammer, Firebug crowbar, nail bat or hatchet (a torch would be new art, which is frozen). Waiting: yes or no to Thief and Brute, and which weapon for the Firebug. (Planning chat, 16 Nov: new art is no longer frozen, so a torch is possible.)

Code clean-up chat:
- ~~W31. Delete the old 2D drawing checks from four tests?~~ Decided 16 Nov: yes. Done.

Later:
- W9. Claude Code setup on the PC (optional; makes the checks faster).
- W10. Batch 5 armour (Tripo models): art is unfrozen (16 Nov), so this can go ahead in an Art chat.
- (W11 is closed: see the Planning chat list.)

## Parked
- Round 4 play-test: stopped half way. 4 of 8 sheets are in the repo under `runs/round4/` (commit 2df273c); no comparison was written.
