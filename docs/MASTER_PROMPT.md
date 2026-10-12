# ZOMBIE HAVEN — MASTER DEVELOPMENT PROMPT
## Gameplay Quality, AI, Combat, Economy, UI and Visual Polish

You are the lead developer of **Zombie Haven**, an original mobile-first, isometric zombie settlement-management game inspired by the gameplay readability and management depth of Dungeon Village 2.

**Repository:** https://github.com/sfwong629-droid/Zombie-haven

**Live game:** https://sfwong629-droid.github.io/Zombie-haven/

The game is currently around V2.33.0, but verify the latest repository version before making changes.

I have provided gameplay screenshots and recordings for reference.

Your objective is to **improve the quality, clarity, responsiveness, and enjoyment of the existing game**, rather than continuously adding new mechanics.

Do not restart the project or switch game engines. Continue developing the existing HTML5/JavaScript game.

---

# 1. Core Development Philosophy

Zombie Haven already includes many features:

- Autonomous survivors with professions, needs, equipment, relationships and training.
- Buildings for housing, production, medicine, defense and recreation.
- Food, water, parts, research and Renown.
- Zombies, raids, bosses, wall defenses and survivor combat.
- Expeditions, exploration, rescues and medical treatment.
- Day/night cycles, town events, progression and upgrades.

The next development stage must focus on making these systems work together in a polished, understandable and satisfying gameplay loop.

Prioritize:

1. Gameplay clarity.
2. Meaningful player decisions.
3. Believable autonomous survivor behavior.
4. Readable combat and emergencies.
5. Economic balance.
6. Mobile usability.
7. Visual and animation consistency.
8. Performance and reliability.

Do not add unnecessary new resources, professions, zombie types or buildings until the existing systems are polished.

---

# 2. Isometric Geometry and Art Consistency — P0

Audit the current rendering and asset systems.

Relevant files include:

- `js/iso.js`
- `js/game.js`
- `js/world.js`
- `js/chars.js`
- `docs/ART_STANDARD.md`

The current art standard specifies:

- 96 × 48 art-pixel isometric tiles.
- Standard 2:1 isometric projection.
- Survivors approximately 42 art pixels tall.
- Consistent pixel scale between buildings, characters and terrain.
- Buildings anchored to the southmost ground-contact corner of their assigned footprint.
- No building rotation for now.

There is an inconsistency between older 33.69° projection comments and the current 2:1 geometry. Correct documentation and any actual implementation discrepancies.

Requirements:

- All buildings align exactly with their assigned grid footprints.
- Building foundations do not leave unexplained gaps.
- Characters do not visually pass through solid buildings or walls.
- Proper depth sorting when survivors walk behind or in front of buildings.
- Placement ghosts, hit detection, collision, sprites and saves use consistent coordinates.
- Do not resize individual sprites arbitrarily to hide geometry problems.
- Preserve approved assets unless changes are necessary.

Create automated geometry and placement tests.

---

# 3. Survivor AI and Daily Routines — P1

Survivors should behave like people living in a functioning settlement.

Improve their autonomous behavior so they visibly:

- Travel to assigned workplaces.
- Perform meaningful work.
- Eat and drink.
- Rest and recover.
- Train at appropriate facilities.
- Socialize and develop relationships.
- Patrol and defend the settlement.
- Respond to emergencies.
- Rescue injured survivors.
- Receive medical treatment.

Each survivor should have:

- A current task.
- A destination.
- A reason for selecting that task.
- Appropriate task commitment.
- Sensible interruption rules for emergencies.

Avoid aimless wandering, rapid task switching, unnecessary backtracking and characters standing idle without an understandable reason.

When selecting a survivor, display:

- Current activity.
- Destination.
- Job and assigned workplace.
- Health and important needs.
- Equipment.
- Current priority or reason for the task.

Survivors should not require constant micromanagement.

Consider settlement-wide priority policies:

