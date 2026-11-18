# Zombie Haven: assets

Everything in the repo's `assets/` folder: what it is, whether the game uses it, and where it came from. Checked against the code on branch art-direction-b (first written at commit 1c4ec0f, build 3D.181; updated for 3D.185) on 16 Nov 2026, by reading what `index.html`, `css/` and `js/` actually load.

**In game** = the game loads it and shows or plays it. **Loaded, not shown** = the game downloads it but never puts it on screen. **Waiting** = made, not used yet. **Archive** = left over from an older look; nothing loads it.

Update this page whenever a file is added to or removed from `assets/`.

## Summary
- 321 files, 116 MB. (It was 3,397 files and 312 MB until the left-over 2D sprite frames, test pages and mock-ups were deleted on 16 Nov: section 9.)
- In game: 2 survivor models, 24 zombie models (plus 11 new ones that so far appear only on the Zombie test page), 27 fitted armour sets (20 items the player can wear, 6 faction kits, and the Riot Vest which is both), 24 weapon models in one file, 212 sound files, 11 font files.
- Waiting: the 11 new zombie models from 16 Nov are rigged and in `assets/`, but no zombie in a real game wears them yet (section 2). 14 armour items are in the game with no model of their own (section 4).
- Most art is not in `assets/` at all: buildings, walls, props, hats, accessories and every icon are drawn by code (section 9).
- The raw source models (Tripo and Hunyuan `.glb` files) are **not in the repo**. They are on the owner's PC. The repo holds the fitted result and the recipe that made it.

## 1. Survivors
| File (`assets/characters/…`) | What | Status | Source |
|---|---|---|---|
| `ai3d_v2/survivor_m3.glb` | Male survivor, 77 animations | **In game** (every man, every raider) | The owner's original male model, rigged with finger bones (3D.107). Raw model not in the repo |
| `ai3d_v2/survivor_f3.glb` | Female survivor, 77 animations | **In game** (every woman) | The owner's original female model (3D.124). Raw model not in the repo |
| `ai3d_male/realtime/male_lite.glb` | Old low-detail man (6k triangles) | Loaded, only as a fall-back body for zombies | `ai3d_male/male_rig.blend` → `tools/art/b3d/export3d.py` |
| `ai3d_male/realtime/male_lite_zombie_0…3.webp` | 4 zombie skins for that fall-back | Loaded, same fall-back use | `tools/art/b3d/zombie_tex.py` |
| `ai3d_male/realtime/male_mid_face_angry / happy / hurt / ko.png` | 4 face overlays for the old man model | Loaded, not shown (they only fit the old model) | `tools/art/b3d/facepaint.py` |
| `ai3d_male/realtime/male_mid.glb`, `male.glb` | Old survivor, 14k and 40k triangles | Archive (only with the `#v1` test switch) | `male_rig.blend` → `export3d.py` |
| `ai3d_male/male_rig.blend` | The old rigged man (24 MB) | Source file, not loaded | Hunyuan3D from ChatGPT front / side / back drawings |
| `ai3d_v2/rig/armor_base.blend` | The rig every armour is fitted to | Source file, not loaded. **Needed for every new armour** | Made from the male survivor |

