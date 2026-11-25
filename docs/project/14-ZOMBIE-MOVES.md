# Zombie Haven: zombie moves and backstories

**Draft, 21 Nov 2026 (Art chat). **The moves are approved** (W190, 21 Nov: "all the other one are good"; the Gatling Boss also gets a long-range gatling shooting animation). The backstories' direction is approved (W191, 21 Nov: "yes similar to that"); the Story chat settles each one (`09-STORY.md`, 10.2, W192). Built so far: the Dog's and the Stag's gallop (3D.256, W193); the Bloater Queen's arms, sweep and slam (3D.257, W199); the Bloated's (3D.267, W200); the Walker's grab and bite (3D.276, W204). Everything else: previews for review (W216); the overnight run was cancelled by the owner, so none are made yet.**

Owner, 21 Nov: "Most of the zombie are using one arm hit attack. Can you think of some animation for each one? Like leaper will need a jump animation. Digger will need a dig animation. Splitter need to actually split in half. … We might have to tie some of these zombie to the stories. Think of backstories for them."

## The idea
What a zombie was decides how it moves. Each kind gets **one signature move** that shows who it was, in place of the shared one-arm swipe. The backstories all come from the story in `09-STORY.md` (Forever Fresh tins, Freshlock, Sunnyside, Helix, Quarantine Command, the Foundry, the highway): **the more Freshlock a person ate, the better kept and the stronger they are as a zombie.**

The backstories are a first draft from the Art chat. **The Story chat owns the story**: it checks them against `09-STORY.md` and puts the approved ones there.

## How they would be built
- Every move is made by hand on the zombie's own model (the recording library has no zombies worth copying), shown to the owner as a sheet first, one zombie per build, each with a check.
- A move that changes what a zombie **does** (jumping a wall, tunnelling, splitting, raising the fallen) needs game rules too: those are the tricks approved on 17 Nov (`02-DECISIONS.md`, "Zombies") and are built in the Features chat. The Art chat makes the animation and, for the Splitter, the two half models.
- No zombie gets a weapon (the Gatling Boss is the exception, as he is).

