# Zombie Haven: the phone look (look B), plan (UI chat, 23 Nov 2026)

**Look B is decided for the whole game (owner, 23 Nov, 10:08: "For the whole game."). Nothing built yet. Open points: section 6.** Owner, 23 Nov: "Can we come up with some sample to make the UI like an iphone"; then, on look B: "how would we implement that for all the function and interface? Maybe SOS will be like an incoming call from the ally? Warning is like amber alert? etc? Give me mock up of all interface with B style. Show me what inventory looks like, exploration looks like etc with this interface. Show me what fun things can we do with this?"

Pictures: `runs/ui_samples/phoneB_01_town.png` to `phoneB_15_settings.png` (three sheets: `phoneB_sheet_1.png` to `_3.png`), made by `tools/qa/phone_b_mock.js` over the real game scene, with the game's own item pictures and the valley map of W247. The first three looks are `ios_*.png` (`tools/qa/ios_ui_mock.js`).

## 1. What look B is
The idea: the game looks and behaves like a phone of today, so every menu, warning and message works the way the player already knows from their own phone. It is the Glass style the game has now, taken further.

- **Two kinds of glass.** *Clear glass* for things that float over the town (the resource bar, the mission, the clock, the tab bar, round buttons): see-through, bright edges, a soft shadow. *Dark glass* for sheets that slide up (every menu): darker so the words stay easy to read.
- **Shapes.** Capsules for bars and buttons; sheets with very round corners (about 38 px) that float a little off the screen's edges; round buttons for single actions.
- **Colours keep their meaning.** Lime: go, recommended, Build (unchanged). Coral: danger. Orange: warning. Blue: friends, our own messages, the route on the map. Teal: allies and outposts. Grey: locked or not now.
- **Type.** The game's own Manrope: big bold titles (28 px), body 15 to 16 px, small grey captions. **No Apple fonts, icons or names** (their licences forbid it); the patterns only.
- **Icons.** Simple line icons for moving around (tabs, close, search), drawn for the game; the game's sticker icons for things (food, wood, zombies, factions); the game's 3D pictures for items.
- **Movement.** Sheets slide up and can be pulled down by their handle; alerts pop in; the call screen breathes; rows slide sideways for quick actions.
- **The rules stay:** taps of 44 px or more, menus pause the game, nothing floats over an open menu, one news line at a time, facts first and the joke last.