**Recorded movements** (3D.189, owner 17 Nov): the survivors' walk (`walk`, `walk_f`) and jog (`jog`, new) are recordings of real people from the CMU motion capture library (mocap.cs.cmu.edu; the database was created with funding from NSF EIA-0196217; free for commercial use), clips 07_12 (brisk walk) and 09_11 (run), and since 3D.191 the carrying walk (`carry_walk`: the legs and body of clip 35_17, a gentle jog, leaning back, arms as before), fitted with `tools/art/mocap/retarget.py` and put in the model files with `tools/art/inject_clips.mjs`. The recordings themselves are not in the repo (GitHub: `sfd158/cmu-mocap`, folder `data/`). Every survivor animation can be watched on the Survivor test page (3D.190: title screen → Survivor test, or `?svt=1`), which marks each one as a real recording or an old hand-made one. Since 3D.192 also the four weapon movements (`melee_hold_walk`, `melee_hold_jog`, `gun_hold_walk`, `gun_hold_jog`: the same walk and jog, the weapon arm kept from the old clip). Since 3D.193 also `idle` (standing: upper body from clip 113_21, legs solved by the tool's standing mode, `ZH_STAND=1 ZH_SWAY=.3`). Since 3D.194 six more standing poses have the recorded body and solved legs with their old arm movements kept (`carry_idle`, `talk`, `wave`, `melee_hold_idle`, `gun_hold_idle`, `gun_reload`; `ZH_OLDTIME=1 ZH_KEEP=upperarm,forearm,hand,fingers`, and `ZH_FEET=old` for the two stances and the reload, which keep one foot forward). Since 3D.197 `run` is a recorded run (clip 78_12). The melee swings (`melee_swing_a` to `_d`) are the old hand-made ones, corrected in 3D.201 by `tools/art/b3d/fixswing.py` so that the weapon, hands and elbows stay out of the head and the feet stay on the ground; since 3D.202 the tool also gives the free arm a natural counter-movement, and since 3D.203 it re-spreads the timing so the weapon never turns faster than 1,150 degrees a second (no jump between two screen frames). Since 3D.205 every swing starts and ends in the game's stance (`tools/art/b3d/dumpstance.py` reads it from the game's file; `ZH_STANCE_JSON`), and `melee_swing_c` is a new rising cut made by the same tool (`ZH_RISE=1`: the weapon arm is posed by hand from low on the right, up across the body, on the old clip's body). Since 3D.206 the tool also keeps the weapon out of the body (one rounded tube per limb and the trunk, sized from the model; the wrist turns where the arm cannot clear its own forearm), checked independently on the real mesh by `tools/art/b3d/bodyhit.py`. `melee_swing_d` (overhead) is still in the file but the game no longer plays it (kept for the two-handed set, W84) (3D.198 had replaced them with recorded sword cuts from clip 02_09; the owner found those weak). Since 3D.207 there are six two-handed animations (`melee2h_hold_idle`, `melee2h_swing_a` to `_c`, `spear_hold_idle`, `spear_stab`): the bodies of real recordings (A baseball swing 124_07; since 3D.208 B the same swing mirrored, `ZH_MIRROR=1`; C chopping wood 79_01 with the weapon lifted overhead and slammed down by hand, `ZH_TWOHAND=slam`; the spear stance and stab a boxer's guard and lunge, 13_17), the weapon along the line between the recorded hands and the left hand put on the handle every frame (`tools/art/mocap/retarget.py` with `ZH_WDIR=1 ZH_FACEHIPS=1`, then `tools/art/b3d/fixswing.py` with `ZH_TWOHAND`), checked with the real weapon models from `gear_weapons.glb` (`tools/qa/twohand_check.sh`). The other 51 animations are still formulas (`tools/art/b3d/anims.py`) and are being replaced one at a time (W63).

## 2. Zombies
All 24 are **in game**. They are the owner's models; the current set went in with 3D.126 (12 Nov). They were rigged with the tools in `tools/art/b3d/` (`ai_model.py`; the dog with `ai_dog.py`) and shrunk with `tools/art/compress_glb.mjs`. The raw models are not in the repo. All files are in `assets/characters/ai3d_v2/`.

| Zombie | File(s) | Note |
|---|---|---|
| Walker | `zombie_walker.glb`, `zombie_walker_f.glb` | male and female |
| Runner | `zombie_runner.glb`, `zombie_runner_f.glb` | male and female |
| Crawler | `zombie_crawler.glb`, `zombie_crawler_m.glb` | female and male; legs cut off below the hip in 3D.185 (owner, 17 Nov) with `tools/art/cut_legs.mjs` |
| Burnt | `zombie_burnt.glb`, `zombie_burnt_f.glb` | male and female |
| Brute | `zombie_brute.glb` | |
| Alpha | `zombie_alpha.glb` | |
| Bloated | `zombie_bloated.glb` | |
| Spitter | `zombie_spitter.glb` | |
| Thrower | `zombie_thrower.glb` | |
| Sporehead | `zombie_sporehead.glb` | |
| Screamer | `zombie_screamer.glb` | |
| Riot zombie | `zombie_riot.glb` | helmet and pads are part of the model |
| Lasher | `zombie_lasher.glb` | |
| Rot Bomb | `zombie_rotbomb.glb` | |
| Dog | `zombie_dog.glb` | four-legged rig |
| Boss: Stalker | `zombie_stalker.glb` | from the owner's Gemini sheet (3D.86) |
| Boss: Mutant | `zombie_mutant.glb` | |
| Boss: Bloater Queen | `zombie_queen.glb` | |
| Boss: Butcher | `zombie_butcher.glb` | |
| Boss: Gatling Boss | `zombie_gatling.glb` | the one zombie with a weapon (owner, 16 Nov) |

