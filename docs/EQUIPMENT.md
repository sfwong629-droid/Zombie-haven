# Zombie Haven: equipment list and balance (V3D.16)

Four slots per survivor: **Weapon, Armor, Hat, Accessory**. Everyone starts bare-handed; whatever you equip shows on the 3D model (weapons in hand, heavy armor as the armored body, hats on the head).

Cost is in parts (the same cost drives crafting: `ceil(cost × 1.3) + 1`).

## How the balance test works

The test is a Python copy of the game's combat formulas, in `tools/balance/sim2.py` (`python3 sim2.py items.json out.json`; hats and accessories: `acc.py`). A level-3 Guard (all stats 5) fights 5 set fights, 300 runs each:

| Fight | Enemies |
|---|---|
| S1 | 1 walker |
| S2 | 3 walkers arriving together |
| S3 | 2 runners |
| S4 | brute + 2 walkers |
| S5 | 1 raider |

**Power** = (1 / time to clear) × share of health kept × win rate, averaged over the 5 fights.

**Rule:** an item may not beat the cost curve `power ≈ 0.075 + 0.0085 × cost` by more than 10%. Pricier means better, but never by more than you paid.

Hats and accessories are small bonuses, so a second test smooths out "lucky hit" breakpoints. It averages zombie toughness from ×0.8 to ×1.6 and damage bonus from 2.2 to 3.8, and measures each item's gain in % per part.

### What changed

- **Before:** guns were 2–6× stronger than melee for the same cost (range was free). Low armour did nothing, because damage was rounded down.
- **After:**
  - Guns have real-style magazines and reloads.
  - Weapons carry their own attack speed.
  - Zombie hits use fair rounding, so every point of armour counts.
  - Every weapon is within ±10% of the curve.

## Weapons

`rate` is time between attacks: lower means faster (1.0 = normal).

### Melee

| Weapon | Type | ATK | Speed | Cost | Notes |
|---|---|---|---|---|---|
| Fists | — | — | normal | 0 | Everyone starts here |
| Lead Pipe | blunt | 5 | normal | 1 | |
| Kitchen Knife | blade | 1 | fast (.7) | 2 | Many small cuts |
| Baseball Bat | blunt | 16 | normal | 4 | Reference weapon |
| Crowbar | blunt | 20 | normal | 5 | |
| Machete | blade | 14 | fast (.8) | 6 | |
| Nail Bat | blunt | 20 | normal | 6 | |
| Scrap Spear | blade | 27 | normal | 7 | +1 PER |
| Fire Axe | blade | 32 | slow (1.15) | 9 | −1 AGI |
| Sledgehammer | blunt | 36 | slow (1.45) | 11 | −2 AGI |
| Katana | blade | 32 | fast (.7) | 15 | Best melee |

### Ranged

Magazine sizes and reload times follow the real guns: one magazine swap, a speed-loader, or shells loaded one at a time. A few are rounded to suit a 60-tick game.

| Weapon | ATK | Range | Magazine | Reload | Cost | Real-world basis |
|---|---|---|---|---|---|---|
| Hunting Bow | 18 | 4.2 | — (nock per shot) | — | 7 | Slow draw (rate 1.6), +1 PER |
| Pistol | 7 | 3.4 | 12 | 1.8 s | 8 | Mag swap (about 1.5–2 s) |
| Revolver | 16 | 3.6 | 6 | 3.0 s | 10 | 6-shot cylinder, speed-loader |
| Crossbow | 34 | 4.6 | 1 | 2.4 s | 11 | Cock and load a bolt every shot |
| Hunting Rifle | 30 | 4.8 | 5 | 3.0 s | 12 | Bolt-action, 5-round box |
| Shotgun | 34 | 2.4 | 6 | 4.5 s | 13 | Pump tube, about 0.75 s per shell; −1 AGI |
| SMG | 1 | 3.6 | 30 | 2.5 s | 13 | 30-round stick mag, very fast fire |
| Assault Rifle | 8 | 4.4 | 30 | 2.6 s | 18 | 30-round mag, fast fire |

