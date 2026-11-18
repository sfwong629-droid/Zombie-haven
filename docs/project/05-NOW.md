# Zombie Haven: now (16 Nov 2026)

## Frozen
**Full tester rounds only** (owner, 16 Nov, afternoon). No full testing for now.

New features, balance changes and new art in the game are allowed again. The working rules in `00-START-HERE.md` still apply: the owner's bugs first, one change per build with a scripted check, every change checked against the vision.

## The next three jobs
1. ~~**Finish this folder.**~~ Done 16 Nov: `01-VISION.md` approved by the owner; `06-ASSETS.md` written in the Art chat from the repo's `assets/` folder. (`08-BALANCE.md` is its own job in the Planning chat.)
2. ~~**Bug A1, the sliding survivors.**~~ Fixed in 3D.176 (16 Nov). Owner bugs fixed the same day: A4 (3D.177), A5 (3D.178, UI chat), A7 Stalker skin (3D.179), A2 angry face flashing (3D.180); A3 closed. Still open: A6 (Ben can't reach the Garden Plot), waiting for the owner's backup.
3. ~~**Make the test suite trustworthy** (bugs C1, C2).~~ Done 16 Nov: the suite is green (39 of 39, about 2 minutes). Two tests each failed once in a full run and pass alone (`combat`, `expchoices`): watch them. *(UI chat, 17 Nov: in four full runs, `economy`, `sim` and `expchoices` each failed once and passed when run alone; the same happens without the UI change.)*

## After that (not started, in this order)
- Split `js/game.js` by area. **Step 1 done 16 Nov** (Code clean-up chat): the code is kept as 27 area files in `src/game/` and joined into `js/game.js`; the game itself is unchanged. **Step 2, next:** separate the areas for real (today they still share all their variables), one area per session, in the Code clean-up chat. Nothing waits for step 2 (owner, 16 Nov, W42).
- UI work from `04-UI.md`, one screen at a time, **in its own chat** (owner, 16 Nov).
- The rest of `03-BUGS.md` section B.
- ~~Write `08-BALANCE.md`, the balance targets page.~~ Done 16 Nov in the Balance chat; the owner approved it. No number in the game was changed.
- Building changes decided in the Balance chat (`08-BALANCE.md`, section 10): spread the buildings over levels 1 to 10, move the Stone step to era 3, seven new buildings, School for children only. The plan was approved on 17 Nov; built in the Features chat, one change per build, in the order the owner picks (W53). The seven new buildings need models from the Art chat.
- Build the daytime zombie threat and the Take command button for fighters in town (both decided 16 Nov; see `01-VISION.md`), in a Features chat. **Can start now** (owner, 16 Nov, W42: step 1 of the split is enough).
- Build the eleven new kinds of zombie (decided 17 Nov; list in `02-DECISIONS.md`, "Zombies"), in the Features chat, one kind per build. The Stag needs the daytime roaming groups first.

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
- ~~W37. When to build the new features.~~ Decided 16 Nov: after the `game.js` split (so after the test suite is green too). *(W42, 16 Nov: step 1 of the split is done and is enough: they can start now.)*
- ~~W38. The balance targets page.~~ Done 16 Nov in the Balance chat: the owner answered the target questions and approved the page.

Bugs chat:
- ~~W5. Start the Bugs chat.~~ Done 16 Nov.
- ~~W6. Bug A1: what the survivor was doing just before it froze.~~ Closed 16 Nov: the tracker logs answered it.
- ~~W12. Bug A1: the tracker log.~~ Done 16 Nov (two logs; they showed the cause).
- ~~W20. Bug A1: does anyone still freeze?~~ Owner, 16 Nov: not seen so far in 3D.176+.
- ~~W17. Bug A2: which emoji?~~ Answered 16 Nov: the angry one.
- ~~W19. Bug A3 (the game froze).~~ Closed 16 Nov: it doesn't happen now.
- ~~W21. Bug A4: does tapping people work?~~ Confirmed 16 Nov.
- ~~W32. Bug A6: a "Copy save" button?~~ Owner said yes, 16 Nov; not needed, the game already has one (More → event log → Backup this town → Copy text).
- W36. Bug A6 (Ben can't reach it): next time someone is stuck on "Couldn't reach it", open More → event log → Backup this town → Copy text, and paste it in the Bugs chat. (Owner, 16 Nov: the Copy text route works. No backup of a stuck town has been sent yet.)
- ~~W34. Bug A2: does the angry face still flash?~~ Owner, 16 Nov: not seen in 3D.180+.
- ~~W35. Bug A7: does the Stalker look right?~~ Owner, 16 Nov: looks OK in the zombie test.
- W7. Any other bugs they have seen.

UI chat:
- ~~W8. Their own UI complaints (for `04-UI.md` section C).~~ Started 16 Nov: People & survivor details and the Town panel (crowded, hard to read, confusing or too many taps); first, buttons overlaying each other. The owner can add more any time.
- ~~W25. Radio while a menu is open.~~ Decided 16 Nov: hidden, for every menu.
- ~~W26. Alert button while a menu is open.~~ Decided 16 Nov: it sits under the menu, never part of the menu.
- ~~W22. The alert button and the menu's top edge.~~ Decided 16 Nov: the menu covers the button completely.
- ~~W23. The "Paused" pill covers the mission card.~~ Decided 16 Nov: centred on the menu's top edge.
- W24. People & survivor details and the Town panel: besides overlapping buttons, what bothers you there? A screenshot with a circle is enough.
- ~~W27. Build the overlap fix now or after the `game.js` split?~~ Decided 16 Nov: after the split. U13, U14 and U18 are decided and wait for it. *(W42, 16 Nov: step 1 of the split is done and is enough: they can be built now.)*
- ~~W28. Bug A5, what the Raiders note should show.~~ Decided 16 Nov: a raider in the Toll Kings' kit, fixed in the UI chat (3D.178).
- ~~W30. Bug A5: is the new Raiders picture right?~~ Done 16 Nov: the picture is OK.
- ~~W33. Town raiders' weapons.~~ Decided 16-17 Nov and built in 3D.187: each kind of raider carries its own weapon, one step better per era, and the Raiders note shows the weapon of the raider that came.
- ~~W41. Hide button on tips in the Needs you list.~~ Decided 17 Nov: a ✕. Built in 3D.186.
- ~~W55. Raider weapon upgrades.~~ Decided 17 Nov: yes to one step per era and to the table (Thief: knife, cleaver, machete, katana. Brute: nail bat, spiked club, sledgehammer, fire axe. Firebug: pipe, crowbar, hatchet, spear), and better weapons must hit harder. The looks are built in 3D.187; how much harder is W57.
- W58. Play 3D.187 and say whether the raiders' weapons look right in a raid on the town.
- W56. Play 3D.186 and say whether the ✕ on tips in the Needs you list works as wanted.

Code clean-up chat:
- ~~W31. Delete the old 2D drawing checks from four tests?~~ Decided 16 Nov: yes. Done.
- ~~W39. Mark tests that found a real bug as "known bug" so the suite can go green early?~~ Decided 16 Nov: no, fix the bugs first.
- ~~W40. Advisor tips in the Needs you list can no longer be hidden for the day: add a hide button?~~ Decided 16 Nov: yes. Passed to the UI chat (see W41).
- ~~W42. Do the UI overlap fixes and the new features wait for step 2 of the split?~~ Decided 16 Nov: no, they start now. Step 2 runs alongside in the Code clean-up chat.

Art chat:
- ~~W43. Batch 5 armour: which five?~~ Decided 16 Nov: Hockey Pads, Kevlar Vest, Scrap Plate, Military Armor, SWAT Armor. **Next (Claude):** the five three-view sheets, each shown whole to the owner before it is split for Tripo.
- ~~W44. Delete the left-over files in `assets/`?~~ Decided 16 Nov: delete. Done with 3D.183 (3,076 files, 196 MB; still in the git history).
- ~~W45. Paint the five soft armours in code?~~ Decided 16 Nov: no, they will be built in Tripo later.
- ~~W46. The eleven new zombie models: new kinds, or new looks?~~ Decided 16 Nov: all eleven are new kinds of zombie. Step 1 (rigged, on the Zombie test page) was done in 3D.182. What each one does: W48.
- ~~W47. Do the eleven look right on the Zombie test page?~~ Owner, 16 Nov: OK for now.
- ~~W48. The eleven new kinds of zombie: trick, strength and first day.~~ Decided 17 Nov in the Planning chat: Claude's proposal approved as it stands (the Nurse raises fallen zombies). The list is in `02-DECISIONS.md`, "Zombies". Built in the Features chat, one kind per build.
- ~~W49. Is the new Zombie test page easy to follow?~~ Owner, 17 Nov: yes. The size and model changes asked for the same day are in 3D.185 (W51).
- ~~W51. Zombie sizes and models (3D.185, 3D.188): are they right?~~ Owner, 17 Nov: yes, the size is good. (Walker, Lasher, Leaper, legless Crawlers, the smaller Butcher and Bloater Queen. The owner said nothing against the Crawlers' stumps.)
- ~~W62. Bug A8: the Zombie test showed menus but no map or zombie on the phone.~~ Owner, 17 Nov: fine now, it looks like a connection issue. Closed; nothing in the game was changed.
- W63. Survivor animations (review of all 46, 17 Nov; list in `06-ASSETS.md`, "Survivor animation review"). Decided 17 Nov: survivors must move like real people; each movement is copied from a recording of a real person, shown to the owner first (`02-DECISIONS.md`, "Survivor movement"). Done: walk and jog (3D.189, W64). Next, one at a time: walking while carrying (see W65), walking with a melee weapon and with a gun, standing, the run, melee swings, firing, then the rest. Waiting: nothing; Claude brings the next reference.
- ~~W64. Walking speed against the real walk.~~ Decided 17 Nov and built in 3D.189: the speed stays; survivors walk (brisk walk, 63% of the old pace) in free time and on short trips and jog (jog A, clip 09_11) to work and when zombies are about. Rule in `02-DECISIONS.md`, "Survivor movement".
- ~~W65. Carrying.~~ Decided 17 Nov: (a) carriers keep today's pace and get a hurried carrying movement; no change to the town's income.
- ~~W66. Do the walk and the jog (3D.189) look right?~~ Owner, 17 Nov: looks great.
- ~~W67. Is the Survivor test page (3D.190) what you wanted?~~ Owner, 17 Nov: yes. (The owner can name animations that look wrong there at any time.)
- W68. Carrying, the reference (shown 17 Nov as before/after pictures): the legs and body of a gentle recorded jog (clip 35_17, the first jog shown, which covers the ground carriers cover today), with the arms kept on the crate. Is that the carrying movement you want? If yes it goes in as the next build (carrying while walking; carrying while standing follows with the standing pose).

Balance chat:
- ~~W50. The building plan.~~ Approved 17 Nov (`08-BALANCE.md`, section 10): when each building opens, the seven new buildings, and four linked changes (era 3 buildings, the Landmark as the build route, the festival at level 5, the Quarry before power).
- ~~W52. Measure today's game with the balance bot?~~ Owner, 17 Nov: yes. Done the same day: three seeds, 30 game days (`08-BALANCE.md`, section 12). Nothing in the game was changed.
- ~~W53. The order to build the building plan in.~~ Approved 17 Nov: the level spread, the School and Library split, the festival at level 5, the new buildings as their models arrive (Watchtower and Festival Ground first), the Landmark route last. Built in the Features chat.
- W54. Hordes, the first number to tune. The bot shows there is no big horde today: boss nights (every third night) bring 10 to 38 zombies, the same as ordinary nights (16 to 29), and at most 18 are on screen. The era 1 targets (big horde 40, ordinary night 10) would make ordinary nights smaller than today. Choose: (a) keep ordinary nights as they are and raise the big horde targets to about 60, 120 and 240 (Claude's recommendation), or (b) keep 40, 100 and 200 and cut ordinary nights to a quarter. Then say go for the first change: a big horde that is about three times an ordinary night.
- W59. Children like Fallout Shelter (owner, 17 Nov): a growth period, school before they are useful, good stats from the parents. Today a couple has a baby, the child grows up in 5 days (3 with a School) and joins as a Civilian with the average of the parents' stats; the child is only a line in a list until then. Waiting: (1) should children be seen in town, walking to the School each day? Claude's recommendation: yes. (2) Is a School needed to grow up, or does it only help? Recommendation: it helps (grows up sooner and with one stat higher); without one they still grow up, slower. (3) What is inherited? Recommendation: the better of the two parents' value in two stats, the average in the rest, and one trait from a parent. Built in the Features chat once decided.
- W60. Teach the balance bot to earn Banners, so it can measure levels 6 to 15 (today it stops at level 5 for good)? It changes the test tool only, not the game. Claude's recommendation: yes.
- W61. Buildings in era 1: the target says about 12 at level 5, but a level 5 town has 25 to 27 today. Raise the targets to about 25, 40 and 55 (Claude's recommendation: the town already looks right at that size), or keep 12, 25 and 40 and cut what each level asks for?
- W57. **From the UI chat:** better raider weapons should hit harder (owner, 17 Nov). From 3D.187 a town raider's weapon goes up one step per era, but it is looks only: a raider's strength still comes from the danger level (how strong the town's people are, plus a slow daily creep) and its kind (a Brute hits 1.5 times as hard as a Thief). Waiting, in the Balance chat: how much harder each step hits, checked against the danger targets in `08-BALANCE.md`.

Later:
- W9. Claude Code setup on the PC (optional; makes the checks faster).
- ~~W10. Batch 5 armour (Tripo models).~~ Started 16 Nov in the Art chat: see W43.
- (W11 is closed: see the Planning chat list.)

## Parked
- Round 4 play-test: stopped half way. 4 of 8 sheets are in the repo under `runs/round4/` (commit 2df273c); no comparison was written.
