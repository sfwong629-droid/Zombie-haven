# Zombie Haven: now (16 Nov 2026)

## Frozen
**Full tester rounds only** (owner, 16 Nov, afternoon). No full testing for now.

New features, balance changes and new art in the game are allowed again. The working rules in `00-START-HERE.md` still apply: the owner's bugs first, one change per build with a scripted check, every change checked against the vision.

## The next three jobs
1. ~~**Finish this folder.**~~ Done 16 Nov: `01-VISION.md` approved by the owner; `06-ASSETS.md` written in the Art chat from the repo's `assets/` folder. (`08-BALANCE.md` is its own job in the Planning chat.)
2. ~~**Bug A1, the sliding survivors.**~~ Fixed in 3D.176 (16 Nov). Owner bugs fixed the same day: A4 (3D.177), A5 (3D.178, UI chat), A7 Stalker skin (3D.179), A2 angry face flashing (3D.180); A3 closed. Still open: A6 (Ben can't reach the Garden Plot), waiting for the owner's backup.
3. ~~**Make the test suite trustworthy** (bugs C1, C2).~~ Done 16 Nov: the suite is green (39 of 39, about 2 minutes). Two tests each failed once in a full run and pass alone (`combat`, `expchoices`): watch them. *(UI chat, 17 Nov: in four full runs, `economy`, `sim` and `expchoices` each failed once and passed when run alone; the same happens without the UI change.)* *(Art chat, 17 Nov, 3D.192: `expchoices` failed 3 times in 9 runs alone, on the check "if no order comes before the next stage, the squad decides"; it is a trip rule with a dice roll in it and nothing in that build touches trips.)* *(Art chat, 18 Nov, 3D.194: `sim` failed once in a full run with a town of 2 survivors at rank 1, then passed 3 of 3 alone with 5 to 9 survivors. Nobody has checked whether the slower strolls of 3D.189 make a weak 12-day town more likely: a question for the Balance chat's bot.)*

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
- ~~W58. Do the raiders' weapons look right?~~ Owner, 17 Nov: looks right.
- ~~W56. Does the ✕ on tips work as wanted?~~ Owner, 17 Nov: looks good.
- W79. Icons on the Town tabs (owner, 18 Nov: "can we add some icon to these?"; UI problem U21). A before / after picture was sent in the UI chat: Haven a house, Defense a shield, People two people, More the menu bars, spaced so all four fit a phone without scrolling. Waiting: are these four icons right, and should the other tab rows that have only words get icons too (a survivor's Status / Gear / Job / About; People / Workplaces; Food / Water / Wood / Stone / Scrap)?
- W80. Play 3D.195 or later and say whether the open menus look right: no radio button, the alert button gone where the menu reaches it, "Paused" on the menu's top edge.

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
- W63. Survivor animations (review of all 46, 17 Nov; list in `06-ASSETS.md`, "Survivor animation review"). Decided 17 Nov: survivors must move like real people; each movement is copied from a recording of a real person, shown to the owner first (`02-DECISIONS.md`, "Survivor movement"). Done: walk and jog (3D.189, W64), carrying while walking (3D.191), walking and jogging with a weapon (3D.192), standing (3D.193), six more standing poses on the same legs (3D.194), the run (3D.197). the melee swings (3D.201: the old swings corrected, after the recorded ones of 3D.198 looked weak; 3D.203 and 3D.205: no jumping arms, Swing 3 a rising cut, Swing 4 out of the one-handed set). Next, one at a time: firing, punch and shove, then the rest. (The two-handed set and the spear stab: 3D.207.) Waiting: nothing; Claude brings the next reference.
- ~~W64. Walking speed against the real walk.~~ Decided 17 Nov and built in 3D.189: the speed stays; survivors walk (brisk walk, 63% of the old pace) in free time and on short trips and jog (jog A, clip 09_11) to work and when zombies are about. Rule in `02-DECISIONS.md`, "Survivor movement".
- ~~W65. Carrying.~~ Decided 17 Nov: (a) carriers keep today's pace and get a hurried carrying movement; no change to the town's income.
- ~~W66. Do the walk and the jog (3D.189) look right?~~ Owner, 17 Nov: looks great.
- ~~W67. Is the Survivor test page (3D.190) what you wanted?~~ Owner, 17 Nov: yes. (The owner can name animations that look wrong there at any time.)
- ~~W68. Carrying, the reference.~~ Owner, 17 Nov: lean back a bit, as people do to balance the weight. Built in 3D.191: the legs and body of the gentle recorded jog (clip 35_17), the body leaning back about 9 degrees, the arms kept on the crate; carriers keep today's pace.
- ~~W69. Is the carrying lean right, and do the walk and jog still look right at their true pace (3D.191)?~~ Owner, 17 Nov: looks good.
- ~~W70. Moving with a weapon in the hand.~~ Owner, 17 Nov: looks fine. Built in 3D.192: walk and jog with a melee weapon, walk and jog with a gun (the recorded walk and jog; the weapon arm as before). Raiders use them too.
- ~~W71. Do the four weapon movements (3D.192) look right?~~ Owner, 17 Nov: looks good.
- ~~W74. Standing, the reference.~~ Owner, 17 Nov: yes. Built in 3D.193: the upper body and small movements of a person standing still (clip 113_21, 4 seconds), head level, legs worked out (feet planted, one leg straight, the other relaxed).
- ~~W75. Does the new stand (3D.193) look right?~~ Owner, 17 Nov: looks good.
- ~~W76. Do the six standing poses of 3D.194 look right?~~ Owner, 18 Nov: looks good.
- ~~W77. The run, the reference.~~ Owner, 18 Nov: yes. Built in 3D.197 (clip 78_12; it plays at its true pace, so the old 85% slow-down no longer applies to the survivors' run).
- ~~W78. Does the run (3D.197) look right?~~ Owner, 18 Nov: looks good.
- ~~W81. Melee swings.~~ Owner, 18 Nov: more force and wider; then yes to the second version, and yes to a separate two-handed set. Built in 3D.198: Swing 1, 2 and 4 are three cuts from a recording of sword practice (clip 02_09), exaggerated so they read (bigger wind-up, straight arm, hips into the blow, slow wind-up and fast blow); Swing 3 is a copy of Swing 1. Check: `tools/qa/swing_head_check.sh` (the bat is never inside the head). The six combos are not rebuilt: the game does not use them (only the Survivor test page shows them).
- ~~W83. Do the swings of 3D.198 look right?~~ Owner, 18 Nov: no, they look weak; correct the previous swings instead. Done in 3D.201: the old hand-made swings are back, corrected by `tools/art/b3d/fixswing.py` (the weapon arm is turned just enough that the weapon, hands and elbows stay out of the head; the weapon stays out of the ground; the hips are lifted where the feet sank).
- ~~W84. Which weapons are two-handed?~~ Owner, 18 Nov: yes to Claude's list. Two-handed: Sledgehammer, Fire Axe, Scrap Spear, Shovel, Road Sign. One-handed: everything else (bat, pipe, crowbar, machete, katana, hatchet, cleaver, knife, golf club, spiked club, nail bat). The two-handed set itself: W90.
- ~~W85. Bug A9: can the survivor be seen on the phone now?~~ Owner, 18 Nov: the test looks good.
- ~~W86. Are the corrected swings (3D.201) right?~~ Owner, 18 Nov: OK, but the arm that does not hold the weapon is still glitching; make the swings more natural. Done in 3D.202: the free arm no longer jumps up in front of the chin and flings about: it comes forward across the chest as the weapon is drawn back, is pulled back to the hip as the blow lands, then returns; the weapon arm's correction is evened out so it does not shake; the weapon hand is kept further from the face. Swing 4 (overhead) is now one-handed.
- ~~W87. Do the free arm and the swings (3D.202) look natural?~~ Owner, 18 Nov, with a video: the right arm (the weapon arm) is still teleporting. Cause: the corrected path round the head is longer than the old path through it, but it was given the same few moments, so the bat stood behind the back and then crossed to the front in about two screen frames (up to 3,100 to 3,700 degrees a second). Done in 3D.203: the timing of the four swings is re-spread: the weapon turns at most 1,150 degrees a second (38 degrees per screen frame) and the hand moves at most 5.5 units a second; the swing keeps its length, the time comes from the still parts of the wind-up. New scripted check: the weapon may turn at most 48 degrees in one screen frame.
- ~~W88. Is the weapon arm's teleporting gone (3D.203)?~~ Owner, 18 Nov: the left arm has the same issue; take Swing 4 out of the one-handed set; make Swing 3 start low on the right and swing upward across the body. Done in 3D.205. Cause of the left arm's jump: the old swings start with the free arm 46 to 61 degrees away from the stance (the game blends into a swing in only 0.12 s) and end another 55 to 75 degrees away from where they start (a one-frame snap when a swing follows a swing, and every time on the test page, which repeats it); the body also started 7 degrees off, because the stance has been the recorded body since 3D.194. Now every swing starts and ends exactly in the stance and the free arm turns at most 11 degrees per screen frame. Swing 3 is a new rising cut; Swing 4 is gone from the one-handed set (a quick combo is Swing 1, 2, 3). New check: `tools/qa/swing_arm_check.sh`.
- ~~W89. Do Swing 1, 2 and 3 (3D.205) look right?~~ Owner, 18 Nov: good for now.
- ~~W90. The two-handed set, the reference.~~ Owner, 18 Nov, asked whether the movement was checked against real people and whether the weapon goes through the head or body. It had not been: Claude found real recordings in the library and sent them (stick figures, the weapon drawn through both hands). Owner: use them, and a spear stab (more spear-type weapons may come later). Decided: A level swing (baseball swing, CMU 124_07), B low rising swing (golf swing, 64_01; replaces the backhand, which the library does not have), C overhead chop (chopping wood, 79_01), D spear stab (the body of a step-in punch, 02_05, both hands on the spear made by hand). Every one must pass the head and body checks. Building it: W91.
- ~~W91. The two-handed set and the spear stab.~~ Owner, 18 Nov: "bring it". Built in 3D.207: a two-handed ready stance (both hands on the handle, the weapon up over the right shoulder); A level swing (the body of a real baseball swing, CMU 124_07), B low swing (a real golf swing, 64_01, played 1.4 times faster), C overhead chop (a real person chopping wood, 79_01); a spear stance (high guard) and the spear stab (the step and body of a real step-in punch, 02_05; both hands on the spear made by hand). The weapon runs along the line between the recorded hands, the left hand is put on the handle every frame, and each one starts and ends in its stance. The game plays them for the Sledgehammer, Fire Axe, Shovel and Road Sign (A, B, C in turn) and the Scrap Spear (the stab), for survivors and raiders. Checked with the real weapon models, not the bat: never inside the head or the body, no jumps, both hands on the weapon. Two things to know: the stab points slightly down at full stretch (about 20 degrees: the spear's long butt must pass outside the body and the arms are short), and at the end of A the left hand lifts about 4 cm off the handle for two frames while the arms return to the stance.
- ~~W92. Do the two-handed set and the stab (3D.207) look natural?~~ Owner, 18 Nov: A is good; B and C are not good; the spear stance and stab need the hands apart and the legs split like a fighting stance. Owner's picks: B = backhand return, C = big overhead slam. Done in 3D.208: B is swing A mirrored (it starts over the left shoulder, where A ends, and swings back to the right); C keeps the body of the wood-chopping recording but the weapon is lifted straight up overhead and slammed forward into the ground (made by hand; the recording has no step forward, so there is none); the spear stance is a boxer's guard (CMU 13_17: left foot forward, hips lowered) with the hands 20 cm apart on the spear, rear hand by the right hip; the stab is the same boxer's lunge (the left foot steps forward about three times the guard's split while the spear is driven forward). A and the two-handed stance are unchanged.
- ~~W94. Are B, C, the spear stance and the stab (3D.208) right?~~ Owner, 18 Nov, with a video of C: "the human body shape is not there"; is there nothing for an overhead swing in the library? Cause (Claude): C mixed a real body (the start of the wood-chopping recording, hands low) with a weapon direction set by hand (straight up through the wind-up), so the arms crossed and tangled in front of the body and behind the head. The library has overhead swings: two takes of chopping wood (79_01, two chops; 80_71, eight chops). (B, the spear stance and the stab: no comment yet.)
- W95. The overhead swing, the reference (sent 18 Nov, stick figures): 1. chopping wood 79_01, second chop (lift from low, axe behind the head, a hard chop down with a bend at the waist); 2 and 3. chopping wood 80_71 (quicker, more upright). Claude recommends 1, copied whole: the arms and the axe both from the recording (the axe's angle worked out from the forearms and the wrists, since the library does not record it), nothing set by hand. Waiting: which one.
- (Found while answering W90: the live Swing 1 dipped about 4 cm into the right thigh at the end of the follow-through, and Swing 3 had its handle end about 2 cm into its own wrist. Fixed in 3D.206; the swing check now tests the body as well as the head.)

Balance chat:
- ~~W50. The building plan.~~ Approved 17 Nov (`08-BALANCE.md`, section 10): when each building opens, the seven new buildings, and four linked changes (era 3 buildings, the Landmark as the build route, the festival at level 5, the Quarry before power).
- ~~W52. Measure today's game with the balance bot?~~ Owner, 17 Nov: yes. Done the same day: three seeds, 30 game days (`08-BALANCE.md`, section 12). Nothing in the game was changed.
- ~~W53. The order to build the building plan in.~~ Approved 17 Nov: the level spread, the School and Library split, the festival at level 5, the new buildings as their models arrive (Watchtower and Festival Ground first), the Landmark route last. Built in the Features chat.
- ~~W54. Hordes.~~ Owner, 18 Nov: same number of zombies, much weaker. **Built in 3D.199, live with version 239 (3D.200):** the boss's mob is four times what it was, at a third of the health and half the hit; never more than 30 stand at once in era 1 (45 in era 2, 60 later), and the night's ordinary crowd makes room for it. Bot, three towns: boss nights cost 3, 2 and 2 deaths, at most 31 standing in era 1. Boss nights total 25 to 34 zombies in era 1 and 43 to 73 later, so era 1 is about half the 60 target: the rest never comes when the fighters kill the boss early.
- ~~W59. Children like Fallout Shelter.~~ Decided 17 Nov: seen in town and walking to the School each day; a School only helps (sooner, one stat higher); the better parent's value in two stats, the average in the rest, one trait from a parent. Built in the Features chat.
- ~~W60. Teach the balance bot to earn Banners.~~ Owner, 17 Nov: yes. Done: the bot never lacked the skill; its harness never let the game's short delays run out, so no Banner was ever raised. Fixed in `tools/balance/horde_study.py` (the game is unchanged). Second run in `08-BALANCE.md`, section 12: towns now reach level 6 or 7 in 30 game days.
- ~~W61. Buildings target.~~ Decided 17 Nov: about 25, 40 and 55.
- ~~W57. Raider weapons hit harder.~~ Owner, 18 Nov: soften it. Built in 3D.204: 5 + 0.2 x the weapon's attack (was 0.3). Bot, three towns: 4, 3 and 3 deaths, never more than 2 on one day. Live since version 243 (3D.205, published by the Art chat, 18 Nov).
- ~~W72. Two raider weapons were weaker than the step before.~~ Owner, 18 Nov: reorder. Built in 3D.196 (live): Brute: nail bat, fire axe, spiked club, sledgehammer. Firebug: pipe, hatchet, crowbar, spear.
- ~~W73. The first Banner wall.~~ Decided 18 Nov: leave it until the Landmark and the festival at level 5 are built.
- W82. Research. Decided 18 Nov: no building is locked behind research, and research lasts the whole game. **Draft sent 18 Nov** (`08-BALANCE.md`, section 13): today's recipe sets split by era (better gear with each Banner, the top gear at the Forge), the four old boosts kept, five new boosts, 19 projects in all. **Waiting: yes, or changes.** Then it is built in the Features chat.

Later:
- ~~W9. Claude Code setup on the PC.~~ Done 18 Nov (Planning chat): Claude Code installed on the owner's PC, the repo cloned into `Zombie Haven\repo` on the Desktop, and the setup message sent. It uses the same plan limits as the chats; the gain is speed (the PC has a graphics card).
- W93. Claude Code on the PC: what did it report back (how long the test suite and the browser check took, anything red)? That decides whether checks move to the PC. Before working there, pull the latest `art-direction-b` first: other chats push to it all day. No pushing from the PC until the owner says so.
- ~~W10. Batch 5 armour (Tripo models).~~ Started 16 Nov in the Art chat: see W43.
- (W11 is closed: see the Planning chat list.)

## Parked
- Round 4 play-test: stopped half way. 4 of 8 sheets are in the repo under `runs/round4/` (commit 2df273c); no comparison was written.
