# Zombie Haven: start here

Every new chat about the game starts with: **"Read zombie-haven/00-START-HERE.md."** This folder is the single source of truth. If something isn't written here, it isn't decided.

The same pages are kept in the repo under `docs/project/`, so they can be copied into any Claude project. The older files in the repo's `docs/` folder (DESIGN_V3, BACKLOG, PHASES…) are from before this reset: treat them as archive until checked.

## The folder
| File | What it is | Status |
|---|---|---|
| `00-START-HERE.md` | This page: where things are, the rules, how we work | live |
| `01-VISION.md` | What the game is, how it should feel, what it is not | live (approved by the owner, 16 Nov) |
| `02-DECISIONS.md` | Every owner decision, by topic | live |
| `03-BUGS.md` | The one bug list. Owner-seen bugs first | live |
| `04-UI.md` | UI direction, rules and the UI problem list | live (first version) |
| `05-NOW.md` | The next three jobs, and what is frozen | live |
| `06-ASSETS.md` | Every model, kit, icon, sound: in game or waiting, source file | live (written 16 Nov, Art chat) |
| `07-TESTING.md` | How we test, cheapest first; how ChatGPT is used | live |
| `08-BALANCE.md` | Balance targets (pace, danger, hordes, Banner routes, economy, town size, buildings), not numbers; what every building does today; the building changes decided | live (written 16 Nov, Balance chat) |
| `09-STORY.md` | The story (Forever Fresh): the truth, the layers, every faction's part, the cutscene list and storyboards, the cure, story items, DJ Moth's voice | live (approved by the owner, 19 Nov; open items in its section 13) |
| `10-VIDEO.md` | The story's 15 video clips: the look test, Luma AI against clips made by Claude (cost, quality, match, licences), file sizes on the phone, what's next. The test's source is in `video/v1-test/` | live (written 19 Nov, Video chat; waiting on W150, W151) |
| `11-CRAFTING.md` | Crafting with parts, like Last Day on Earth: the study, the 15 parts and where they come from, orders at the Workshop that survivors carry out, a recipe for every craftable item | **approved 20 Nov (Balance chat)** |
| `12-LONG-RUN.md` | The long-run test of 21 Nov: 10 bot towns, about 1,800 game days; findings on balance, combat, logic and UI | report, 21 Nov (Balance chat) |
| `13-LONG-GAME.md` | The plan for months of play: five rules (one pace for everyone, levels made of deeds, danger by level, something to buy with every stock, loops at the top), the end game with the cure, room for later systems, and **the balance routine** to run whenever the game changes | live (approved by the owner, 21 Nov; nothing built yet) |
| `14-ZOMBIE-MOVES.md` | A signature move for every kind of zombie in place of the shared one-arm swipe, and a draft backstory for each, tied to the story | live, 21 Nov (Art chat): the moves approved (W190), built one zombie per build (the Dog's and the Stag's gallop: 3D.256); the backstories are settled in the Story chat (`09-STORY.md`, 10.2, W192) |

The older docs under `claude/` are an archive in the **Game Development** project (they are not in the repo). Their decisions are already merged into `02-DECISIONS.md`; open the archive only for detail such as exact numbers of an old build.

## Where things are
- Repo `sfwong629-droid/Zombie-haven`, branch **art-direction-b** (never push to main). Build **3D.256**.
- Live game: https://claude.ai/artifact/PidbC3srwbxmFqhfPkqJmn (version 288 = 3D.256, page cache tag v=3d.285). Never republish the direction-A artifact F8sGocbQgVJxj4ed2fLdzu.
- Game code: `js/game.js` is kept as 27 area files in `src/game/` (guide: `src/game/README.md`). Edit the area file, run `python3 tools/build/game.py` to join them into `js/game.js`, and commit both. If you edited `js/game.js` directly, run `python3 tools/build/game.py --split` instead. The test suite fails (`parts`) when the two differ. `js/game.js` is still the file that is published.
- Publishing: full slug `b7f9181b-346a-4ccb-85be-5f1f659593f9`; take the *published* index.html, bump v=3d.N, publish only changed js/css. Never use the repo's index.html. Another chat may have published since: always read the live version first.
- ChatGPT: project "Zombie Haven testing" in the owner's ChatGPT; details in `claude/zombie-haven-chatgpt-testing.md`.