- **Defend Town**
- **Prioritize Production**
- **Recover & Heal**

These policies should influence AI task priorities rather than directly control every survivor.

Implement policies only after verifying the existing AI architecture can support them reliably.

---

# 4. Make Buildings Feel Alive — P1

Buildings should visibly perform their functions.

Examples:

**Hospital and Clinic**
- Medics arrive for work.
- Injured survivors are brought in.
- Patients receive treatment.
- Treatment progress is understandable.

**Farms**
- Farmers tend crops.
- Crop or production progress is visible.
- Water shortages affect production visibly.

**Workshop and Scrapyard**
- Workers perform brief work animations.
- Production progress and output are visible.

**Training Buildings**
- Survivors perform recognizable training activities.
- Training completion provides feedback.

**Housing and Recreation**
- Survivors enter, rest, socialize or recover.

Improve building information panels to show:

- Assigned worker and profession.
- Current activity.
- Production inputs and outputs.
- Daily production.
- Consumption and upkeep.
- Operational status.
- Shortages or blockers.
- Upgrade benefits.

Fix ambiguous wording such as "No worker needs Farmer." Use explicit language such as "Requires a Farmer" or "No Farmer assigned," depending on the actual game logic.

Allow players to tap an assigned worker to open that survivor's panel.

Do not create fake production animations disconnected from the simulation.

---

# 5. Combat Readability and Feedback — P1

Combat should be understandable without excessive visual clutter.

Improve:

- Target identification.
- Attack wind-up and hit timing.
- Ranged attack visibility.
- Damage feedback.
- Knockdown feedback.
- Rescue status.
- Defensive positions.
- Zombie movement and pathfinding.
- Wall attack and breach behavior.

Preserve the existing synchronized attack animations and ranged combat.

Add:

- Subtle selection rings.
- Contextual HP bars.
- Clear damage indicators.
- Brief hit effects.
- Readable target feedback.

Do not show permanent HP bars over every character if this makes the screen crowded.

A player should understand:

- Who is attacking whom.
- Why a survivor is taking damage.
- Whether a defender is in range.
- Why a wall is failing.
- Whether a rescue is underway.

---

# 6. Wall Breaches and Emergency Controls — P1

Gameplay recordings show that wall breaches occur frequently but are difficult to locate.

Implement an emergency feedback system.

When a wall is breached:

1. Mark the exact breach location with a temporary pulsing indicator.
2. Display a high-priority alert.
3. Allow tapping the alert to center the camera on the breach.
4. Highlight nearby threats.
5. Provide contextual actions such as Locate Breach, Repair and Assign Defender where supported.

If the breach is outside the visible screen, provide a directional indicator.

Avoid repeatedly displaying identical breach warnings for the same unresolved breach.

Consider an optional setting:

**Automatically return game speed to 1× on the first critical emergency.**

This must be configurable and should not repeatedly interrupt the player.

Emergency actions must respect actual game resources, pathfinding and rules. Do not provide free repairs or impossible commands.

---

# 7. Notification Hierarchy — P1

Current gameplay has competing notifications for breaches, stat increases, rescues, relationships, Renown and combat.

Create three notification levels:

**Critical**
- Wall breaches.
- Survivor in immediate danger.
- Major attacks.
- Severe shortages.

These should be visible, actionable and prioritized.

**Important**
- Mission results.
- Town upgrades.
- Boss defeats.
- Major discoveries.
- Survivor deaths.

These should be clearly communicated without unnecessarily interrupting play.

**Routine**
- Stat increases.
- Small Renown gains.
- Ordinary zombie kills.
- Minor relationship events.

These should use subtle floating feedback or an activity log.

Requirements:

- No overlapping notifications.
- No repeated alerts for the same unresolved issue.
- No important information hidden behind menus.
- Critical alerts remain accessible.
- Notifications should not block building placement or other essential interactions.

---

# 8. Economy and Resource Clarity — P1

The recordings show substantial resource pressure, especially food, water and parts.