## 2. Every screen, as a phone pattern
| Today | In look B | Picture |
|---|---|---|
| Top bar, mission card, clock, Renown | Glass capsules; the clock shows the weather and season | 01 |
| The most urgent thing going on (a herd coming, a trip out, a horde tonight) | A dark **live pill** under the resource bar that counts down | 01 |
| Bottom bar and the big Build button | A floating glass tab bar (Explore, People, Town, More) and a round lime Build button beside it | 01 |
| An ally asks for help (Greenwater's herd, W234) | **An incoming call**: the caller, their words, *Send a squad* or *Can't help*, *Send supplies*, *Remind me in an hour*; a missed call waits in Needs you | 02 |
| Big warnings (horde tonight, boss night, the weekly crisis) | **An emergency alert**: a red wash, a loud tone, *Show me* and *OK* | 03 |
| Needs you | **Notifications**: grouped (Emergency, People, Tips), newest first, swipe a tip to hide it until tomorrow | 04 |
| The radio | **Now playing on Moth FM**: the words appear line by line as Moth says them; tap a line to see the place he talks about | 05 |
| Explore (trip list) | **The valley map** (W247) with a sheet: search, the place's card, its mood faces, *Plan a trip*, *Trade*, *Raid* | 06 |
| Planning a trip | **Directions**: the route drawn on the map, on foot / hand cart / truck with the time, the squad as faces, the risk in words, one lime *Go* | 07 |
| People | A list grouped by what they are doing; **slide a row** for quick actions (Job, Heal) | 08 |
| A survivor's details | **A contact card**: a big face, *Talk*, *Job*, *Follow*, *Gear*; **rings** for health, food and rest; mood; what they are doing and where they live | 09 |
| Inventory | Tabs (Gear, Supplies, Combat, Tools, Story) and a grid of the game's item pictures, six to a row, with a coloured edge for rarity and a red count | 10 |
| An item | A big picture, its rarity, numbers, the joke, and **Give to** like sharing to people nearby: each face says better or worse for them | 11 |
| Build | **Folders** of buildings (Shelter, Food & water, Defence, Work, Power, Fun) and a row of suggestions for the mission | 12 |
| Faction and trader events (the Toll Kings' toll, offers) | **A message thread**: they text you, you pick a reply; their mood face in the title | 13 |
| The day's end | **Yesterday at the Haven**: zombies put down by hour, wood and food gained or lost, who did best | 14 |
| Settings, backup, event log | **A settings list** with coloured icons and switches | 15 |
| Not drawn yet: the Town panel, the level-up, Field Notes, the Story tab, stronghold and raid controls | The same parts: Town as a settings-style list; the level-up as an "update ready" card; Field Notes as a notes list; strongholds keep their controls in clear glass | - |

## 3. Fun things the phone look allows
1. **Allies call you** (02). A ringtone; if nobody answers, a missed call and a voicemail line in Needs you ("Elder Maud, 21:14: they broke the east gate...").
2. **Emergency alerts with their own siren** (03) for the big nights only, so they never become noise.
3. **A live pill** (01) that counts down a herd, a squad's trip or tonight's horde; tap it to jump there.
4. **Moth FM** (05): the radio as a station with the words as they are said; old broadcasts and found tapes in a list like episodes.
5. **Factions text you** (13): the Toll Kings typing..., threats and deals as messages, reply choices; a history of everything said between you.
6. **Give to, like sharing** (11): pick a face; better or worse shown under each.
7. **Rings** (09) for each survivor's health, food and rest, and the town's own rings on the Town tab (people fed, beds, walls).
8. **Slide a row** (08) for quick actions anywhere in lists.
9. **Yesterday at the Haven** (14): a short report each morning; on opening the game after a while away, **While you were away** in the same style.
10. **Update ready** for a level-up: "Haven, level 6. New: the Watchtower, the Festival Ground. Install tonight?" and the town is upgraded by morning.
11. **Memories**: at the end of each week a short slideshow of the week's moments (the first boss down, a wedding, a newcomer) made from the game's own pictures.
12. **Shaking the phone** on a big hit or an explosion (Android phones only; iPhones don't let web pages vibrate).

## 4. How it would be built
One change per build, each with a scripted check (layout on six phone sizes, taps of 44 px, nothing covered), shown as pictures first where the look changes.
0. **The parts** (`css/phone.css`): the two glasses, capsules, sheets, rows, rings, tokens for the colours. Behind a setting, **Look: Glass / Phone**, so today's look stays until the new one is done and the owner can switch back and forth.
1. The town screen: top capsules, the live pill, the floating tab bar and the round Build button.
2. One sheet for every menu (handle, big title, round close, pull down to close).
3. Lists: grouped rows and slide actions; People.
4. The survivor's contact card with rings.
5. Inventory and the item page with Give to.
6. Build folders and suggestions.
7. Needs you as notifications.
8. Emergency alerts.
9. Incoming calls (with the Strongholds chat's ally calls, W234; until then for the radio rescue and Greenwater's requests).
10. Moth FM.
11. Message threads for faction and trader events.
12. Yesterday at the Haven, and While you were away.
13. Settings and the rest of More.
14. The valley map and trip planning (W247, four builds) in this look.
15. When everything is done and played: the old look is removed (owner's call).

About 18 builds, the map's four included. The other chats' screens (strongholds, the story's scenes) use the same parts as they are built.

## 5. Limits to know
- **Speed.** Glass blurs what is behind it; many layers at once can make older phones slow. Each build is timed; a **Less glass** setting swaps blur for plain tint if needed.
- **Reading over a bright town.** Clear glass gets a darker tint where the town behind it is light (day, snow).
- **It is a web page, not an app.** Calls, alerts and notifications happen inside the game, not on the phone's lock screen. Real ones would need the game made into an app.
- **Inspired by, not copied.** No Apple names (no "FaceTime", "AirDrop", "Siri"), no Apple fonts, icons or artwork; the game's own words: radio call, emergency alert, Needs you, Moth FM, Give to.

## 6. Owner's answers and what is still open (W249)
Owner, 23 Nov, 10:08:
1. **"For the whole game."** Look B is decided, built as in section 4.
2. **"I like 1 to 6, i dont understand 7"**, on the list in the chat. In section 3's numbers, approved: 1 (calls, missed calls and voicemail), 5 (factions text you, with a history), 4 (Moth FM, old broadcasts and tapes as episodes), 9 (Yesterday at the Haven and While you were away), 10 (Update ready), 11 (Memories). Not understood: 7, the town's rings; drawn for the owner on the Town tab (`phoneB2_townrings.png`): three rings, Fed, Beds, Walls, each full when that is fine, and under them what would close each ring. Not answered: 12, the phone shaking.
3. **"i think these circle should be colored"** (the tab bar's icons, circled on the town picture) and **"we should have the option be able to see the character half body shot for each character instead of the letter"**.

Sent the same morning (`runs/ui_samples/phoneB2_*.png`, `tools/qa/phone_b2_mock.js`):
- **The tab bar, three ways** (`phoneB2_tabs_sheet.png`): A the game's sticker icons; B coloured line icons (Explore blue, People pink, Town amber, More violet); C coloured round badges with a white sign. Claude's pick: C (reads best over a bright town; the lime Build button stays the only lime thing).
- **The survivors' own pictures in place of letters** (`phoneB2_sheet.png`): the People page's chest-up shot in every round spot (lists, the squad, Give to), on the person's colour; a half-body shot on the survivor's card. The game already makes both from each person's 3D model, outfit and gear (`ZH3D.portrait`, `ZH3D.snap`), so nothing new has to be drawn.

Owner, 23 Nov, 10:26: **the tab bar is A**, the game's sticker icons ("use A"); **pictures always**, zoomed out "a bit more so you can see the weapon and armor" (sent: `phoneB2_sheet_v2.png`, hips up in the round spots, knees up on the card); **no shaking** ("no need for shake"); the town's rings still not understood ("what is the town's rings?"), explained again.

Owner, 23 Nov, 10:33: **"new zoom is good"**; **"no ring, use bar, use bar also for the character hunger and rest type bar"**. **No rings anywhere** (this replaces the rings in sections 2 and 3 and in pictures 09 and `phoneB2_townrings.png`): a survivor's card shows Health (a count), Food, Rest and Mood as bars; the Town tab shows Fed, Beds and Walls as bars, with what would fill each one listed under them (`phoneB2_bars_sheet.png`).

Nothing is open. Next: section 4, step 0 and step 1.