## The zombies in the game today
| Zombie | Who it was (draft) | Signature move | Today |
|---|---|---|---|
| Walker | An ordinary shopper: ten years of tins from the corner shop | **Grab and bite**: both arms reach, clamp on, the head lunges in | one-arm swipe |
| Runner | Young and fit, turned by bites not by tins, so the body is fresh and fast | **Running tackle**: throws itself at the target with both arms, without slowing | one-arm swipe |
| Crawler | Cut in two on the highway, by the lorries that carried the tins | **Ankle grab**: hauls itself up the leg hand over hand and bites | a paw at the air |
| Burnt | Caught in the fires of the first week, when Sunnyside burned its dead | **Flailing rush**: both arms beat wildly, the body twists as if still on fire | one-arm swipe |
| Brute | A Foundry cannery loader: double rations for heavy work | **Hammer blow**: both fists raised overhead and brought down | its own heavy swing (kept, made two-fisted) |
| Alpha | The first to get up in a place; the others follow it. (The Toll Kings' old King, who got up at his own wake, is one.) | **Roar, then a backhand**: chest out and arms wide, then a sweeping blow that knocks people back | the Brute's swing |
| Bloated | Ate the swollen, dented tins nobody else would | **Belly slam**: arms thrown wide, the whole body falls forward onto the target; **walks with the arms swinging wide** for balance | arms hang still (owner: "no arms movement at all") |
| Bloater Queen (boss) | Sunnyside's canteen cook: free tins three times a day for ten years | **Sweep and slam**: one wide two-arm sweep, then the belly slam; the same swinging walk, slower | arms hang still |
| Spitter | A taster on Sunnyside's quality line: a throat full of Freshlock | **Hack and spit**: hands on the knees, the head rears back, the spit goes out in an arc | bends a little |
| Thrower | The pitcher of the Sunnyside works baseball team | **A real pitch**: leg kick, wind-up, overarm throw | a survivor's bat swing |
| Sporehead | Worked in the plant's powder room; dried Freshlock dust puffs from the cracked skull. (**For the Story chat:** the story has no fungus; rename it "Dusthead"?) | **Head shake, then claws**: shakes a cloud loose, then two quick claws | close to this already |
| Screamer | Sunnyside's shift-siren operator | **A full scream**: arms thrown back, chest forward, head up, the whole body shaking | only bends forward |
| Riot zombie | Quarantine Command riot police from the cordon | **Shoulder charge**: three driving steps and a body check | one-arm swipe |
| Lasher | A volunteer in Helix's first Unlock trial: the limbs kept growing | **Claw swipe** (owner, 24 Nov: "just do a regular attack", then "Yes it's ok for lasher"; today's whip, the lasso and the fishing cast turned down): the long arm drawn back, swept across at full reach, the clawed hand pulled in; the trouser fault fixed in 3D.254 | lash |
| Rot Bomb | A tin that swelled and never burst, in the shape of a man | **Clutch and swell**: both arms hug the belly as it grows (kept), with a hurried waddle | swell |
| Dog | Guard dogs and pets fed on tin scraps | **Lunge and shake**: jumps at the arm, bites and shakes its head; **the run is a real gallop, one foot landing at a time** (owner: "the dog leg run is not natural"; built in 3D.256) | stiff legs |
| Stalker (boss) | Helix's first Unlock test subject; it carries the prototype (the vaccine it drops) | **Punch and kick** (kept) | punch and kick |
| Mutant (boss) | Helix "Phase 2": an overdose of concentrate | **Double smash** (found 25 Nov: the game never played it for him, only for the Stalker; owner, 25 Nov: "W216 double smash": it becomes his attack when built) | the shared one-arm hit (`zombie_attack`); `smash` sits unused in his file |
| Butcher (boss) | Foreman of Sunnyside's meat line | **Chopping forearm**: the arm comes down like a cleaver, three times, each lower | the Brute's swing |
| Gatling Boss | A Quarantine Command heavy gunner on Ration Pack Forever; the gun grew into the arm | **Braced fire, at long range** (owner, 21 Nov): the barrels spin up, feet wide, leaning into the kick, a long burst with the gun sweeping left and right | stands frozen in a walking stride |

## The eleven new kinds (and the Delivery Driver)
Their tricks were approved on 17 Nov; the move shows the trick.
| Zombie | Who it was (draft) | Signature move (and the trick it shows) |
|---|---|---|
| Leaper | A Sunnyside street kid: free school meals from a tin, every day | **Jump**: crouches, springs over a fence or low wall, lands in a crouch; attack: a **pounce** onto the target |
| Digger | A quarry man who ate his lunch tin underground for ten years | **Dig**: both arms scoop, the body sinks into the ground; **burst**: comes up through the mound with both arms overhead and brings them down |
| Splitter | A Helix subject given two different doses, one down each side | **Splits in half** when killed: the body tears along the seam and the two halves hop and drag themselves on (needs the model cut into two); alive, the two arms strike out of time with each other |
| Stag | A deer that dug up the tins people buried | **Charge**: head down, a straight run, a toss of the antlers; its run is the Dog's gallop (3D.256) |
| Bile Spewer | A vat cleaner at the plant, who breathed concentrate for years | **Spray**: bends double, hands on the belly, a stream swept from side to side |
| Lineman | Kept the plant's lights on; still goes to the power | **Tear down**: grips a cable or a fence with both hands and wrenches it |
| Listener | A Forever Fresh Radio fan who never switched it off; blind now, it turns to any sound | **Listen**: the head tilts, an ear turns to the noise, the hands feel the air; then a **frantic two-handed flurry** when it finds someone |
| Hazmat | The clean-up crew sent into Sunnyside in the first week | **Stiff shove**: a clumsy two-glove push, walking stiff in the suit |
| Nurse | Staff of Sunnyside's clinic, who treated the "product issue" first | **Raise**: kneels by a fallen zombie, pumps its chest, pulls it up by the arm; her own attack is a weak scratch |
| Soldier (male) | Quarantine Command troops on Ration Pack Forever (`09-STORY.md`, C13) | **March and barge**: advances in step, shoulder first, then bites. No gun |
| Soldier (female) | The squad's medic | **Tend**: drags a wounded zombie back and pats it down; a short shove as attack. No gun |
| Delivery Driver | A Route 9 driver still on his round (`09-STORY.md`) | **Ram**: runs the trolley into the target |

## Order (owner, 21 Nov, W196: "keep the order")
One zombie per build, each shown as a sheet first. The zombies seen most come first.

**The zombies in the game today**
1. ~~**Dog and Stag: the run as a real gallop**~~ (3D.256).
2. ~~**Bloater Queen**: arms swinging wide in the walk; a wide two-arm sweep, then the belly slam~~ (3D.257). ~~**Bloated**: the same walk and belly slam~~ (3D.267, owner W200: "try b"; his shirt stretches under the arms, which are modelled joined to his belly).
3. ~~**Walker: grab and bite** (both male and female)~~ (3D.276, W204).
4. ~~**Gatling Boss: braced fire at long range**~~ preview approved 22 Nov (W216), with a gun club close-up attack, a slow heavy walk and a run with the gun carried level, and the roar (W239). Not built yet.
5. **Screamer: a full scream** (or a song, if the Story chat's W192 says it sings). Preview approved 22 Nov, with the cough (W239). Not built yet.
6. **Dog: lunge and shake.** Preview approved 23 Nov (v2: front legs bent), with the sniff and shake off (W239). Not built yet.
7. **Runner: running tackle** (both). Preview approved 23 Nov, with the bounce (W239).
8. **Crawler: ankle grab** (both). Preview approved 23 Nov, with the drag and look (W239).
9. **Burnt: flailing rush** (both). Preview approved 23 Nov; its extra move is running round in a circle, hands up (W239).
10. **Brute: two-fisted hammer blow.** Preview approved 23 Nov, with the chest pounding (W239).
11. **Alpha: roar, then a backhand.**
12. **Butcher: chopping forearm**, three times, each lower.
13. **Spitter: hack and spit.**
14. **Thrower: a real pitch.**
15. **Riot zombie: shoulder charge.**
16. **Sporehead (Souphead?): head shake, then claws** (leading with the hat, if W192 renames it).
17. **Rot Bomb: clutch and swell**, with a hurried waddle.
18. Kept as they are, checked only: the Lasher's whip, the Stalker's punch and kick, the Mutant's double smash.

**The new kinds**: each move is made when the Features chat builds that kind (the move needs its game rule):
the Stag's charge, the Leaper's jump and pounce (a hurdle, if W192 says so), the Digger's dig and burst, the Splitter splitting in half (the model cut in two), the Bile Spewer's spray, the Lineman tearing down, the Listener listening and its flurry, the Hazmat's stiff shove, the Nurse raising the fallen, the male Soldier's march and barge, the female Soldier tending, the Delivery Driver's ram (it has no model yet).

## Extra moves (W239, owner, 22 Nov: "Ok to the extra moves")
One move that is not an attack for every zombie, played every now and then or before an attack (when is a game rule, added when the moves go in). Made with each zombie's preview.
- Gatling Boss: **roar**, bent forward, both arms flung back (approved).
- Screamer: clutches its throat, coughs, a short warm-up shriek.
- Dog: sniffs the ground, then shakes itself off.
- Runner: bounces on the spot, head twitching.
- Crawler: drags itself a little, lifts its head and looks round.
- Burnt: ~~pats at its smoking arms~~ runs round in a little circle, hands up, like a cartoon character (owner, 23 Nov).
- Brute: pounds its chest with both fists.
- Alpha: waves the others on with a big arm sweep.
- Butcher: wipes its cleaver arm on its apron.
- Spitter: gargles, its head rolling.
- Thrower: picks up a rock and tosses it from hand to hand.
- Riot zombie: a stiff police "halt".
- Souphead: shakes its big mushroom hat like a dog shaking off water.
- Fizzbomb: blows up a balloon until it pops in his face (owner, 23 Nov; replaces the belly pats; approved). Pulls it from his costume, four puffs, the fourth pops it, he flinches. The game needs a small balloon model that grows over the move.
- Lasher: ~~a long, slow stretch~~ (turned down 24 Nov) a back scratch: over the shoulder to the shoulder blades, then down behind to the back of the knee (owner, 24 Nov: "1", then "the scratch is good"; `zmove_lasher.py scratch`; approved).
- Stalker: a crouch and sniff: down low, hands on the knees, nose sweeping the ground, a look round, one more sniff (`zmove_stalker.py sniff`; approved 25 Nov: "its ok next").
- Mutant: an arm crack: each arm pulled straight across the chest by the other hand with a jerk, then the neck snapped to each side (`zmove_mutant.py crack`; approved 25 Nov: "crack is ok").

## The Alpha's blade (23 Nov, W265 to W267)
The Alpha is the second zombie allowed a weapon: a big rusted blade (`tools/art/b3d/alpha_blade.py`, approved W266). He stands with it hanging, tip on the ground; walks and runs dragging it behind, the left arm swinging at his side; his attack lifts it slowly from the drag and swings it quickly across; he waves the others on with it. Previews in `tools/art/b3d/zmove_alpha.py`; **approved 23 Nov** (owner: "Looks good").
