# Zombie Haven — professions, levels and skills (V2.12)

Each survivor has a **separate level (1–5) in every profession they have worked**, like DV2.
Changing profession (tap a survivor → Change profession) keeps every level and every learned skill;
the survivor picks up the new profession at whatever level they last had in it (Lv.1 if new).
Max HP follows the current profession's level (58 + 8 per level), plus any HP skills.

## Learned skills (kept forever, in every profession)
| Profession | Lv.3 | Lv.5 |
|---|---|---|
| Civilian | Quick Learner: +25% XP everywhere | Hardy: +10 max HP |
| Guard | Brawler: +3 damage per hit | Tough: +15 max HP |
| Police Officer | Steady Aim: +4 damage per hit | Armored: takes 20% less damage |
| Medic | First Aid: slowly heals when not fighting | Steady Hands: carries the wounded 30% faster, patients recover 30% faster |
| Scavenger | Light Feet: +15% walking speed | Loot Sense: more loot from scavenging and expeditions |
| Engineer | Handy: wall repairs twice as fast | Efficient: +15% output at any building they staff |
| Cook | Iron Stomach: hunger and thirst rise 20% slower | Field Rations: eating and drinking relieve 25% more |
| Farmer | Strong Back: +10 max HP, carries the wounded 20% faster | Green Thumb: +20% output at any building they staff |

## How each profession earns XP
- **Everyone:** using town buildings (+0.5), expeditions (+3 per finished stage), rescuing someone (+4).
- **Staffed jobs** (Farmer at farms, Engineer at water, Medic at medical, Cook at the canteen):
  +2 per game hour on shift, +1 at the end of a shift, and +1 for every survivor they serve
  (+3 for every patient treated).
- **Fighters** (Guard, Police Officer, Scavenger): +0.5 per hit, +2 per kill. Scavengers also +2 per supply run.
- XP always goes to the survivor's **current** profession.

## Fighters and non-fighters
- Fighters (Guard, Police Officer, Scavenger) look for zombies, defend survivors under attack first,
  and gang up on the same zombie. When hurt (<60% HP) they only step in to defend someone; outnumbered
  (3+ zombies) and hurt, they fall back to the medical building.
- Non-fighters (Civilian, Medic, Engineer, Cook, Farmer) run into the nearest enclosed building when a
  zombie comes close, stay hidden until the area is clear, and only fight back when cornered.