Improve resource management without introducing additional currencies.

Tapping a resource should open a panel displaying:

- Current stock.
- Daily production.
- Daily consumption.
- Net daily change.
- Storage capacity, if applicable.
- Major producers and consumers.
- Shortages and inactive facilities.
- Estimated depletion time when meaningful.

All values must come from actual simulation calculations.

Example:

Food: 27
Produced/day: +12
Consumed/day: -15
Net/day: -3
Estimated depletion: 9 days

These numbers are illustrative only. Do not hardcode them.

Make building decisions meaningful.

Players should clearly understand trade-offs such as:

- Build a hospital or reinforce walls?
- Increase food production or conserve water?
- Upgrade defenses or improve parts production?
- Send survivors exploring or keep them defending?

Audit the balance of:

- Food production and consumption.
- Water production and consumption.
- Parts acquisition.
- Construction costs.
- Research costs.
- Repair costs.
- Medical recovery.
- Zombie drops.
- Town progression requirements.

Use multi-seed automated simulations to identify resource starvation, runaway growth, unavoidable death spirals and progression stalls.

Do not solve balance problems simply by making every resource abundant.

---

# 9. Actionable Objectives and Town Advisor — P1

The gameplay recording repeatedly shows the objective:

**Close the Gaps: 0/1**

However, the player cannot easily identify the required location or next step.

Make objectives actionable.

Tapping an objective should:

- Explain what must be done.
- Highlight relevant map locations.
- Identify missing resources or requirements.
- Open the appropriate menu or action.
- Show clear completion feedback.

Introduce a compact, optional Town Advisor that identifies the most urgent actionable issue.

Examples:

- "Northern wall breached — 3 zombies approaching."
- "Food supply declining — estimated 2 days remaining."
- "Hospital inactive — no qualified medic assigned."
- "Town upgrade available — all conditions satisfied."

The advisor must prioritize actual simulation conditions, avoid repetitive warnings, and not automate the player's strategic decisions.

---

# 10. Town Progression and Renown — P2

Preserve Renown as the progression currency.

Improve the town upgrade system so the player understands:

- Current town rank.
- Requirements for the next rank.
- Completed conditions.
- Missing conditions.
- Newly unlocked buildings or mechanics.
- Benefits of upgrading.

Each new rank should create meaningful new decisions rather than simply increase numbers.

Town events should have clear costs, benefits, duration and strategic uses.

Evaluate whether progression is too fast, too slow, or disconnected from the town's actual condition.

---

# 11. Day/Night Atmosphere and Strategy — P2

Improve the visual distinction between morning, daytime, dusk and nighttime.

Consider:

- Warm morning lighting.
- Clear daytime colors.
- Orange dusk.
- Darker blue nighttime lighting.
- Lit building windows.
- Subtle environmental lighting.
- More readable approaching zombies.

Add an informative warning before periods of increased nighttime danger, if that behavior exists in the simulation.

Avoid effects that make the already-small characters difficult to see.

Ensure day/night changes remain performant on mobile devices.

---

# 12. Mobile UI and Controls — P1

Zombie Haven is designed primarily for iPhone portrait gameplay.

Audit:

- Button sizes.
- Menu readability.
- HUD density.
- Camera controls.
- Zoom and pan.
- Building placement.
- Selection accuracy.
- Safe-area support.
- Emergency alerts.
- Bottom controls.
- Menu navigation.

Improve the interface without unnecessarily increasing screen coverage.

Important goals:

- Fewer taps for frequent actions.
- Clearer selected states.
- Larger effective touch targets.
- Better prioritization of information.
- Contextual shortcuts.
- No accidental placement or demolition.
- No overlapping menus and alerts.

Test at multiple iPhone portrait sizes.

---

# 13. Visual Polish and Animation — P2

Maintain the approved pixel-art standard.

Prioritize:

- Consistent sprite scale.
- Consistent eye pixels and outlines.
- Consistent lighting direction.
- Accurate feet alignment.
- Correct depth sorting.
- Smooth movement.
- Clear animation states.
- Readable building silhouettes.
- Improved map props.
- Better brute attack animations.
- Subtle building activity effects.

Do not regenerate approved artwork without a clear reason.

Use original designs and artwork only.

Do not copy Dungeon Village 2 assets, source code, or proprietary content.

---

# 14. Sound and Feedback — P2

Review existing audio feedback.

Ensure meaningful sounds for:

- Construction.
- Building completion.
- Attacks and hits.
- Wall breaches.
- Rescue completion.
- Important discoveries.
- Town upgrades.
- Major emergencies.

Avoid repetitive audio spam.

Preserve sound controls and mobile-browser compatibility.

---

# 15. Gameplay Enjoyment and Strategic Depth

Evaluate whether the player has meaningful decisions to make regularly.

The game should balance:

- Autonomous simulation.
- Player control.
- Settlement development.
- Survival pressure.
- Character progression.
- Exploration.
- Unexpected events.

Avoid turning the game into either:

1. A fully automatic simulation where the player has little influence.
2. A micromanagement game requiring constant manual intervention.

The goal is a living settlement where the player makes strategic decisions and survivors carry them out autonomously.

Evaluate whether players feel rewarded for good decisions and can understand the consequences of poor ones.

---

# 16. Development Order

Do not implement everything in one massive update.

Use this order:

**Phase 1 — Foundation and Critical Clarity**
- Audit isometric geometry.
- Fix any confirmed rendering or collision issues.
- Implement notification hierarchy.
- Implement actionable wall breach alerts.
- Improve objective interaction.

**Phase 2 — Town Management**
- Add resource production/consumption information.
- Improve building staffing and operational panels.
- Add contextual emergency actions.
- Improve shortage warnings.

**Phase 3 — Living Settlement**
- Improve survivor task commitment.
- Improve visible work routines.
- Add facility activity feedback.
- Improve treatment and rescue clarity.

**Phase 4 — Combat and Strategy**
- Improve combat indicators.
- Refine defensive behavior.
- Evaluate settlement-wide priority policies.
- Rebalance survival difficulty.

**Phase 5 — Polish**
- Improve day/night atmosphere.
- Refine mobile UI.
- Polish animations, map props and sound.
- Refine progression pacing.

Finish and validate each phase before moving to the next.

---

# 17. Testing and Quality Requirements

Preserve existing gameplay features and saved-game compatibility.

Run existing automated tests and add regression tests for changed systems.

Test at minimum:

- Game startup.
- Saving and loading.
- Old save compatibility.
- Building placement.
- Building collision and depth sorting.
- Road connectivity.
- Worker assignment.
- Resource production and consumption.
- Survivor AI and pathfinding.
- Zombie AI.
- Wall breach behavior.
- Combat damage and animation timing.
- Knockdowns and rescues.
- Town upgrades.
- Objective completion.
- Menu interactions.
- iPhone portrait usability.

Run multi-seed gameplay simulations for balance.

Perform visual testing at mobile portrait dimensions where a browser environment is available.

Clearly distinguish:

- Tests actually executed and passed.
- Tests executed and failed.
- Tests not performed.

Never claim that a feature or asset has passed testing unless it was actually verified.

Do not present a failing or unverified implementation as production-ready.

---

# 18. Required Deliverables

For each development phase, provide:

1. Updated working game files.
2. Source-code changes.
3. Versioned changelog.
4. Tests added or updated.
5. Actual test results.
6. Known limitations.
7. GitHub Pages deployment instructions.
8. A brief explanation of how the improvements affect gameplay.

Do not stop after creating a plan.

**Begin by inspecting the latest repository, identifying the highest-impact confirmed issues, and implementing Phase 1.**

The goal is to make Zombie Haven feel like a polished, responsive, visually coherent and strategically satisfying mobile settlement-management game.