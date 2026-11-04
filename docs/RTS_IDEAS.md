# Zombie Haven: RTS-style combat ideas (proposal, not built)

Today, fights run themselves: fighters pick targets, rally, answer SOS calls and fall back. RTS elements would let the player step in during a fight without turning the game into micromanagement. Everything below fits the existing AI: an order simply overrides the AI's choice until it is done or cancelled.

## Small (a few days each)

1. **Tap-to-command**
   - Select a fighter, then tap the ground to move there, or tap a zombie to attack it.
   - A small flag shows the order. The order ends when it is done, or after ~20 s, and then the AI takes over again.
2. **Rally point**
   - Drag a flag onto the map. All free fighters gather there and hold.
   - Good for "everyone to the east gate before the boss arrives".
3. **Stances per fighter**, set in the People panel:
   - **Aggressive:** chases further.
   - **Defensive:** stays near their post or building.
   - **Hold fire:** fights only if attacked.
   - The game already has engage ranges, posts and retreat %, so this is mostly UI.
4. **Pause and plan**
   - Tapping a fighter while zombies are in town slows time to 0.3×. You give orders, then it resumes.
   - This works well on phones (no fast clicking).

## Medium

5. **Squads**
   - Group 2–4 fighters into a named squad, with a colour ring under their feet.
   - Orders go to the whole squad. Squad members stay together and share targets.
6. **Formations**
   - **Line:** guns in front.
   - **Wedge:** melee in front, shooters behind.
   - **Circle:** protect a downed friend or the rescue cart.
   - This uses the existing "shooters keep distance" and "rally to the downed" logic.
7. **Abilities on a cooldown**, one per profession:
   - Guard: **Taunt** (zombies nearby target them).
   - Police: **Flashbang** (stuns for 2 s).
   - SWAT: **Breach** (bonus damage to a brute or boss).
   - Medic: **Field patch** (heal 25%).
   - Engineer: **Quick barricade** (temporary wall on 2 tiles).
   - Each shows as a round button on the selected fighter's card.
8. **Fog of war and scouting**
   - Zombies are only seen near survivors, lights and watchtowers.
   - This makes Night Owls, the dog and lit buildings matter, and pairs with the alert-radius work in V3D.17.

## Bigger

9. **Defence building as part of combat**
   - Place traps (spike strips, noise makers that pull zombies away) and turrets (crossbow turret, uses parts).
   - Zombie pathing already handles walls, so traps slot into that.
10. **Boss phases**
    - The boss telegraphs moves with a big ground circle, such as "SMASH in 2 s".
    - The player pulls fighters out of the circle (with move orders) or uses an ability.
    - This makes boss nights a short, readable RTS moment.

## Suggested first step

Do **1 + 3 + 4**: tap-to-command, stances, and slow-time while planning. Together they give real control with very little screen clutter, and the rest can build on them.

## Decision (2026-11-03): two modes

**At home (the town):** light control only.
- Tap-to-command orders that expire on their own.
- Slow time while giving orders.
- One ability per profession.
- Boss warning circles.
- Possibly a rally flag, merged with guard posts.
- The town AI keeps doing most of the work.

**Raids (new, later in the game):** the full RTS layer. The player attacks other bases with a chosen squad. This is where stances, squads and formations live, and later fog of war, traps and turrets on the enemy side.

## Raids: first sketch

- **Where targets come from.** Raid targets appear like exploration leads: a scout finds a raider camp, a rival town (Ironfield) or a fortified depot. Each target is generated from a seed, so it works offline on iOS. There's no live PvP; async PvP could come much later.
- **How a raid plays.**
  - Pick up to 6 fighters.
  - Set squads, formations and stances on a planning screen.
  - Enter a separate small map with walls, a gate, guards on patrol, turrets, loot buildings and a leader.
- **Winning.**
  - Take the loot buildings, or defeat the leader.
  - Retreat whenever you like and keep what you carry.
  - Downed fighters must be carried out, or they are captured. A captured fighter can be rescued later.
- **Rewards.** Parts in bulk, rare weapons and armour, recruits (freed prisoners), and renown.
- **Costs and risk.** The raid takes the squad away from home, so the town is weaker that day. Hit targets may send revenge raids later, which fits the existing raider system.
- **Unlocks.** Raids open at Haven rank 3 or later, with a Barracks. Before that, the light home controls teach the basics.
- **Reuse.**
  - The same fighters, gear and abilities, and the same 3D characters and zombies.
  - Enemy humans reuse the Raider kinds (thief, brute, firebug), plus new defenders.