**Reload in the game:**
- When the magazine runs dry, the shooter stops firing for the reload time. Zombies can still hit them.
- The gun tips down and rattles, and a small ring over their head fills up and shows the magazine size. Then a 👌 bubble shows.
- In a lull between fights, a gun that is half empty or less gets reloaded early, like a real tactical reload. The rounds already in it are kept until the reload finishes.
- Reloads keep counting down while walking or chasing, just not while swinging or firing.

## Armor (body)

Each point of DEF cuts 3% of zombie and raider damage. Damage reduction is capped at 60% in total, including the hat. Every part spent saves about 3 HP over the test fights.

| Armor | DEF | Cost | Notes |
|---|---|---|---|
| Work Jacket | 2 | 2 | |
| Leather Jacket | 4 | 4 | |
| Hockey Pads | 5 | 5 | −1 AGI |
| Biker Leathers | 5 | 6 | +1 CHA |
| Riot Vest | 7 | 7 | −1 AGI; shows as armored body |
| Kevlar Vest | 8 | 10 | Armored body |
| Scrap Plate | 10 | 11 | −2 AGI |
| Military Armor | 11 | 14 | −1 AGI |

## Hats

Hats show on the head in 3D. Soft hats give a stat; helmets give DEF.

| Hat | DEF | Bonus | Cost | Gain / part |
|---|---|---|---|---|
| Bandana | 0 | +1 CHA | 1 | (social) |
| Baseball Cap | 0 | +1 PER | 3 | 2.2% for gunners |
| Beanie | 0 | +1 END | 2 | 0.6% (+ stamina) |
| Straw Hat | 0 | +1 CHA, +1 END | 2 | 0.6% (+ social) |
| Hard Hat | 2 | — | 2 | 1.1% |
| Bike Helmet | 3 | — | 3 | 1.1% |
| Football Helmet | 4 | −1 PER | 5 | 0.9% melee, worse for gunners |
| Army Helmet | 5 | — | 6 | 0.8% |
| Riot Helmet | 6 | −1 PER | 7 | 0.9% melee, worse for gunners |

## Accessories

| Accessory | Bonus | Cost | Gain / part |
|---|---|---|---|
| Lifting Gloves | +2 STR | 3 | 2.9% (melee) |
| Back Brace | +2 END | 3 | 0.8% (+ stamina, work) |
| Running Shoes | +2 AGI | 3 | 1.1% (+ faster) |
| Scope Goggles | +2 PER | 5 | 2.8% (guns) |
| Reading Glasses | +2 INT | 3 | No combat effect (research and work) |
| Lucky Charm | +2 CHA | 3 | No combat effect (social, trading) |
| Dog Tags | +1 STR, END, PER | 6 | 1.2% |

### Balance fixes from this test

- **Scope Goggles:** cost raised from 3 → 5. At 3 they gave gunners +14% for 3 parts, which made them the strongest buy in the game.
- **Baseball Cap:** cost raised from 2 → 3. At 2 it gave +6.5% to gunners.
- **Hat costs** (hard hat 2, bike 3, football 5, army 6, riot 7) were set so a point of DEF costs the same in a hat as in body armour.
- **Glasses, charm, bandana:** these stay non-combat on purpose. Their value is in work, research and social stats.

## Where items come from

- **Armory stock**
  - Weapons: knife, bat, crowbar, machete, pistol, bow.
  - Armor: jacket, leather, hockey, riot.
  - Hats: bandana, cap, beanie, hard hat, bike helmet.
- **Crafting, unlocked by research**
  - Blades: machete, nail bat, spear, axe, sledge, katana.
  - Firearms: pistol, revolver, rifle, shotgun, crossbow, SMG.
  - Body armor: biker, riot, kevlar, plate, military, plus the football, army and riot helmets.
- **Expedition loot pool:** now also drops straw hats, army helmets and football helmets.
