# Zombie Haven: who does what (AI behaviour tracker)

The one list of how every kind of character reacts. When a behaviour changes, update its row here. Status: ✅ in the game, 🛠 being built, 💡 idea / not yet.

## Survivors: when danger shows up

| Situation | Fighters (Guard, Police, SWAT, Scavenger…) | Everyone else (Medic, Farmer, Cook, Engineer…) | Status |
|---|---|---|---|
| Zombie nearby | Chase and fight it; gang up on the same one | Run and hide in the nearest building; fight back if cornered | ✅ |
| No fighters left, zombies in town | — | Militia: 3+ healthy people band together on the weakest zombie | ✅ |
| A friend is down | Rally: fighters with half their health clear zombies around them | The nearest free person rescues them (cart to the medic) | ✅ |
| Fight being lost (3 down, or 2 with a boss) | Fall back and shelter | Shelter | ✅ |
| **Raiders in town** | Chase the nearest raider; **arsonists first** | **Help too** (at half health or more), up to 3 per raider; arsonists first | ✅ V3D.13 |
| Raider attacks them directly | Fight | Fight back if at half health or more, else hide | ✅ V3D.13 |
| Building on fire | Nearby survivors fight the fire (uses water) | Same | ✅ |
| Zombie drops a bag | The killer walks over once safe and opens it | — | ✅ V3D.12 |

## Raiders ("scavengers")

| Type | What they want | When they fight | When they run | Status |
|---|---|---|---|---|
| 🦝 Thief (most) | Sneak to a supply building and steal up to 4 supplies | Only if someone gets right next to them, or when carrying loot | Below half health, or once full | ✅ |
| 💀 Brute (1 in 3 after day 6; often the leader after day 4) | Hurt people: walks straight at the nearest survivor | Always | Never | ✅ V3D.13 |
| 🔥 Firebug (about 1 in 5 after day 3) | Smash a building for ~4 seconds (BANG BANG), then set it on fire and run | When someone gets close | Below a third of their health, or after lighting the fire | ✅ V3D.13 |
| All | Dodge zombies on the way in | — | Leave with the loot; a beaten raider drops what they carried | ✅ |

## Zombies

| Type | Behaviour | Status |
|---|---|---|
| Walker / Crawler / Bloated / Spitter / Brute | Wander in, chase anyone they see, call nearby zombies, break walls and gates | ✅ |
| Runner | Faster, uses the run animation | ✅ V3D.11 |
| Boss (every 3rd night) | Leads a mob at 21:00; at dawn walks back out (doesn't vanish). First two weeks: 40% less HP, softer hits, smaller mob | ✅ V3D.13 |
| Bored zombies in daylight | Wander back out of the map | ✅ |

## Feelings and talk (V3D.14)

| What | How it shows | Status |
|---|---|---|
| Moods | Now and then an emoji bubble over their head: 😊 🎶 😌 when happy, 😞 when unhappy, 🍖 / 💧 when hungry or thirsty (😟 if the town is out), 🥱 tired, 😣 hurt, ☔ in the rain, 😰 outside at night with zombies about, 😢 for a day after a death. The 3D face follows the mood. | ✅ |
| Reactions | 😱 when a zombie comes for a non-fighter, 😤 fighters charging in, 💪 / 😎 after a kill, 😣 when hit, 😋 after eating, 😌 after a drink, 🥱 waking up, 🙏 from the rescued and ❤️ from their rescuer | ✅ |
| Chatter (Dungeon Village 2 style) | Two free survivors walk together, face each other and swap 3 emoji lines. The topic follows the town: food or water short (🍖❓ 😟 🌱💪), rain, a recent fight (🧟💥 😎), night (🌙 😰 🔥🙂), good friends joke (😂 😂 ❤️), strangers say hello (👋 🙂 🤝). Each chat grows their bond and makes them a bit happier. Loners chat less. | ✅ |
| Bonfire evenings | 19:00–24:00, anyone not tired stands in a ring around a Bonfire: 🎶 🔥 😂 ☕, happiness up, bonds with neighbours (up to 8 people) | ✅ |

## Smarter choices (V3D.14)

| Situation | What they do | Status |
|---|---|---|
| Food or water will run out within ~1.5 days | Free non-workers pitch in at the nearest Garden / Farm or Rain Collector / Well: +35% output each, two at most | ✅ |
| 18:00–20:00 | Hurt fighters (under 75%) patch up at the medic, the hungry eat, the thirsty drink, so nobody starts the night weak | ✅ |
| A survivor is attacked | They shout (🆘 or 😤); the two nearest free fighters with some health come running | ✅ |
| Shooter with a zombie in their face | Steps back to keep distance before firing again | ✅ |
| Choosing a target | Fighters prefer zombies on a friend, then ones others are fighting, and now finish off nearly dead ones first | ✅ |

## Daily life

| Who | Behaviour | Status |
|---|---|---|
| Everyone | Eat, drink, rest, train, socialise by need; sleep at night | ✅ |
| Long-time residents | Get their own House: rest 50% better, +2 ♥ there; nobody else uses it | ✅ V3D.12 |
| Everyone else | Sleep at the Inn (4 beds each); sleep rough if no bed | ✅ V3D.12 |
| Workers | Work their building on shift; auto-assigned by profession, or picked by the player in the building panel | ✅ V3D.13 |

## Ideas not built yet 💡

- Grudges: two survivors with a bad bond argue (😠 💢) and avoid each other.
- Couples sit together at the fire; friends walk to meals together.
- A worker whose building is idle tells you (🔧❓ bubble).

- Raiders that come back for revenge if one of theirs was killed.
- A raider who surrenders and can be recruited.
- Survivors remembering who saved them (bonus to their bond).
- Firebugs target the building with the most supplies.
- Guards shouting a warning (a bubble) when they spot raiders.