## Standing rules
- Report the repo link and commit links after every push.
- Never paste API keys in chat. Don't delete scheduled tasks without permission.
- Must work offline. No Claude for character AI. No chibi. No weapons on zombies (one exception: the Gatling Boss, as he is).
- Keep the phone shape. Menus pause the game. One news pill at a time. Emergency slow-down stays off.
- Funny text: facts first, joke last (building notes keep the joke first).
- Tripo sheets: separate square files per view, never one sheet.

## How we work (from 16 Nov 2026)
1. **Frozen:** only what `05-NOW.md` lists. From the afternoon of 16 Nov that is full tester rounds only; new features, balance changes and new art are allowed again.
2. **The owner's bugs come first.** Tester and ChatGPT findings wait in `03-BUGS.md`.
3. **One change per build**, each with a scripted check. No patch on a patch: if a fix needs a second fix, stop and rework.
4. **Check every change against `01-VISION.md` and `04-UI.md`.** If it isn't covered, ask the owner before building.
5. **Testing, cheapest first:** scripted checks → balance bot → ChatGPT screenshot review → one Claude tester on one question → a full 8-tester round only at milestones, on the owner's say.
6. **Every chat ends by updating this folder** (project and repo): bugs, decisions, NOW. Nothing important lives only in a chat.

## One chat per job
Keep chats short and single-purpose, so nothing floats:
- **Bugs**: fix items from `03-BUGS.md`.
- **Code clean-up**: the test suite and splitting `game.js`.
- **UI**: all UI work, from `04-UI.md` (owner, 16 Nov: UI gets its own chat).
- **Art**: Tripo sheets, armour, icons.
- **ChatGPT**: reviews and second opinions.
- **Music**: the game's music and sound (owner, 18 Nov). Today the music is written by the game itself in `js/sound.js` (the five Ghibli day tunes from 3D.248, Meadow the default; Lanterns at night from 3D.249; from 3D.255 fights play Stand Firm A and B in turn, hordes and bosses The Tide), played on recorded instrument samples; most sound effects are made by code. Files and licences in `06-ASSETS.md`, section 8.
- **Story**: the game's story, written in `09-STORY.md` (owner, 19 Nov; approved the same day): **Forever Fresh**, Freshlock in the tins, the secret told in layers, 42 cutscenes, the cure, story items, DJ Moth's voice. The Story chat keeps the page and writes the words; scenes are built in the Features chat.
- **Video**: the story's 15 video clips (owner, 19 Nov): the look, how they are made (Luma AI or from the game's own 3D), prompts, licences, file sizes on the phone. Page: `10-VIDEO.md`. **Started 19 Nov:** V1 test made in three looks; waiting on the owner's pick of look (W150) and way of making them (W151). In that first session the repo could not be attached (W152).
- **Features**: new features from `01-VISION.md` (the daytime threat, Take command). Can start: step 1 of the `game.js` split is done and the owner said that is enough (16 Nov, W42).
- **Balance**: the targets in `08-BALANCE.md` and the building list; numbers are tuned against them, one change per build.
- **Planning**: vision, decisions, what's next. Also the general chat: ideas, questions and anything that has no chat of its own start here.

Chats can't see each other. They share only this folder, so each chat re-reads `05-NOW.md` (the project copy; the repo copy can be behind when a chat could not push) before listing what is waiting, and takes the next free W number from it.

## Two rules for every chat (owner, 16 Nov)
- **Stay on topic.** If the owner asks for something that belongs in a different chat (for example a bug in the vision chat), Claude says so and names the chat it belongs in.
- **Nothing gets dropped.** If the owner hasn't given a direction or decision, or hasn't done something that is waiting on them, Claude keeps it in "Waiting on the owner" in `05-NOW.md`. **Each chat brings back only its own open items** in every reply until they are done. **Only the Planning chat (planning and vision) lists every chat's open items** (owner, 19 Nov, W153; before that every chat listed everything).