The owner sent `Gatling_Boss.glb`, `Butcher.glb` and `Bloated_Queen.glb` again on 17 Nov: they are the same raw models these three were made from, so nothing was rigged again. All five bosses have a card on the Zombie test page since 3D.185.

Sizes in the game (3D.185, owner): the Walker is drawn the same height as a survivor, the Lasher 1.6 times its model (chest at the top of a survivor's head), the Leaper 1.2 times. Since 3D.188 the Bloater Queen is drawn at 1.55 and the Butcher at 1.4 (owner: a bit smaller).

### New zombie models: on the Zombie test page only (3D.182, 16 Nov)
Eleven models the owner delivered on 16 Nov. They are rigged, in `assets/characters/ai3d_v2/` and loaded by the game, but **only the Zombie test page shows them** (title screen → Zombie test, or `?zoo=1`). No zombie in a real game wears them yet. Each will be a **new kind of zombie** with its own name, strength and trick (owner, 16 Nov); the tricks are not decided (W48 in `05-NOW.md`, Planning chat). On the test page each stands in as a Walker (the Stag as a Dog) wearing the new model. Since 3D.183 the test page shows one zombie at a time, turning, with Stand / Walk / Run / Attack played on the spot and (3D.184) a survivor beside it for size. None carries a weapon.

Made from the owner's raw Tripo models (one unrigged mesh of 0.7 to 1.1 million triangles each; on the owner's PC, not in the repo) by `tools/art/b3d/kit/zombie.sh` (two-legged) and `tools/art/b3d/ai_stag.py` (the Stag). Each is 20,000 triangles with the same skeleton and 35 animations as the other zombies; the Stag is 16,000 triangles on the Dog's four-legged skeleton with 5 animations, drawn 1.2 times its delivered size.

| Model | File | Raw file as delivered | Look |
|---|---|---|---|
| Digger | `zombie_digger.glb` | `Digger.glb` | big miner: hard hat with a lamp, orange overalls |
| Lineman | `zombie_lineman.glb` | `Lineman.glb` | hard hat, hi-vis vest, tool belt, work gloves |
| Splitter | `zombie_splitter.glb` | `Spliter.glb` | two halves stitched down the middle, one green, one purple |
| Stag | `zombie_stag.glb` | `Stag.glb` | zombie deer with antlers, ribs showing; four-legged |
| Bile Spewer | `zombie_bilespewer.glb` | `Bile_Spewer.glb` | swollen yellow-green head and throat, bile down the front |
| Hazmat | `zombie_hazmat.glb` | `Hazmat.glb` | yellow hazmat suit, hood down |
| Leaper | `zombie_leaper.glb` | `Leaper.glb` | lean, barefoot, torn red hoodie vest, long legs |
| Listener | `zombie_listener.glb` | `Listener.glb` | head and eyes wrapped in bandages, big ears, barefoot |
| Nurse | `zombie_nurse.glb` | `Nurse_Zombie.glb` | female, teal scrubs, face mask pulled down |
| Soldier (male) | `zombie_soldier_m.glb` | `Solider_Male.glb` | army helmet and uniform |
| Soldier (female) | `zombie_soldier_f.glb` | `Solider_Female.glb` | army helmet with red crosses, uniform |

## 3. Armour models and faction kits
All 27 are **in game**. Each is `assets/characters/ai3d_v2/armor_<id>_m3.glb`, made from the owner's Tripo model by `tools/art/b3d/kit/runspec.sh <id>`. The recipe for each is in `tools/art/b3d/fits/<name>_tripo.json` (joints) and, for the 14 newest, `tools/art/b3d/fits/specs.json` (what to cut, keep and hold rigid). The Tripo `.glb` itself is on the owner's PC, not in the repo.

**Faction kits** (raiders and faction people only; survivors can't wear them and they never drop):
| Kit | id | Built in |
|---|---|---|
| The Toll Kings | `toll` | 3D.142 |
| Quarantine Command | `quar` | 3D.142 |
| Helix Biotech | `helix` | 3D.142 |
| Greenwater Commune | `green` | 3D.142 |
| The Foundry | `foundry` | 3D.141, replaced by v2 in 3D.144 |
| The Hollow | `hollow` | 3D.144 |

**Armour the player can wear:**
| Item | id | Batch | Tripo source name |
|---|---|---|---|
| Riot Vest | `riot` | first one (3D.99) | riot |
| Life Jacket | `lifejacket` | 1 (3D.148) | lifejacket |
| Football Pads | `footpads` | 1 | football |
| Hawaiian Shirt | `hawaii` | 1 | hawaii |
| Beekeeper Suit | `beekeeper` | 1 | beekeeper |
| Cookware Cuirass | `cookware` | 1, refitted 3D.156 | cookware2 |
| Bubble Wrap | `bubblewrap` | 2 (3D.149), refitted 3D.156 | bubblewrap2 |
| Cardboard Box Armour | `cardboard` | 2 | cardboard |
| Mattress Vest | `mattress` | 2 | mattress |
| Phone Book Armour | `phonebook` | 2 | phonebook |
| Tyre Armour | `tyre` | 2 | tyre |
| Pillow Armour | `pillow` | 3 (3D.150) | pillow |
| Ski Suit | `skisuit` | 3 | skisuit |
| Duct Tape Suit | `ducttape` | 3, refitted 3D.156 | ducttape2 |
| Barrel Armour | `barrel` | 3 | barrel |
| Goalie Pads | `goalie` | 3, refitted 3D.156 | goalie2 |
| Chef's Whites | `chef` | 4 (3D.154, items in 3D.155) | chef |
| Field Medic Vest | `medic` | 4 | medic |
| Mechanic's Coveralls | `mechanic` | 4 | mechanic |
| Garden Overalls | `garden` | 4 | garden |
| Builder's Hi-Vis | `hivis` | 4 | hivis |

The soft parts of these (shirts, sleeves, trousers, gloves, boots, checks, flowers) are not modelled. They are painted on the survivor by code (`PAINT3D`, `SUIT3D` in `js/render3d.js`).

## 4. Armour items with no model yet (waiting for art)
These 14 are in the game and can be found and worn, but have no model of their own. A survivor wearing one gets a shirt colour and the old grey plates (plain stand-in pieces built into the survivor model).

| Item | id | Kind of work |
|---|---|---|
| Hockey Pads | `hockey` | hard pieces: Tripo model |
| Kevlar Vest | `kevlar` | hard pieces: Tripo model |
| Military Armor | `military` | hard pieces: Tripo model |
| Scrap Plate | `plate` | hard pieces: Tripo model |
| Tactical Vest | `tactical` | hard pieces: Tripo model |
| SWAT Armor | `swatarmor` | hard pieces: Tripo model |
| Hazmat Suit | `hazmat` | full suit (like the Beekeeper Suit): Tripo model for the hard parts, the suit painted |
| Firefighter Coat | `firecoat` | coat painted; Tripo model only if it gets hard parts (air tank, buckles) |
| Ghillie Suit | `ghillie` | shaggy shape: Tripo model |
| Work Jacket | `jacket` | soft clothing: Tripo model later (owner, 16 Nov) |
| Leather Jacket | `leather` | soft clothing: Tripo model later (owner, 16 Nov) |
| Biker Leathers | `biker` | soft clothing: Tripo model later (owner, 16 Nov) |
| Hoodie | `hoodie` | soft clothing: Tripo model later (owner, 16 Nov) |
| Raincoat | `raincoat` | soft clothing: Tripo model later (owner, 16 Nov) |

**Batch 5** (owner, 16 Nov): Hockey Pads, Kevlar Vest, Scrap Plate, Military Armor, SWAT Armor. Next step: the three-view sheets. The five soft ones will also be built in Tripo, later (owner, 16 Nov); they are not painted in code.

## 5. Weapons
| File | What | Status | Source |
|---|---|---|---|
| `assets/characters/ai3d_v2/gear_weapons.glb` | 24 weapon models in one file | **In game** | Built in Blender by `tools/art/b3d/gear3d.py` (3D.94); no outside model |

In it: Lead Pipe, Kitchen Knife, Crowbar, Nail Bat, Machete, Scrap Spear, Fire Axe, Sledgehammer, Katana, Revolver, Shotgun, SMG, Hunting Bow, Crossbow, Golf Club, Hatchet, Cleaver, Shovel, Road Sign, Spiked Club, Magnum, plus three size references (bat, pistol, rifle).

Four weapons use the models built into the survivor file instead: Baseball Bat, Pistol, Hunting Rifle and Assault Rifle. The survivor file also carries the things people hold at work: hammer, hoe, wrench, plank, bowl, crate.

## 6. Buildings and town
| File | What | Status | Source |
|---|---|---|---|
| `assets/buildings/ai3d/house/house_realtime.glb` | The old House | Loaded, not shown in a new town: the House is an old building type that can't be built any more (Housing replaced it); it only appears in a save that still has one | Hunyuan3D from `house/source/house_chatgpt.png` (ChatGPT drawing) → `tools/art/b3d/export_prop3d.py` |
| `assets/buildings/ai3d/medic/medical_tent_realtime.glb` | Old Medical Tent model | Loaded, not shown: retired in 3D.41, the tent is drawn by code now | Hunyuan3D from `medic/source/medical_tent_ref.png` → `medic/source/medical_tent.glb` → `export_prop3d.py` |

Every building the player can build, the walls, gates, fences, trees, rocks, wrecks, carts and vehicles are built from simple shapes in `js/render3d.js`. There are no building kits in `assets/`; the faction camps reuse the same code-built buildings.

## 7. Icons and UI pictures
| File | What | Status | Source |
|---|---|---|---|
| `assets/ui/icons.png` + `icons.json` | Old pixel menu icons (10) | Loaded, not shown: the Glass UI draws its own | `tools/art/build_ui_icons.py` |
| `assets/items/icons.png` + `items.json` | Old pixel item icons (33) | Loaded, not shown: all 87 items have a drawn icon | `tools/chars/items.py` |
| `assets/ui/build.png`, `items.png`, `survivors.png` | Old pixel sheets from the 2D game | Archive | `tools/chars/` |
| `assets/ui/emotes/emotes.png` + `emotes.json` | 13 animated emote bubbles | Archive (emotes are drawn by `js/icons.js` now) | ChatGPT sheet `tools/art/sources/emotes_chatgpt_src.png` → `tools/art/emote_anim.py` |

The icons the player actually sees are not files:
- **UI icons**: 109 sticker icons, hand-written in `js/icons.js` (resources, buttons, weather, moods, alerts).
- **Item icons**: 87 icons, one for every weapon, armour, hat and accessory, hand-written in `js/itemicons.js`.

## 8. Sound and fonts
All 212 sound files are **in game**, loaded by `js/sound.js`. The music itself is written by the game; these are the instrument samples it plays. Credits and licences: `assets/audio/CREDITS.txt`.

| Folder (`assets/audio/…`) | Files | What | Source |
|---|---|---|---|
| `fid`, `gtr`, `nyl`, `bass`, `banjo`, `harp`, `vibes`, `tpt`, `str`, `mbox`, `whis`, `ep`, `cello`, `brass`, `timp`, `piano` | 188 | 16 instruments (fiddle, two guitars, bass, banjo, harp, vibes, trumpet, strings, music box, whistle, electric piano, cello, brass, timpani, piano) | FluidR3 GM sound font by Frank Wen, CC BY 3.0 |
| `kit` | 10 | Drums: cajon ×2, shaker ×2, clap, snare, hat, kick, tom, ride | Versilian Community Sample Library, CC0 |
| `sfx` | 14 | Axe chop, wood hits ×9, metal hits ×3, a plucked jingle | Kenney audio packs, CC0 |

Every other sound effect (hits, alerts, the radio noise, zombie sounds) is made by code in `js/sound.js`, with no file.

Fonts (`assets/fonts/`, 11 files, all loaded by `index.html` or `css/glass.css`): Manrope 600 / 800, Nunito 700 / 800, Fredoka 500 / 600, Lilita One, Bangers, Comic Neue regular / bold, Jersey 15. All under the Open Font Licence (the four `*-OFL.txt` files).

## 9. Archive: deleted 16 Nov
The owner said to delete the left-overs (W44). Removed from the branch in the 3D.183 commit: 3,076 files, 196 MB. They are still in the git history (last present in commit f9cffde), so they can be brought back.

| Was | Files | What |
|---|---|---|
| `assets/characters/ai3d_male/full150`, `armor150` | 1,456 | 2D sprite frames of the old man, from before the game went 3D |
| `assets/characters/ai3d_farmer/` | 1,474 | The first AI-model test (the Farmer): sprite frames, pixel versions, its Blender file, two test pages |
| `assets/characters/ai3d_male/*.html` | 2 | Old survivor and equipment test pages |
| `assets/characters/b3d/`, `ink3d/` | 43 | Early Blender-made characters and the ink-style walk test |
| `assets/mockups/` | 64 | Style and look pictures from the art direction rounds |
| `assets/buildings/ai3d/medic/rot*_f*.png`, `anchor.json`, `source/style_options.png` | 34 | Old 2D pictures of the Medical Tent and its style picker sheet |
| `assets/town3d/` | 3 | The first 3D town test page |

Kept, though the game does not show them: the old survivor models and `male_rig.blend` (section 1), the old House and Medical Tent models (section 6) and the old pixel icon sheets (section 7).

## 10. Things the code asks for that are not there
Neither breaks the game, because the code falls back quietly. Tidying them up belongs in the Bugs or Code clean-up chat.
- `assets/ui/stats.png`: asked for by the field notes code; the file was never made. The Glass UI uses the sticker icons instead.
- `assets/map/v7/wreck.png`: named in the wreckage code; the folder does not exist. Wrecks are drawn by code.

## Where source art lives
- **Tripo sheets and Tripo models**: the owner's PC, `Desktop\Zombie Haven\Tripo\ZombieHaven_Tripo_Pack\ZombieHaven_Tripo_Pack\4_equipment` (sheets saved as `zombie-haven-<item>-1-front.png`, `-3-right-side.png`, `-4-back.png`).
- **The armour sheet prompt**: `tools/chatgpt/armor_sheet_prompt.md`.
- **Fit recipes**: `tools/art/b3d/fits/`.
- **How a Tripo model becomes in-game armour**: `tools/README.md`, "Armour pipeline".
- **Old ChatGPT building pictures** (2D era): `tools/art/sources/`.

## Survivor animation review (17 Nov, nothing changed yet: W63)
All 46 survivor animations were drawn as picture strips and measured (`tools/art/b3d/animdump.py`, `tools/art/b3d/strips.py`). They are made by formulas in `tools/art/b3d/anims.py` and saved inside each survivor model.

Wrong:
- **All walks** (walk, walk_f, carry_walk, rescue, melee_hold_walk, gun_hold_walk): the knee never gets straighter than 20 to 25 degrees, the step is too long (half the body height) and the body rides low. Cause: `walk_legs` keeps at least 26 degrees of knee bend on purpose.
- **Standing poses** (idle, carry_idle, talk, wave, work_barricade, gun_hold_idle, gun_reload, pistol_fire, hurt): knees bent 18 to 35 degrees while standing still. Cause: `soft_legs`.
- **Feet sink into the ground**: punch (11 cm), knockdown (11), limp_walk (9), pickup (9), grabbed (8), melee swings a to d (7), gun_hold_hurt (7).
- **punch**: lunges so deep the head drops a quarter of the body height.
- **work_barricade**: arms held out, almost no movement.

**Corrected the same day** (the owner saw swings going through the head; the first review drew the body with empty hands, so it missed this). Checked again with the weapon in the hand, 33 moments per clip (`tools/art/b3d/weapdump.py`):
- **Weapon and hand go through the head**: melee_swing_a, melee_swing_c and all six combos (the bat is inside the head for a tenth to a third of the clip; the right hand passes 4 cm from the middle of the head). melee_swing_d: the hands and elbows press into the back of the head on the wind-up.
- **Melee wind-up**: both fists come up in front of the face like a boxer while the bat hangs behind the head; nobody swings a bat like that. The follow-through drags the bat along the ground.
- **gun_fire**: the rifle is held out at chest height on straight arms, not against the shoulder and not at the eye, and the body leans back. **pistol_fire**: stiff straight arms, leaning back.
- Clear of the head: melee_swing_b (but the bat crosses 12 cm in front of the face), the hold and walk poses, reload.

Acceptable: run (low, but reads as a run), shove, cheer, work_chop, work_hammer, work_dig, work_tinker, sit, sit_f, eat, sleep, collapse.
