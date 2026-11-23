/* ---------------- simulation: tuning (tile units; 60 ticks/s fixed step) ---------------- */
const WALK = .0167, CHASE = .026, CARRY = .0158;   /* V2.37: pushing the cart is close to walking pace (was .0133, barely faster than a walker's chase) */
const weapons = [['Pipe', 6, 0], ['Knife', 9, 45], ['Bat', 14, 75], ['Machete', 19, 120], ['Pistol', 24, 180]];
const professions = {
  Civilian: { combat: 0, med: 0, scav: 0, facility: 0, master: 40, next: ['Guard', 'Medic', 'Scavenger', 'Mechanic'], skill: 'Adaptable' },
  Guard: { combat: 3, med: 0, scav: 0, facility: 0, master: 60, next: ['Police Officer'], skill: 'Threat Response' },
  Medic: { combat: 0, med: 4, scav: 0, facility: 1, master: 60, next: [], skill: 'Field Aid' },
  Scavenger: { combat: 1, med: 0, scav: 4, facility: 0, master: 60, next: [], skill: 'Loot Sense' },
  'Police Officer': { combat: 3, med: 0, scav: 1, facility: 0, master: 80, next: [], skill: 'Armed Response' },   /* 3D.67 profession balance: +5 -> +3; ranged and raid specialist instead (Mechanic, Paramedic and SWAT removed for now) */
  Engineer: { combat: 1, med: 0, scav: 2, facility: 7, master: 100, next: [], skill: 'Facility Expert' },
  Farmer: { combat: 0, med: 0, scav: 1, facility: 2, master: 60, next: [], skill: 'Green Thumb' },
  Cook: { combat: 0, med: 0, scav: 0, facility: 3, master: 60, next: [], skill: 'Hearty Meals' },
  Mechanic: { combat: 1, med: 0, scav: 1, facility: 4, master: 80, next: [], skill: 'Grease Monkey' },   /* 3D.77: back: runs the Generator, Fuel Still, Ammo Bench and Factory, and the Electric Pump */
};
const facilityRules = aliasT({   // V2.6: no prices. Survivors are fed by the daily ration; visits relieve the need meters (food/water/medicine must be in stock to help).
  canteen: { need: 'hunger', use: 145, sat: 2, benefit: 26, label: 'Eating' },
  house: { need: 'fatigue', use: 175, sat: 1, benefit: 34, label: 'Resting' },
  inn: { need: 'fatigue', use: 175, sat: 1, benefit: 34, label: 'Resting' },   /* V3D.12 */
  hq: { need: 'fatigue', use: 175, sat: 0, benefit: 26, label: 'Sleeping at the Camp' }, hq2: { need: 'fatigue', use: 175, sat: 0, benefit: 28, label: 'Sleeping at the Lodge' }, hq3: { need: 'fatigue', use: 175, sat: 0, benefit: 30, label: 'Sleeping at the Fort' },   /* 3D.30 */
  medic: { need: 'injury', use: 190, sat: 2, benefit: 34, label: 'Treatment' },
  cabin: { need: 'fatigue', use: 165, sat: 1, benefit: 38, label: 'Resting' },
  stonehouse: { need: 'fatigue', use: 155, sat: 2, benefit: 44, label: 'Resting' },
  barrel: { need: 'thirst', use: 100, sat: 1, benefit: 24, label: 'Drinking' },
  irrig: { need: 'hunger', use: 100, sat: 1, benefit: 26, label: 'Getting food' },
  mess: { need: 'hunger', use: 135, sat: 3, benefit: 32, label: 'Eating' },
  clinic: { need: 'injury', use: 205, sat: 2, benefit: 50, label: 'Treatment' },
  hospital: { need: 'injury', use: 220, sat: 3, benefit: 70, label: 'Treatment' },
  armory: { need: 'gear', use: 155, sat: 2, benefit: 25, label: 'Shopping' },
  water: { need: 'thirst', use: 100, sat: 1, benefit: 28, label: 'Drinking' },
  well: { need: 'thirst', use: 100, sat: 1, benefit: 36, label: 'Drinking' },
  farm: { need: 'hunger', use: 100, sat: 1, benefit: 16, label: 'Getting food' },
  field: { need: 'hunger', use: 100, sat: 1, benefit: 22, label: 'Getting food' },
  gym: { need: 'train', stat: 'str', use: 170, sat: 1, benefit: 34, label: 'Lifting weights' },
  library: { need: 'train', stat: 'int', use: 170, sat: 1, benefit: 34, label: 'Studying' },
  lounge: { need: 'train', stat: 'cha', use: 150, sat: 2, benefit: 34, label: 'Socialising' },
  range: { need: 'train', stat: 'per', use: 170, sat: 1, benefit: 34, label: 'Target practice' },
  track: { need: 'train', stat: 'agi', use: 170, sat: 1, benefit: 34, label: 'Running drills' },
  sparring: { need: 'train', stat: 'end', use: 170, sat: 1, benefit: 34, label: 'Sparring' },
});
const RATION_BASE = { Civilian: 1, Farmer: 1, Medic: 1, Engineer: 1.25, Mechanic: 1.25, Guard: 1.5, 'Police Officer': 1.5, Scavenger: 1.5 };
const LEVEL_CAP = 10;   /* V2.16: DV2-style, levels 6-10 need much more XP */
/* V2.12: per-profession levels (like DV2). Each survivor keeps a level + XP for every profession they have worked
   (s.cls[job] = { l, xp }); s.l / s.mastery always mirror the current job. Reaching Lv.3 and Lv.5 in a profession
   teaches a skill that stays with the survivor for good, whatever job they do later. */
const CLASS_LIST = ['Civilian', 'Guard', 'Police Officer', 'Medic', 'Scavenger', 'Engineer', 'Mechanic', 'Cook', 'Farmer'];
const SKILLS = {
  quickLearner: { name: 'Quick Learner', from: 'Civilian', at: 3, desc: '+25% XP in every profession' },
  hardy: { name: 'Hardy', from: 'Civilian', at: 5, desc: '+10 max HP' },
  brawler: { name: 'Brawler', from: 'Guard', at: 3, desc: '+3 damage per hit' },
  tough: { name: 'Tough', from: 'Guard', at: 5, desc: '+15 max HP' },
  steadyAim: { name: 'Steady Aim', from: 'Police Officer', at: 3, desc: '+4 damage per hit' },
  armored: { name: 'Armored', from: 'Police Officer', at: 5, desc: 'Takes 20% less damage' },
  firstAid: { name: 'First Aid', from: 'Medic', at: 3, desc: 'Slowly heals when not fighting' },
  steadyHands: { name: 'Steady Hands', from: 'Medic', at: 5, desc: 'Carries the wounded 30% faster; patients recover 30% faster' },
  lightFeet: { name: 'Light Feet', from: 'Scavenger', at: 3, desc: '+15% walking speed' },
  lootSense: { name: 'Loot Sense', from: 'Scavenger', at: 5, desc: 'Finds more on scavenging runs and expeditions' },
  handy: { name: 'Handy', from: 'Engineer', at: 3, desc: 'Wall repairs go twice as fast while alive' },
  efficient: { name: 'Efficient', from: 'Engineer', at: 5, desc: '+15% output at any building they staff' },
  ironStomach: { name: 'Iron Stomach', from: 'Cook', at: 3, desc: 'Hunger and thirst rise 20% slower' },
  fieldRations: { name: 'Field Rations', from: 'Cook', at: 5, desc: 'Eating and drinking relieve 25% more' },
  strongBack: { name: 'Strong Back', from: 'Farmer', at: 3, desc: '+10 max HP, carries the wounded 20% faster' },
  greenThumb: { name: 'Green Thumb', from: 'Farmer', at: 5, desc: '+20% output at any building they staff' },
  tinkerer: { name: 'Tinkerer', from: 'Mechanic', at: 3, desc: '+25% fuel and ammo made at the building they staff' },
  fuelSaver: { name: 'Fuel Saver', from: 'Mechanic', at: 5, desc: 'A Generator they run burns half the fuel (not a quarter less)' },
  jackOfAll: { name: 'Jack of All Trades', from: 'Civilian', at: 10, desc: '+1 to every stat' },
  bulwark: { name: 'Bulwark', from: 'Guard', at: 10, desc: 'Takes 15% less damage, +20 max HP' },
  marksman: { name: 'Marksman', from: 'Police Officer', at: 10, desc: 'Ranged weapons hit 25% harder' },
  miracleWorker: { name: 'Miracle Worker', from: 'Medic', at: 10, desc: 'Heals 3× faster outside combat; patients they rescue recover 30% faster' },
  treasureHunter: { name: 'Treasure Hunter', from: 'Scavenger', at: 10, desc: 'Expeditions find 20% more and gear twice as often' },
  masterBuilder: { name: 'Master Builder', from: 'Engineer', at: 10, desc: 'Halves upkeep of the building they staff; +20% research' },
  headChef: { name: 'Head Chef', from: 'Cook', at: 10, desc: 'Meals +30% at any Canteen they staff' },
  harvestMaster: { name: 'Harvest Master', from: 'Farmer', at: 10, desc: '+30% output at any food building they staff' },
  gearhead: { name: 'Gearhead', from: 'Mechanic', at: 10, desc: 'The Generator they run gives 2 more power' },
};
const hasSkill = (s, k) => !!(s.skills && s.skills.includes(k));
/* ---------------- V2.14: survivor stats (DV2 + Fallout SPECIAL) and equipment ---------------- */
const STATS = ['str', 'end', 'agi', 'per', 'int', 'cha'];
const STAT_NAME = { str: 'Strength', end: 'Endurance', agi: 'Agility', per: 'Perception', int: 'Intelligence', cha: 'Charisma' };
const STAT_CAP = 20;
const JOB_STATS = { Civilian: ['cha', 'int'], Guard: ['str', 'end'], 'Police Officer': ['per', 'end'], Medic: ['int', 'cha'], Scavenger: ['agi', 'per'], Engineer: ['int', 'str'], Cook: ['cha', 'end'], Farmer: ['str', 'end'], Mechanic: ['int', 'str'], Paramedic: ['int', 'agi'], SWAT: ['per', 'str'] };
const ITEMS = {   // V3D.16 balanced set (tools/balance: sim of the game's own combat formulas). atk per hit; rate x attack cycle (lower = faster);
  // guns: range in tiles, mag rounds, reload seconds (real-gun-like); def = damage cut 3% a point (armor + hat, cap 60%). Balance table: docs/EQUIPMENT.md
  pipe: { name: "Lead Pipe", slot: "weapon", kind: "blunt", atk: 5, rate: 0.95, cost: 1 },
  knife: { name: "Kitchen Knife", slot: "weapon", kind: "blade", atk: 1, rate: 0.7, cost: 2 },
  bat: { name: "Baseball Bat", slot: "weapon", kind: "blunt", atk: 16, rate: 1.0, cost: 4 },
  crowbar: { name: "Crowbar", slot: "weapon", kind: "blunt", atk: 20, rate: 0.95, cost: 5 },
  nailbat: { name: "Nail Bat", slot: "weapon", kind: "blunt", atk: 20, rate: 0.92, cost: 6 },
  machete: { name: "Machete", slot: "weapon", kind: "blade", atk: 14, rate: 0.8, cost: 6 },
  spear: { name: "Scrap Spear", slot: "weapon", kind: "blade", atk: 27, rate: 1.05, cost: 7, st: { per: 1 } },
  axe: { name: "Fire Axe", slot: "weapon", kind: "blade", atk: 32, rate: 1.15, cost: 9, st: { agi: -1 } },
  sledge: { name: "Sledgehammer", slot: "weapon", kind: "blunt", atk: 36, rate: 1.45, cost: 11, st: { agi: -2 } },
  katana: { name: "Katana", slot: "weapon", kind: "blade", atk: 32, rate: 0.7, cost: 15 },
  pistol: { name: "Pistol", slot: "weapon", kind: "gun", atk: 7, rate: 1.05, range: 3.4, mag: 12, reload: 1.8, cost: 8, ranged: true },
  revolver: { name: "Revolver", slot: "weapon", kind: "gun", atk: 16, rate: 1.36, range: 3.6, mag: 6, reload: 3.0, cost: 10, ranged: true },
  shotgun: { name: "Shotgun", slot: "weapon", kind: "gun", atk: 34, rate: 1.68, range: 2.4, mag: 6, reload: 4.5, cost: 13, ranged: true, st: { agi: -1 } },
  smg: { name: "SMG", slot: "weapon", kind: "gun", atk: 1, rate: 0.73, range: 3.6, mag: 30, reload: 2.5, cost: 13, ranged: true },
  rifle: { name: "Hunting Rifle", slot: "weapon", kind: "gun", atk: 30, rate: 1.64, range: 4.8, mag: 5, reload: 3.0, cost: 12, ranged: true },
  assault: { name: "Assault Rifle", slot: "weapon", kind: "gun", atk: 8, rate: 0.74, range: 4.4, mag: 30, reload: 2.6, cost: 18, ranged: true },
  bow: { name: "Hunting Bow", slot: "weapon", kind: "bow", atk: 18, rate: 1.6, range: 4.2, cost: 7, ranged: true, st: { per: 1 } },
  crossbow: { name: "Crossbow", slot: "weapon", kind: "bow", atk: 34, rate: 2.5, range: 4.6, mag: 1, reload: 2.4, cost: 11, ranged: true },
  jacket: { name: "Work Jacket", slot: "armor", def: 2, cost: 2 },
  leather: { name: "Leather Jacket", slot: "armor", def: 4, cost: 4 },
  hockey: { name: "Hockey Pads", slot: "armor", def: 5, cost: 5, st: { agi: -1 } },
  biker: { name: "Biker Leathers", slot: "armor", def: 5, cost: 6, st: { cha: 1 } },
  riot: { name: "Riot Vest", slot: "armor", def: 7, cost: 7, st: { agi: -1 } },
  kevlar: { name: "Kevlar Vest", slot: "armor", def: 8, cost: 10 },
  military: { name: "Military Armor", slot: "armor", def: 11, cost: 14, st: { agi: -1 } },
  plate: { name: "Scrap Plate", slot: "armor", def: 10, cost: 11, st: { agi: -2 } },
  gloves: { name: "Lifting Gloves", slot: "acc", cost: 3, st: { str: 2 } },
  belt: { name: "Back Brace", slot: "acc", cost: 3, st: { end: 2 } },
  shoes: { name: "Running Shoes", slot: "acc", cost: 3, st: { agi: 2 } },
  goggles: { name: "Scope Goggles", slot: "acc", cost: 5, st: { per: 2 } },
  glasses: { name: "Reading Glasses", slot: "acc", cost: 3, st: { int: 2 } },
  charm: { name: "Lucky Charm", slot: "acc", cost: 3, st: { cha: 2 } },
  dogtags: { name: "Dog Tags", slot: "acc", cost: 6, st: { str: 1, end: 1, per: 1 } },
  bandana: { name: "Bandana", slot: "head", def: 0, cost: 1, st: { cha: 1 }, shape: "bandana" },
  cap: { name: "Baseball Cap", slot: "head", def: 0, cost: 3, st: { per: 1 }, shape: "cap" },
  beanie: { name: "Beanie", slot: "head", def: 0, cost: 2, st: { end: 1 }, shape: "beanie" },
  strawhat: { name: "Straw Hat", slot: "head", def: 0, cost: 2, st: { cha: 1, end: 1 }, shape: "straw" },
  hardhat: { name: "Hard Hat", slot: "head", def: 2, cost: 2, shape: "hard" },
  bikehelm: { name: "Bike Helmet", slot: "head", def: 3, cost: 3, shape: "bike" },
  football: { name: "Football Helmet", slot: "head", def: 4, cost: 5, st: { per: -1 }, shape: "football" },
  army: { name: "Army Helmet", slot: "head", def: 5, cost: 6, shape: "army" },
  riothelm: { name: "Riot Helmet", slot: "head", def: 6, cost: 7, st: { per: -1 }, shape: "riot" },
  // ---- 3D.28 new gear (Last Day on Earth / State of Decay style), balanced with tools/balance (docs: equipment notes) ----
  golf: { name: "Golf Club", slot: "weapon", kind: "blunt", atk: 7, rate: 0.9, cost: 3 },
  hatchet: { name: "Hatchet", slot: "weapon", kind: "blade", atk: 9, rate: 0.85, cost: 4 },
  cleaver: { name: "Cleaver", slot: "weapon", kind: "blade", atk: 5, rate: 0.7, cost: 4 },
  shovel: { name: "Shovel", slot: "weapon", kind: "blunt", atk: 27, rate: 1.05, cost: 7 },
  roadsign: { name: "Road Sign", slot: "weapon", kind: "blunt", atk: 32, rate: 1.3, cost: 9, st: { agi: -1 } },
  spiked: { name: "Spiked Club", slot: "weapon", kind: "blunt", atk: 36, rate: 1.15, cost: 13 },
  magnum: { name: "Magnum", slot: "weapon", kind: "gun", atk: 27, rate: 1.4, range: 3.8, mag: 6, reload: 3.2, cost: 14, ranged: true },
  hoodie: { name: "Hoodie", slot: "armor", def: 1, cost: 2, st: { end: 1 } },
  // ---- 3D.148 the owner's gear list, batch 1 (Tripo models fitted to the survivor) ----
  // ---- 3D.155 profession gear: each one boosts its own job
  chef: { name: "Chef's Whites", slot: "armor", def: 2, cost: 4, fx: "cook" },
  medic: { name: "Field Medic Vest", slot: "armor", def: 3, cost: 5, fx: "medic" },
  mechanic: { name: "Mechanic's Coveralls", slot: "armor", def: 3, cost: 5, fx: "fix" },
  garden: { name: "Garden Overalls", slot: "armor", def: 2, cost: 4, fx: "farm" },
  hivis: { name: "Builder's Hi-Vis", slot: "armor", def: 3, cost: 5, fx: "hivis" },
  pillow: { name: "Pillow Armour", slot: "armor", def: 3, cost: 3, fx: "blunt" },
  skisuit: { name: "Ski Suit", slot: "armor", def: 4, cost: 4, st: { end: 1 }, fx: "rain" },
  ducttape: { name: "Duct Tape Suit", slot: "armor", def: 6, cost: 7, fx: "regen" },
  barrel: { name: "Barrel Armour", slot: "armor", def: 8, cost: 9, st: { agi: -2 }, fx: "rubble" },
  goalie: { name: "Goalie Pads", slot: "armor", def: 9, cost: 10, st: { agi: -2 }, fx: "wall" },
  bubblewrap: { name: "Bubble Wrap", slot: "armor", def: 2, cost: 2, fx: "pop" },
  cardboard: { name: "Cardboard Box Armour", slot: "armor", def: 3, cost: 3, st: { agi: 1 }, fx: "hide" },
  mattress: { name: "Mattress Vest", slot: "armor", def: 5, cost: 4, st: { agi: -1 }, fx: "rest" },
  phonebook: { name: "Phone Book Armour", slot: "armor", def: 6, cost: 5, st: { agi: -1 }, fx: "bite" },
  tyre: { name: "Tyre Armour", slot: "armor", def: 6, cost: 5, st: { agi: -1 }, fx: "bounce" },
  lifejacket: { name: "Life Jacket", slot: "armor", def: 3, cost: 3, fx: "float" },
  footpads: { name: "Football Pads", slot: "armor", def: 7, cost: 8, st: { str: 1 }, fx: "charge" },
  hawaii: { name: "Hawaiian Shirt", slot: "armor", def: 1, cost: 2, st: { cha: 2 }, fx: "aloha" },
  beekeeper: { name: "Beekeeper Suit", slot: "armor", def: 4, cost: 6, fx: "gas" },
  cookware: { name: "Cookware Cuirass", slot: "armor", def: 8, cost: 9, st: { agi: -1 }, fx: "clang" },
  raincoat: { name: "Raincoat", slot: "armor", def: 1, cost: 2, fx: "rain" },
  firecoat: { name: "Firefighter Coat", slot: "armor", def: 5, cost: 6, fx: "fire" },
  hazmat: { name: "Hazmat Suit", slot: "armor", def: 3, cost: 6, fx: "gas" },
  ghillie: { name: "Ghillie Suit", slot: "armor", def: 2, cost: 6, st: { agi: 2 } },
  tactical: { name: "Tactical Vest", slot: "armor", def: 9, cost: 12, st: { per: 1 } },
  swatarmor: { name: "SWAT Armor", slot: "armor", def: 12, cost: 16, st: { agi: -1 } },
  headlamp: { name: "Headlamp", slot: "head", def: 0, cost: 3, fx: "night", shape: "headlamp" },
  gasmask: { name: "Gas Mask", slot: "head", def: 1, cost: 4, fx: "gas", shape: "gasmask" },
  tactcap: { name: "Tactical Cap", slot: "head", def: 2, cost: 4, st: { per: 1 }, shape: "tactcap" },
  swathelm: { name: "SWAT Helmet", slot: "head", def: 8, cost: 9, st: { per: -1 }, shape: "swathelm" },
  backpack: { name: "School Backpack", slot: "acc", cost: 4, fx: "carry1" },
  hikerpack: { name: "Hiking Backpack", slot: "acc", cost: 8, st: { end: 1 }, fx: "carry2" },
  toolbelt: { name: "Tool Belt", slot: "acc", cost: 4, fx: "build" },
  medpouch: { name: "Medic Pouch", slot: "acc", cost: 5, st: { int: 1 }, fx: "regen" },
  watch: { name: "Wristwatch", slot: "acc", cost: 4, st: { agi: 1, per: 1 } },
  kneepads: { name: "Knee Pads", slot: "acc", def: 2, cost: 3 },
  walkie: { name: "Walkie-Talkie", slot: "acc", cost: 4, st: { cha: 2 }, fx: "radio" },
};
const IQUIP = {   /* 3D.146 owner: funny first, facts second. One line of character per item, shown above its numbers */
  chef: "Yes, chef.", medic: "Walk it off. No, really, stop walking.", mechanic: "Have you tried turning the apocalypse off and on again?", garden: "Grows on you.", hivis: "Highly visible. To zombies too.",
  pillow: "Pillow fight, championship level.", skisuit: "Après-ski, après-world.", ducttape: "Fixes everything. Including you.", barrel: "Roll out.", goalie: "The wall that skates.",
  bubblewrap: "Fragile: handle with care.", cardboard: "Totally not a person.", mattress: "Memory foam. It remembers every bite.", phonebook: "Let your fingers do the blocking.", tyre: "Michelin-starred.",
  lifejacket: "Keeps you afloat. Metaphorically.", footpads: "Blitz.", hawaii: "Aloha, undead.", beekeeper: "Not the bees. Something worse.", cookware: "Pots, pans and pure confidence.",
  pipe: "Plumbing, repurposed.", knife: "Still smells of onions.", bat: "Batter up.", crowbar: "Opens doors and arguments.", nailbat: "A bat with opinions.", machete: "Gardening, but angrier.", spear: "Pointy stick, version two.", axe: "In case of zombie, break glass.", sledge: "For when subtle has failed.", katana: "Someone's mall-ninja dream came true.", pistol: "Small, loud, hungry for ammo.", revolver: "Six chances to be right.", shotgun: "Aiming is optional.", smg: "Eats ammo like popcorn.", rifle: "For conversations at a distance.", assault: "Very loud. Very thirsty.", bow: "Quiet, reusable, judgemental.", crossbow: "A bow that went to the gym.", jacket: "Pockets for days.", leather: "Cool, and a bit bite-proof.", hockey: "Body-checks the dead.", biker: "Loud fashion.", riot: "Previously owned by the law.", kevlar: "Stops a lot. Not everything.", military: "Heavy, ugly, alive.", plate: "Bin lids, but hopeful.", gloves: "Grip it and rip it.", belt: "Lift with your legs anyway.", shoes: "Not running away. Running towards safety.", goggles: "See them before they see you.", glasses: "Read the manual. Finally.", charm: "Luck you can wear.", dogtags: "Somebody's story. Wear it well.", bandana: "Instant charm, no washing required.", cap: "Shade for the eyes, focus for the aim.", beanie: "Warm head, warm heart.", strawhat: "Farmer chic.", hardhat: "Safety first. Zombies second.", bikehelm: "Brain bucket.", football: "Huddle up.", army: "Standard issue, non-standard times.", riothelm: "A visor between you and drool.", golf: "Fore!", hatchet: "Small axe, big plans.", cleaver: "The butcher's best friend.", shovel: "Digs graves. Fills them too.", roadsign: "STOP. It means it.", spiked: "Medieval, but make it scrap.", magnum: "Six shots of very bad news.", hoodie: "Hood up, problems down.", raincoat: "Dry outside, scared inside.", firecoat: "Hot stuff, handled.", hazmat: "Fashionably airtight.", ghillie: "Is that a bush? Yes. Definitely.", tactical: "So many pouches.", swatarmor: "Kicks in doors for you.", headlamp: "Hands free, nights brighter.", gasmask: "Breathe easy. Look terrifying.", tactcap: "Looks like it knows something.", swathelm: "Built for bad days.", backpack: "Still has a maths book in it.", hikerpack: "The trail is long. The pack is longer.", toolbelt: "A place for every wrench.", medpouch: "Bandages within reach.", watch: "Knows when dinner is.", kneepads: "Crawl with confidence.", walkie: "Over. Over? Hello?" };
const iQuip = (id) => (IQUIP[id] ? `<br><i style="opacity:.75">${IQUIP[id]}</i>` : '');   /* owner: numbers first, the joke last */
const SLOTS = ['head', 'acc', 'armor', 'weapon'], SLOT_NAME = { weapon: 'Weapon', armor: 'Clothing', head: 'Hat', acc: 'Accessory' };   /* 3D.28: four gear slots: hat, accessory, clothing (the old armour slot, key kept for saves), weapon; all show on the 3D model */
const ARMORY_STOCK = { weapon: ['knife', 'golf', 'hatchet', 'cleaver', 'bat', 'crowbar', 'machete', 'pistol', 'bow'], armor: ['hoodie', 'raincoat', 'hawaii', 'lifejacket', 'jacket', 'leather', 'hockey', 'beekeeper', 'riot'], head: ['bandana', 'cap', 'beanie', 'strawhat', 'hardhat', 'headlamp', 'tactcap', 'bikehelm'], acc: ['gloves', 'belt', 'shoes', 'glasses', 'charm', 'backpack', 'watch', 'kneepads', 'toolbelt'] };   // what survivors can buy at an Armory with parts
const itemOf = (s, slot) => (s.eq && s.eq[slot] && ITEMS[s.eq[slot]]) || null;
/* V3D.25 extra drops per zombie type: [chance, resource, amount] */
const ZDROP = { runner: [[.3, 'cloth', 1]], brute: [[.4, 'cloth', 1], [.15, 'meds', 1]], bloated: [[.35, 'meds', 1]], spitter: [[.3, 'meds', 1]], crawler: [[.15, 'cloth', 1]], raider: [[.45, 'fuel', 1], [.3, 'meds', 1], [.3, 'cloth', 1], [.5, 'ammo', 6]], walker: [[.04, 'ammo', 2]] };   /* 3D.77: rounds from raiders and the odd dead cop */
const PART_DROP = { walker: [.55, 1], runner: [.55, 1], crawler: [.45, 1], spitter: [.7, 1], thrower: [.8, 2], bloated: [.75, 2], brute: [1, 2], raider: [0, 0] };   /* V2.33: [chance, parts] per kill (was 25% for 1) */
const fairRound = (x) => Math.floor(x) + (rnd() < x - Math.floor(x) ? 1 : 0);   /* V3D.16: 3.7 is 4 seven times in ten, so every point of armor counts */
const FISTS = { name: 'Bare hands', slot: 'weapon', atk: 1, rate: .9, kind: 'blunt', cost: 0 };   /* V3D.15: everyone starts bare-handed in 3D mode */
const GUN_BUTT = { name: 'Empty gun (swung)', slot: 'weapon', atk: 5, rate: 1.1, kind: 'blunt', cost: 0 };   /* 3D.77: out of ammo, a gunner clubs with the gun */
const usesAmmo = (w) => !!(w && w.mag && w.kind !== 'bow');   /* crossbows and bows never need ammo */
const SHOT_SFX = { Pistol: 'shot_pistol', Revolver: 'shot_magnum', Magnum: 'shot_magnum', Shotgun: 'shot_shotgun', 'Hunting Bow': 'shot_arrow', SMG: 'shot_smg', 'Hunting Rifle': 'shot_rifle', 'Assault Rifle': 'shot_auto', Crossbow: 'shot_bow' };   /* Music chat (W100): each gun its own shot */
const hitSfx = (w) => (w && w.ranged ? SHOT_SFX[w.name] || (w.kind === 'bow' ? 'shot_bow' : 'shot') : 'hit');
const weaponOf = (s) => { const w = itemOf(s, 'weapon'); if (w && s.dry && usesAmmo(w)) return GUN_BUTT; return w || ((FISTS)); };
function reloadGun(s, w = itemOf(s, 'weapon')) {   /* 3D.77: limited ammo: refill the magazine from the town's stock (bows refill free) */
  if (!w || !w.mag) return; const cur = Math.max(0, s.ammo == null ? 0 : s.ammo);
  if (!usesAmmo(w)) { s.ammo = w.mag; return; }
  const take = Math.min(w.mag - cur, Math.floor(S.ammo || 0)); S.ammo = (S.ammo || 0) - take; s.ammo = cur + take;
  if (take > 0) flow('ammo', 'Reloads', -take);
  if (s.ammo <= 0) { s.dry = true; s.ammo = 0; if (!(s.dryNote > tick - 1800)) { s.dryNote = tick; floats.push({ w: { ...s.w }, t: 'OUT OF AMMO!', col: '#ff8a6a', a: 90, big: true }); bark(s, 'noAmmo', {}, { pri: 2 }); ammoAlert(true); } }
}
function dryTick() {   /* every few seconds: gunners with an empty gun go back to it once there is ammo again */
  if (tick % 120) return; for (const s of S.sv) if (s.dry && (S.ammo || 0) >= 1) { s.dry = false; s.ammo = 0; reloadGun(s); }   /* audit: reload straight away (no free shot) */
}
const gunners = () => S.sv.filter((q) => q.hp > 0 && usesAmmo(itemOf(q, 'weapon')));
const ammoCap = () => 60 + 30 * storeTiers();
const SUP_ROWS = [['cloth', 'Cloth', 'cloth'], ['meds', 'Medicine', 'pill'], ['fuel', 'Fuel', 'fuel'], ['ammo', 'Ammo', 'ammo']];
function supLow(k) {   /* 3D.279: when a supply counts as low (orange in the list, a dot on the bag) */
  if (k === 'ammo') { const g = gunners().length; return g > 0 && (S.ammo || 0) < 8 * g; }
  if (k === 'meds') return (S.meds || 0) < 1 && S.sv.some((q) => q.hp > 0 && q.hp < q.max * .6);
  if (k === 'fuel') { const n = gens().length; return n > 0 && (S.fuel || 0) < 3 * n; }
  return false;
}
function supplyChip(rr) {   /* 3D.279 (owner, 22 Nov, W210: "do C"): the bag shows one total (cloth + medicine + fuel) and a dot when something is low; ammo moved off the bar into the bag's list */
  const sp = rr.parentElement; if (!sp) return; sp.classList.add('bagChip'); sp.title = 'Supplies';
  const old = document.getElementById('ammoChip'); if (old) old.remove(); if (sp.parentElement) sp.parentElement.classList.remove('tight');
  rr.textContent = ['cloth', 'meds', 'fuel'].reduce((a, k) => a + Math.floor(S[k] || 0), 0);
  let d = sp.querySelector('.supDot'); if (!d) { d = document.createElement('em'); d.className = 'supDot'; sp.appendChild(d); } d.style.display = SUP_ROWS.some(([k]) => supLow(k)) ? '' : 'none';
  const pop = document.getElementById('supPop'); if (pop) { if (menuOpenNow() || modalOpen || document.documentElement.classList.contains('shView')) supClose(); else supFill(pop); }
}
function supFill(pop) {
  const ic = (n) => (window.ZHIcons ? ZHIcons.svg(n, 24) : '');
  pop.querySelector('.supRows').innerHTML = SUP_ROWS.map(([k, name, icon]) => { const v = Math.floor(S[k] || 0), cap = k === 'ammo' ? ammoCap() : rareCap(), low = supLow(k);
    return `<div class="supRow${low ? ' low' : ''}" data-k="${k}"><i>${ic(icon)}</i><span class="supN">${name}<span class="supBar"><span style="width:${Math.min(100, Math.round(100 * v / cap))}%"></span></span></span><b>${v}<small> / ${cap}</small></b></div>`; }).join('');
}
function supClose() { const p = document.getElementById('supPop'); if (p) p.remove(); }
function supPop() {   /* tap the bag: a small list of the supplies with names, caps and a bar each; low ones in orange */
  if (document.getElementById('supPop')) { supClose(); return; }
  const chip = document.querySelector('#plaque .bagChip'); if (!chip) { showStash(); return; }
  const pop = document.createElement('div'); pop.id = 'supPop';
  pop.innerHTML = '<div class="supH">SUPPLIES</div><div class="supRows"></div><button class="supInv">🎒 Open inventory ›</button>';
  document.body.appendChild(pop); supFill(pop);
  const u = parseFloat(getComputedStyle(pop).zoom) || 1, r = chip.getBoundingClientRect();
  pop.style.top = (r.bottom / u + 8) + 'px'; pop.style.right = Math.max(8, (innerWidth - r.right) / u - 10) + 'px';
  pop.querySelector('.supInv').onclick = (e) => { e.stopPropagation(); supClose(); showStash(); };
}
document.addEventListener('click', (e) => { if (document.getElementById('supPop') && !e.target.closest('#supPop, #plaque .bagChip')) supClose(); }, { capture: true });
function ammoAlert(dry) {
  const g = gunners().length; if (!g) return;
  if (dry) note('critical', '🔸 Out of ammo: gunners are clubbing with empty guns. Make rounds at an Ammo Bench or loot the Military Checkpoint.', { key: 'dryammo', icon: '🔸' });
  else if ((S.ammo || 0) < 8 * g) note('important', `🔸 Low ammo: ${Math.floor(S.ammo || 0)} rounds for ${g} gunner${g > 1 ? 's' : ''}. Tonight could run dry.`, { key: 'lowammo', icon: '🔸' });
}
const RANGE = { pistol: 4, revolver: 4.2, shotgun: 3, smg: 4.2, rifle: 6, assault: 5.2, bow: 5, crossbow: 5.5 };   /* V2.33: ranged weapons fire from a distance (tiles) */
const MELEE_R = (.45), ZREACH = (.45);   /* V3D.12: 3D bodies are bigger than the sprites; at .9 a bat swung at air two body-lengths away */
const rangeOf = (s) => { const w = weaponOf(s); return weaponRange(w) + (w && w.ranged && s.job === 'Police Officer' ? 1.5 : 0); };   /* 3D.67: Police Officers shoot 1.5 tiles further */
const weaponRange = (w) => (w && w.ranged ? w.range || RANGE[Object.keys(ITEMS).find((k) => ITEMS[k] === w)] || 4 : MELEE_R);
const gearFx = (s, fx) => !!s && SLOTS.some((sl) => { const it = itemOf(s, sl); return it && it.fx === fx; });   /* 3D.28 special gear effects */
const boxHid = (s) => gearFx(s, 'hide') && !s.moving && !['attack', 'chase', 'recover'].includes(s.mode);   /* 3D.149 Cardboard Box: zombies walk past a survivor standing still */
const carryBonus = (s) => (gearFx(s, 'carry2') ? 2 : gearFx(s, 'carry1') ? 1 : 0);
function stat(s, k) { let v = ((s.st && s.st[k]) || 5) + (hasSkill(s, 'jackOfAll') ? 1 : 0); for (const sl of SLOTS) { const it = itemOf(s, sl); if (it && it.st && it.st[k]) v += it.st[k]; } if (s.pet && PETS[s.pet.kind] && PETS[s.pet.kind].st[k]) v += PETS[s.pet.kind].st[k]; if (k === 'per' && gearFx(s, 'night') && isNight()) v += 2; return Math.max(1, v); }
const sMod = (s, k, per) => 1 + (stat(s, k) - 5) * per;   // 5 = average; each point above/below changes the effect by `per`
function itemScore(it) { if (!it) return 0; const w = it.slot === 'weapon' ? ((10 + .55 * (it.atk || 0)) / (it.rate || 1) - 10) * (it.ranged ? 1.6 : 1) : 0; return w + (it.def || 0) * 2.2 + Object.values(it.st || {}).reduce((a, v) => a + v * 3, 0); }   /* V3D.16: speed and range count */
function rollStats(job, l) { const st = {}; for (const k of STATS) st[k] = 2 + Math.floor(rnd() * 3); for (const k of (JOB_STATS[job] || [])) st[k] += 2 + Math.max(0, (l || 1) - 1); for (const k of STATS) st[k] = Math.min(STAT_CAP, st[k]); return st; }
const stashAdd = (id, n = 1) => { S.inv = S.inv || {}; S.inv[id] = (S.inv[id] || 0) + n; };
const stashTake = (id) => { if (!S.inv || !S.inv[id]) return false; S.inv[id]--; if (!S.inv[id]) delete S.inv[id]; return true; };
function equip(s, id) {   // move an item from the stash into its slot; the old item goes back to the stash
  const it = ITEMS[id]; if (!it || !stashTake(id)) return false; s.eq = s.eq || {}; const old = s.eq[it.slot]; if (old && old !== 'pipe') stashAdd(old); s.eq[it.slot] = id; if (it.mag) { s.ammo = 0; s.dry = false; reloadGun(s, it); s.reloadT = 0; } setMaxHp(s); return true;
}
function unequip(s, slot) { s.eq = s.eq || {}; const old = s.eq[slot]; if (!old || old === 'pipe') return false; stashAdd(old); s.eq[slot] = null; setMaxHp(s); return true; }
const FIGHTERS = new Set(['Guard', 'Police Officer', 'Scavenger']);   // everyone else hides from zombies unless cornered
const isFighter = (s) => FIGHTERS.has(s.job);
/* V2.43 personalities: one trait per survivor, fixed for life. Each bends a decision the AI already makes (fight range, falling back, rescues, breaks, sleep, food, friendships,
   expeditions), with an upside and a cost, so who you post where, who you arm and who you send out matters. */
const TRAITS = {
  brave:     { name: 'Brave', icon: '🦁', good: 'Engages zombies from 25% farther and fights on until 10% lower health', bad: 'Ends up hurt and downed more often', nf: 'Joins the militia even when hurt and fights on until 10% lower health' },
  cautious:  { name: 'Cautious', icon: '🛡️', good: 'Falls back 15% sooner, spots sneaking raiders sooner, 30% less likely to get hurt on expeditions', bad: 'Engages from 20% closer', nf: 'Falls back 15% sooner; 30% less likely to get hurt on expeditions' },
  diligent:  { name: 'Hard-working', icon: '⚒️', good: '+15% output at their post; puts up with more before taking a break', bad: 'Tires 20% faster' },
  caring:    { name: 'Caring', icon: '❤️', good: 'First to run to the downed, even past two zombies; friendships grow 50% faster', bad: 'Grieves harder when a friend dies' },
  loner:     { name: 'Loner', icon: '🐺', good: 'Hardly grieves; +25% expedition loot in a squad of 1–2', bad: 'Friendships grow at half speed' },
  eater:     { name: 'Big Eater', icon: '🍖', good: '+12 max HP', bad: 'Eats 30% more' },
  scrounger: { name: 'Scrounger', icon: '🔍', good: 'Finds a bit of scrap about every other day; +15% expedition loot', bad: '−10% output at a post' },
  owl:       { name: 'Night Owl', icon: '🦉', good: 'Stays up later; at night engages from 30% farther and spots raiders sooner', bad: '−15% output on the morning shift', nf: 'Stays up later at night (as a fighter: engages from 30% farther at night and spots raiders sooner)' },
};
const TRAIT_KEYS = Object.keys(TRAITS), hasT = (s, k) => !!s && s.trait === k;
function rollTrait(s) { let h = 7; for (const c of String(s.name) + ':' + (s.id || 0)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TRAIT_KEYS[h % TRAIT_KEYS.length]; }   /* stable for old saves */
const traitGood = (s) => { const t = TRAITS[s && s.trait]; return t ? (!isFighter(s) && t.nf ? t.nf : t.good) : ''; };
const traitIcon = (s) => (TRAITS[s && s.trait] ? TRAITS[s.trait].icon : '');
const traitTag = (s) => (s ? ` · ${ageOf(s)} yrs` : '') + (TRAITS[s && s.trait] ? ` · ${TRAITS[s.trait].icon} ${TRAITS[s.trait].name}` : '');   /* 3D.44 age shown */
const traitRange = (s) => (hasT(s, 'brave') ? 1.25 : hasT(s, 'cautious') ? .8 : 1) * (hasT(s, 'owl') && isNight() ? 1.3 : 1);
const traitSpot = (s) => (hasT(s, 'cautious') || (hasT(s, 'owl') && isNight()) ? 1.2 : 0);
const traitWork = (s) => (hasT(s, 'diligent') ? .15 : 0) - (hasT(s, 'scrounger') ? .1 : 0) - (hasT(s, 'owl') && S.hour >= 7 && S.hour < 12 ? .15 : 0);
const traitRetreat = (s) => (hasT(s, 'brave') ? -10 : hasT(s, 'cautious') ? 15 : 0);
const skillMaxHp = (s) => (hasSkill(s, 'bulwark') ? 20 : 0) + (hasSkill(s, 'hardy') ? 10 : 0) + (hasSkill(s, 'tough') ? 15 : 0) + (hasSkill(s, 'strongBack') ? 10 : 0);
const baseMax = (s) => Math.round((48 + 8 * (s.l || 1) + 2 * stat(s, 'end') + skillMaxHp(s) + (hasT(s, 'eater') ? 12 : 0)) * (s.job === 'Guard' ? 1.2 : 1));   /* 3D.67: Guards +20% health */   /* V2.14: Endurance adds HP */
const dmgReduce = (s) => (s && s.job !== undefined ? Math.min(.6, (((itemOf(s, 'armor') || {}).def || 0) + ((itemOf(s, 'head') || {}).def || 0) + ((itemOf(s, 'acc') || {}).def || 0)) * .03 + (stat(s, 'end') - 5) * .012 + (s.job === 'Guard' ? .2 : 0)) : 0);   /* armor + Endurance; 3D.67: Guards take 20% less */
const skillDmg = (s) => (hasSkill(s, 'brawler') ? 3 : 0) + (hasSkill(s, 'steadyAim') ? 4 : 0);
const xpMult = (s) => (hasSkill(s, 'quickLearner') ? 1.25 : 1) * Math.max(.7, sMod(s, 'int', .03));
function gainXp(s, n) { if (!s || n <= 0) return; s.mastery = (s.mastery || 0) + n * xpMult(s); masteryCheck(s); }
function learnSkills(s, quiet = false) {   // grant every skill this survivor has earned in any profession
  s.skills = s.skills || []; const got = [];
  for (const [k, sk] of Object.entries(SKILLS)) { const c = s.cls && s.cls[sk.from]; if (c && c.l >= sk.at && !s.skills.includes(k)) { s.skills.push(k); got.push(sk.name); } }
  if (got.length && !quiet) { note('routine', `${s.name} learned ${got.join(', ')} (kept in every profession).`, { at: s.w, float: '★ NEW SKILL', col: '#ffe38a' }); }
  return got;
}
function syncClass(s) { s.cls = s.cls || {}; s.cls[s.job] = { l: s.l || 1, xp: s.mastery || 0 }; }
function setMaxHp(s) { const f = s.max ? s.hp / s.max : 1; s.max = baseMax(s); s.hp = Math.max(s.hp > 0 ? 1 : 0, Math.min(s.max, Math.round(s.max * f))); }
function changeProfession(s, job) {   // keeps every class level and every learned skill
  if (!s || s.job === job || !professions[job]) return false;
  syncClass(s); const c = s.cls[job] || { l: 1, xp: 0 }; s.job = job; s.l = c.l; s.mastery = c.xp; s.mastered = c.l >= LEVEL_CAP;
  if (s.post && s.post.staff === s) { s.post.staff = null; } s.post = null; setMaxHp(s); syncClass(s);
  say(`${s.name} is now a ${job} (Lv.${s.l}).`, true); if (typeof autoStaff === 'function') autoStaff(); return true;
}
let cookT = -1, cookV = 1; const cookSave = () => { if (cookT !== tick) { cookT = tick; cookV = world.buildings.some((b) => DEFS[b.type] && DEFS[b.type].fam === 'kitchen' && !b.burnt && b.staff && b.staff.job === 'Cook') ? .85 : 1; } return cookV; };   /* 3D.67: a Cook running a kitchen makes the town's food go 15% further */
const ration = (s) => cookSave() * TUNE.eat * (RATION_BASE[s.job] || 1) * (1 + .06 * (Math.min(LEVEL_CAP, s.l || 1) - 1)) * (hasT(s, 'eater') ? 1.3 : 1);   // rations per day (half food, half water)
/* 3D.67 profession balance: the worker bonus checks the profession. Matching: +50% (+8% a level); a Civilian: +25% anywhere;
   anyone else is in the wrong job: -25% (owner: a small penalty). It used to give the full bonus to anyone. */
const fitOf = (b, s) => (STAFF_JOBS[DEFS[b.type].fam] || []).includes(s.job) ? 'match' : s.job === 'Civilian' ? 'civ' : 'wrong';
const fitBoost = (b, s) => { const f = fitOf(b, s); return f === 'match' ? workBoost(s) : f === 'civ' ? .25 : .75 / TUNE.work - 1; };   // wrong job: 75% of an empty slot's output
const workBoost = (s) => .5 + .08 * (Math.min(LEVEL_CAP, s.l || 1) - 1);                            // matching-profession output boost (+50%, +10% per level above 1)
const jobAI = { Civilian: { aggro: 3.0, rescue: 5, town: 1.35 }, Guard: { aggro: 6, rescue: 7, town: .65 }, Medic: { aggro: 3.3, rescue: 10, town: 1.1 }, Scavenger: { aggro: 4.3, rescue: 6, town: .8 }, 'Police Officer': { aggro: 6.8, rescue: 8, town: .55 } };
const zombieTypes = {
  walker: { name: 'Walker', hp: 30, atk: 4, aggro: 2.2, chase: .0125, reward: 18, ren: 1, weight: 58, alert: 4.5 },
  crawler: { name: 'Crawler', hp: 22, atk: 3, aggro: 1.8, chase: .0055,   /* 3D.34: drags itself on its arms, the slowest zombie */ reward: 16, ren: 1, weight: 20, alert: 3.5 },
  runner: { name: 'Runner', hp: 25, atk: 5, aggro: 3.2, chase: .027, reward: 25, ren: 2, weight: 12, alert: 6 },
  bloated: { name: 'Bloated', hp: 60, atk: 8, aggro: 2, chase: .009, reward: 40, ren: 3, weight: 6, alert: 4 },
  spitter: { name: 'Spitter', hp: 28, atk: 6, aggro: 3.7, chase: .0125, reward: 32, ren: 2, weight: 3, alert: 5.5 },
  thrower: { name: 'Thrower', hp: 46, atk: 9, aggro: 4.8, chase: .0105, reward: 45, ren: 3, weight: 2, alert: 6, desc: 'From four tiles: hits hard, slow to wind up. Throws rubble like it is angry at it.' },   /* 3D.126 the owner's Thrower model: a slow ranged zombie from day 12 */
  brute: { name: 'Brute', hp: 105, atk: 12, aggro: 2.4, chase: .008, reward: 70, ren: 5, weight: 1, alert: 5 },
  /* 3D.32 new zombies (from the story plan; weight 0 = not in normal waves yet, only the test page and later acts) */
  screamer: { name: 'Screamer', hp: 30, atk: 5, aggro: 3.6, chase: .013, reward: 30, ren: 3, weight: 0, alert: 9, isNew: 1, desc: 'The shriek hurts everyone within 2 tiles and calls a walker. Kill it fast from range. Knows one note.' },
  riot: { name: 'Riot Zombie', hp: 80, atk: 7, aggro: 2.4, chase: .011, reward: 45, ren: 4, weight: 2,   /* 3D.80 in waves from day 8 */ alert: 4.5, isNew: 1, desc: 'Blades and knives do half damage: use blunt weapons or guns. Still on duty.' },
  burnt: { name: 'Burnt Zombie', hp: 40, atk: 6, aggro: 2.6, chase: .013, reward: 35, ren: 3, weight: 0, alert: 5, isNew: 1, desc: 'Sets buildings it hits on fire; a Firefighter Coat and rain help. Still smouldering.' },
  dog: { name: 'Infected Dog', hp: 18, atk: 5, aggro: 4.2, chase: .034, reward: 22, ren: 2, weight: 4,   /* 3D.80 the user's dog model; in waves from day 4 */ alert: 6, isNew: 1, desc: 'Goes for workers at the trees and rocks; fences and Agility help. Not a good boy any more.' },
  alpha: { name: 'The Alpha', hp: 230, atk: 15, aggro: 4, chase: .012, reward: 0, ren: 20, weight: 0, alert: 8, isNew: 1, desc: 'Zombies near it move 20% faster; kill it and the horde breaks. Middle management of the dead.' },
  sporehead: { name: 'Sporehead', hp: 70, atk: 4, aggro: 2.8, chase: .011, reward: 40, ren: 3, weight: 3, alert: 5, desc: 'Every attack is claw, claw, headbutt: keep your distance or wall it off. Mushroom where the brain was.' },   /* 3D.37 the user's model; in waves from day 4 */
  lasher: { name: 'Lasher', hp: 34, atk: 5, aggro: 3.6, chase: .012, reward: 34, ren: 3, weight: 2, alert: 6, isNew: 1, desc: 'Hooks a shooter from 2 tiles and paralyses them for about 8 s. Kill it first; Guards often brace and hold. Arms too long, grudge against archers.' },   /* 3D.80 the user's model; from day 8 */
  rotbomb: { name: 'Rotbomb', hp: 45, atk: 5, aggro: 2.2, chase: .0095, reward: 30, ren: 3, weight: 2, alert: 4, isNew: 1, desc: 'Bursts on death, hurting everyone and every wall within 2 tiles, zombies too. Kill it at range or outside the walls. A clown full of rot.' },   /* 3D.80 the user's model; from day 9 */
  raider: { name: 'Raider', hp: 55, atk: 7, aggro: 2.6, chase: .019, reward: 0, ren: 3, weight: 0, alert: 0 },   /* V2.13: human raiders */
  boss: { name: 'Mutant Boss', hp: 260, atk: 14, aggro: 7.5, chase: .0085, reward: 0, ren: 25, weight: 0, alert: 7 },   /* V2.13: boss every 3rd night */
};

/* V3D.17 boss kinds: the name, look and feel change with the kind (look = the zombie skin it is drawn with) */
const BOSS_KINDS = {
  mutant:  { name: 'Mutant Zombie', look: 'boss', sc: 1.6, hp: 1, spd: 1, atk: 1, line: 'A Mutant Zombie has appeared!' },
  bloater: { name: 'Bloater Queen', look: 'bloated', sc: 1.55,   /* 3D.188 owner: a bit smaller (was 1.75) */ hp: 1.25, spd: .8, atk: .9, line: 'A Bloater Queen has appeared!' },
  stalker: { name: 'Stalker', look: 'stalker',   /* 3D.80 own model; 3D.86 owner: at least 1.5x a survivor */ sc: 1.5,   /* 3D.93 owner: slower all round */ hp: .7, spd: 1.6, atk: 1.1, run: true, line: 'A Stalker has appeared!' },
  butcher: { name: 'Butcher', look: 'brute', sc: 1.4,   /* 3D.188 owner: a bit smaller (was 1.55) */ hp: 1.1, spd: 1, atk: 1.25, line: 'The Butcher has appeared!' },
  gatling: { name: 'Gatling Boss', look: 'boss', sc: 1.6, hp: 1.2, spd: .85, atk: 1.2, line: 'The Gatling Boss has appeared!' },   /* 3D.143 owner: he is a zombie, not a Toll King */
};
const bossDefs = {};
const bossDef = (z) => bossDefs[z.bk] ||= { ...zombieTypes.boss, name: BOSS_KINDS[z.bk].name, chase: zombieTypes.boss.chase * BOSS_KINDS[z.bk].spd, atk: zombieTypes.boss.atk * BOSS_KINDS[z.bk].atk };
/* V3D.17 building health: zombies and raiders bash buildings; at 0 the building is wrecked (works again once repaired).
   Each zombie kind has an alert radius: how far it notices people sheltering in a building (noise, smell). */
const bMax = (b) => Math.round((70 + (DEFS[b.type].mat || 5) * 7) * (1 + .3 * ((b.lvl || 1) - 1)));
const bHp = (b) => { if (b.max == null || b.max !== bMax(b)) { const f = b.max ? (b.hp ?? b.max) / b.max : 1; b.max = bMax(b); b.hp = Math.round(b.max * f); } if (b.hp == null) b.hp = b.max; return b.hp; };
const occupied = (b) => S.sv.some((q) => insideBuilding(q) === b);
/* 3D.61 owner: repairs use what the building is made of: wood for every building, stone for the stone (tier 2+) ones, plus its scrap */
function repMix(b) { const c = bCost(DEFS[b.type]), m = {}; for (const k of ['wood', 'stone', 'mat']) if (c[k]) m[k] = c[k]; if (!m.mat && !m.wood) m.mat = DEFS[b.type].mat || 5; if (!m.wood) m.wood = Math.max(2, Math.round((m.mat || 4) * .6)); return m; }
function repCostFrac(b, f) { const m = repMix(b), c = {}; for (const [k, v] of Object.entries(m)) { const n = Math.ceil(v * f); if (n > 0) c[k] = n; } if (!Object.keys(c).length) c.wood = 1; return c; }
const fixCost = (b) => (b.burnt ? repairCost(b) : repCostFrac(b, (1 - bHp(b) / b.max) * .5));
function repStep(b) {   // the material for the next 12 HP patch: whichever of the building's materials is least used so far
  const m = repMix(b), u = b.repUse || (b.repUse = {}); return Object.keys(m).sort((x, y) => (u[x] || 0) / m[x] - (u[y] || 0) / m[y])[0]; }
function hitBuilding3(b, dmg, by) {
  if (!b || b.burnt) return; bHp(b); dmg = Math.max(1, Math.round(dmg)); if (S.nightLog && isNight()) S.nightLog.dmg += Math.min(dmg, b.hp); b.hp = Math.max(0, b.hp - dmg); b.hitT = 12; b.lastHit = tick; floats.push({ w: { x: b.x + b.w / 2 + (rnd() - .5) * .6, y: b.y + b.h / 2 }, t: '-' + Math.round(dmg), col: '#ffb27a', a: 45 }); if (tick % 3 === 0) SFX('hit');
  if (occupied(b) && tick - (b.sosT || -9999) > 900) { b.sosT = tick; const q = S.sv.find((x) => insideBuilding(x) === b); note('critical', `🆘 SOS from the ${DEFS[b.type].name}`, { key: 'sos' + b.x + ',' + b.y, icon: '🆘', log: `${q ? q.name : 'Someone'} is trapped in the ${DEFS[b.type].name} while ${by} breaks in. Fighters are answering.`, at: () => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 }), live: () => tick - b.lastHit < 300, threats: true }); }
  if (b.hp < b.max * .3) for (const q of S.sv) if (q.mode === 'hiding' && q.hideAt === b) slipOut(q, b);   /* 3D.48; 3D.64 balance study: a big hit that took a building from above 30% straight to 0 threw the people hiding inside out among the zombies (the commonest way to go down); now they slip out first */
  if (b.hp <= 0) wreck(b, by);
}
/* 3D.48 Radio for help: the Camp's radio (a Radio Tower answers faster) calls a neighbouring group. Their team arrives in an
   hour, clears the zombies in town and brings the fallen into care; two days later they ask for a favour. Once every 3 days
   (2 with a Radio Tower); refuse the favour and they won't answer again for a week. */
const HELP_COST = { food: 15, water: 10 };
function helpReady() { const h = S.help || {}; return !h.coming && !(h.owe) && (h.next || 0) <= S.day && !!campB(); }
function lastStandNote() {
  if ((S.help || {}).offered === S.day + ':' + Math.floor(S.hour)) return; (S.help = S.help || {}).offered = S.day + ':' + Math.floor(S.hour);
  const downN = S.sv.filter((q) => q.mode === 'down').length; note('critical', '🫣 The last ones standing are hiding', { key: 'laststand', live: () => lastStand(), log: `${downN} down, too few left to fight. They hide until the zombies move on, then go for the fallen.` });
  if (helpReady() && !modalOpen) showEventPopup({ title: '📻 CALL FOR HELP?', text: `${downN} of your people are down and the rest are hiding. A group on the radio says they can send a team in ${bOf('radio').length ? 'half an hour' : 'an hour'}. In two days they'll ask for a favour (${HELP_COST.food} food and ${HELP_COST.water} water).`,
    buttons: [{ label: '📻 Call them', fn: () => radioHelp() }, { label: 'We can manage', fn: () => {} }] });
}
function radioHelp() {
  if (!helpReady()) { say((S.help || {}).owe ? 'You still owe them a favour.' : 'Nobody answers. Try again in a day or two.'); return false; }
  const fast = bOf('radio').length > 0; S.help = { ...(S.help || {}), coming: tick + (fast ? 500 : 1000), next: S.day + (fast ? 2 : 3) };
  note('critical', '📻 Help is on the way', { key: 'helpcoming', live: () => !!(S.help && S.help.coming), log: `A rescue team is coming (${fast ? 'about half an hour' : 'about an hour'}). Hold on.` }); banner('📻 HELP IS COMING'); saveGame(); return true;
}
/* 3D.246 (owner, 21 Nov, W172): a town is never lost. When every survivor in town is down (nobody left to carry anyone), the neighbours
   come by themselves, without being called, whatever is owed and even with the Camp wrecked (3D.251), at most once every AUTO_HELP_DAYS game days. They ask the same favour.
   (2 of 10 bot towns bled out to the last person: docs/project/12-LONG-RUN.md. The truck of W129 will replace how they arrive.) */
const AUTO_HELP_DAYS = 3;
/* 3D.288 (owner, 19 Nov, W129 B; look C, W228): the rescue no longer kills zombies out of sight. Greenwater's farm truck drives in off the
   highway with its horn and alarm going; the zombies in town turn toward it; when it drives back out it crawls down the highway at a
   zombie's pace and the zombies follow it off the map (the car-alarm lure, on wheels). S.truck = { path, i, leg: 'in' | 'stop' | 'out', t }. */
const TRUCK = { inSpd: .05, outSpd: .022, stop: 240, stopMax: 6000, honk: 150, lead: 3.5, wait: 9000 };
function truckRoute() {   /* from the highway's east end to the Camp (or the middle of town), on the road where it can */
  const end = { x: COLS - 1, y: Wd.HWY_Y }, c = campB(), to = c ? Wd.approachTile(c) : tileOf(townCentre()), p = Wd.findPath(world, end, to);
  if (!p || !p.length) return null; const all = [end, ...p]; return all.slice(0, Math.max(2, all.length - 2)).map((q) => ({ x: q.x + .5, y: q.y + .5 })); }   /* it parks two tiles short of the Camp's door, not on top of it */
function truckStart() {
  for (const q of S.sv) if (q.mode === 'down') { q.stable = true; q.why = 'Help is coming: Greenwater is nearly here'; }   /* the bleed stops: their medic talks the town through it on the radio */
  const path = truckRoute(); if (!path) { (S.help ||= {}).arrived = true; return; }   /* no way in for a truck: the team comes on foot as before */
  S.truck = { path, i: 0, leg: 'in', t: 0 }; SFX('caralarm'); banner('🚚 GREENWATER IS HERE'); }
function admitRescued(q) { const b = careDest(); q.careAt = b; q.w = { ...sitePoint(b) }; q.mode = 'hospital'; q.hp = Math.max(1, q.hp); q.bleed = null; q.rescuer = null; q.stateTicks = careTicks(b); q.careTotal = q.stateTicks; q.why = 'Brought in by the Greenwater medics'; }
/* 3D.306 (W129): "their medics carry the fallen into care". Two Greenwater medics get out of the parked truck, each walks to someone who is
   down, loads them on a stretcher cart and wheels them to the medical building (or the Camp), then fetches the next; when nobody is left
   down they walk back and the truck leaves. A medic remembers who they carry by id (the save file keeps no links between people).
   If it takes longer than TRUCK.stopMax, whoever is still down is taken in at once and the medics climb back in. */
const MEDIC = { n: 2, spd: .045, load: 50 };
function truckMedics() { const T = S.truck; if (!T || T.medics) return; const at = truckAt();
  T.medics = Array.from({ length: MEDIC.n }, (_, i) => ({ id: 90001 + i, medic: true, human: true, name: ['Rosa', 'Abe'][i] || 'Medic', w: { x: at.x + (i ? .6 : -.6), y: at.y + .7 }, mode: 'go', carryId: null, carrying: null, t: 0 })); }
const downFree = (me) => S.sv.filter((q) => q.mode === 'down' && !(q.rescuer && q.rescuer !== me && (q.rescuer.medic || q.rescuer.mode === 'rescueTo' || q.rescuer.mode === 'rescueCarry')));   /* not one someone else is already fetching */
function medicsTick(T) {
  const home = truckAt(); let busy = 0;
  for (const m of T.medics) {
    if (m.carryId != null && !m.carrying) { m.carrying = S.sv.find((q) => q.id === m.carryId) || null; if (m.carrying) m.carrying.rescuer = m; else { m.carryId = null; m.mode = 'go'; } }   /* after a load */
    if (m.mode === 'in') continue;
    if (m.mode === 'go') { const q = m.target && m.target.mode === 'down' && m.target.rescuer === m ? m.target : downFree(m).sort((a, b) => dist(a.w, m.w) - dist(b.w, m.w))[0];
      if (!q) { m.target = null; m.mode = 'back'; } else { m.target = q; q.rescuer = m; busy++; m.why = `Fetching ${q.name}`;
        if (followPath(m, q.w, MEDIC.spd) !== 'moving' || dist(m.w, q.w) < .7) { if ((m.t += 1) >= MEDIC.load) { m.t = 0; m.mode = 'rescueCarry'; m.carrying = q; m.carryId = q.id; m.target = null; q.why = 'On a Greenwater stretcher'; } } } }
    if (m.mode === 'rescueCarry') { busy++; const q = m.carrying; if (!q || q.mode !== 'down') { m.carrying = null; m.carryId = null; m.mode = 'go'; continue; }
      q.rescuer = m;   /* the downed person's own tick lets go of a rescuer it does not know; the medic keeps hold */
      const dest = sitePoint(careDest()), r = followPath(m, dest, MEDIC.spd * .85); q.w = { ...m.w };
      if (r !== 'moving' || dist(m.w, dest) < .8) { admitRescued(q); m.carrying = null; m.carryId = null; m.mode = 'go'; floats.push({ w: { ...m.w }, t: `🩹 ${q.name} is in care`, col: '#9be37b', a: 90 }); } }
    if (m.mode === 'back') { if (downFree(m).length) { m.mode = 'go'; continue; } if (followPath(m, home, MEDIC.spd) !== 'moving' || dist(m.w, home) < .9) m.mode = 'in'; else busy++; }
  }
  return busy; }
const truckAt = () => { const T = S.truck; if (!T) return null; const P = T.path, i = Math.min(P.length - 2, Math.floor(T.i)), f = Math.min(1, T.i - i), a = P[i], b = P[i + 1] || a; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, yaw: Math.atan2(b.y - a.y, b.x - a.x) }; };
function truckFollowers() { return S.z.filter((z) => z.hp > 0 && !z.zoo && !z.human && (Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)) || nearTown(z.w))); }
function truckLead() {   /* every zombie in town turns to follow the truck out (they walk down the highway and off the map) */
  const exit = { x: COLS - .5, y: Wd.HWY_Y + .5 + (rnd() < .5 ? 1 : 0) }; let n = 0;
  for (const z of truckFollowers()) { z.mode = 'zleave'; z.retreat = true; z.truck = true; z.siege = false; z.mob = false; z.target = null; z.path = null; z.wallT = null; z.bldT = null; z.lure = null; z.leaveTo = { ...exit }; n++; }
  if (S.truck) S.truck.led = n; return n; }
function truckTick() {
  const T = S.truck; if (!T) return; const P = T.path, at = truckAt(); T.t++;
  if (T.t % TRUCK.honk === 0) { SFX('caralarm'); if (!floats.some((f) => f.honk)) floats.push({ w: { ...at }, t: '📯 HONK HONK', col: '#ffd84a', a: 90, honk: true }); }   /* one at a time */
  if (T.leg === 'in' || T.leg === 'stop') { if (tick % 30 === 0) for (const z of truckFollowers()) if (!z.lure && z.mode !== 'zleave') { z.lure = { x: at.x, y: at.y }; z.lureUntil = tick + 120; }   /* the noise turns heads as it comes */
    if (T.leg === 'in') { T.i += TRUCK.inSpd; if (T.i >= P.length - 1) { T.i = P.length - 1; T.leg = 'stop'; T.t = 0; truckMedics(); (S.help ||= {}).arrived = true; } return; } }
  if (T.leg === 'stop') { const busy = T.medics ? medicsTick(T) : 0;
    if (T.t >= TRUCK.stopMax) { for (const q of S.sv) if (q.mode === 'down') admitRescued(q); for (const m of T.medics || []) { if (m.carrying) m.carrying.rescuer = null; m.mode = 'in'; } }   /* taking too long: the rest are taken in at once */
    else if (T.t < TRUCK.stop || busy || (T.medics && T.medics.some((m) => m.mode !== 'in'))) return;
    T.medics = null; T.leg = 'out'; T.path = P.slice().reverse(); T.i = 0; T.t = 0; truckLead(); return; }
  { const fs = S.z.filter((z) => z.truck && z.hp > 0), near = fs.length ? Math.min(...fs.map((z) => dist(z.w, at))) : 0; if (near > TRUCK.lead && T.t < TRUCK.wait) return; }   /* it leads: it waits for the nearest follower to catch up (at most TRUCK.wait ticks in all) */
  T.i += TRUCK.outSpd; if (T.i >= P.length - 1) { S.truck = null; const left = S.z.filter((z) => z.truck && z.hp > 0).length; note('important', `🚚 The truck is gone down the highway${left ? `; ${left} zombie${left === 1 ? ' is' : 's are'} still shuffling after it` : ' and the town is quiet'}.`); }
}
function helpTick() {
  { const h0 = S.help || {};
    if (!h0.coming && (h0.auto || 0) <= S.day && S.sv.some((q) => q.mode === 'down') && S.sv.every((q) => q.mode === 'down' || q.mode === 'hospital')) {
      S.help = { ...h0, coming: tick + 300, auto: S.day + AUTO_HELP_DAYS, self: true };
      note('critical', '📻 Nobody is left standing: help is on the way', { key: 'helpcoming', live: () => !!(S.help && S.help.coming), log: 'The Haven went quiet on the radio. The neighbours are coming without being asked.' }); banner('📻 HELP IS COMING'); } }
  const h = S.help; if (!h) return;
  if (h.coming && tick >= h.coming && !S.truck) { h.coming = 0; truckStart(); }
  if (h.arrived) { h.arrived = false; const led = S.truck ? truckFollowers().length : truckLead();   /* 3D.306: they follow when it drives off; until then the horn holds them round the truck */
    let saved = 0; if (S.truck) { saved = S.sv.filter((q) => q.mode === 'down').length; truckMedics(); }   /* 3D.306: their medics get out and carry the fallen in */
    else for (const q of S.sv) if (q.mode === 'down') { admitRescued(q); saved++; }   /* no truck (no road in): as before */
    h.owe = { day: S.day + 2, ...HELP_COST }; SFX('rescued');
    const self = h.self; h.self = false;
    showEventPopup({ title: '🚚 GREENWATER\'S TRUCK ARRIVED', text: `${self ? 'Nobody answered the radio, so they came anyway. ' : ''}${led ? `Horn blaring, they are leading ${led} zombie${led === 1 ? '' : 's'} out of town down the highway` : 'The streets were clear'}, and their medics ${S.truck ? 'are carrying' : 'carried'} ${saved} of your people into care. "Two days from now, we'll come by for that favour."` });
  }
  if (h.owe && S.day >= h.owe.day && !modalOpen) { const o = h.owe; h.owe = null;
    showEventPopup({ title: '📻 THEY CAME FOR THE FAVOUR', text: `The group that saved your people asks for ${o.food} food and ${o.water} water.`, buttons: [
      { label: `Pay (${o.food} 🍖 ${o.water} 💧)`, disabled: !canPay({ food: o.food, water: o.water }), fn: () => { pay({ food: o.food, water: o.water }); renownGain(5, 'Kept your word'); result('🤝 SQUARED AWAY', 'They nod. "Call us if you need us."'); } },
      { label: 'Refuse', fn: () => { h.next = S.day + 7; for (const q of S.sv) { q.sat = Math.max(0, (q.sat || 0) - 4); moodAdd(q, -4, 'refused the radio'); } result('📻 NO MORE FAVOURS', "They won't answer the radio for a week. Your people feel bad about it."); } }] }); }
}
function slipOut(q, b) {   /* out the back to the next shelter, away from the zombies; nowhere left = cornered */
  const zs = S.z.filter((z) => z.hp > 0 && !z.zoo); let best = null, bs = -1e9;
  for (const o of world.buildings) { if (o === b || !ENCLOSED(o) || o.burnt || (o.hp != null && o.hp < o.max * .3)) continue; const dp = Wd.doorPoint(o), sc = Math.min(9, ...zs.map((z) => dist(z.w, dp))) - dist(q.w, dp) * .3; if (sc > bs) { bs = sc; best = o; } }
  { const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, nz = zs.slice().sort((p, r) => dist(p.w, c) - dist(r.w, c))[0], ap = Wd.approachPoint(b);   /* 3D.64 balance study: out the BACK, away from the zombies (the front door put them in the middle of the mob: 'hiding' was the commonest state just before going down) */
    let w = ap; if (nz) { const dx = c.x - nz.w.x, dy = c.y - nz.w.y, l = Math.hypot(dx, dy) || 1, r = Math.max(b.w, b.h) / 2 + .55, p = { x: c.x + dx / l * r, y: c.y + dy / l * r }; if (Wd.inMap(Math.floor(p.x), Math.floor(p.y)) && Wd.walkable(world, Math.floor(p.x), Math.floor(p.y)) && !Wd.buildingAt(world, Math.floor(p.x), Math.floor(p.y))) w = p; } q.w = { ...w }; }
  if (best) { q.mode = 'hide'; q.hideAt = best; q.stateTicks = 9999; q.path = null; q.why = `Slipped out of the ${DEFS[b.type].name} → ${DEFS[best.type].name}`; note('critical', `${q.name} slipped out of the ${DEFS[b.type].name} before it fell.`, { at: () => q.w, live: () => q.hp > 0 && S.sv.includes(q) && q.mode === 'hide' && q.hideAt === best }); }   /* 3D.233 owner (19 Nov): these rows could not be closed and piled up; the row now goes once they reach the other shelter (or anything else happens to them) */
  else { const z = nearestZombie(q); q.hideAt = null; if (z) { hideGuard = true; engage(q, z); hideGuard = false; q.why = 'Nowhere left to hide: fighting'; } else enterFree(q, 30); }
}
function wreck(b, by) {
  b.hp = 0; b.burnt = true; b.wrecked = true; b.fire = 0; releasePost(b); ejectFrom(b); Wd.bump(world); SFX('breach');
  note('critical', '🏚 ' + DEFS[b.type].name + ' wrecked', { key: 'wreck' + b.x + ',' + b.y, at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, live: () => b.burnt && world.buildings.includes(b),   /* 3D.41: the note goes away once it's repaired (or removed) */ log: `${by ? by.charAt(0).toUpperCase() + by.slice(1) : 'Zombies'} wrecked the ${DEFS[b.type].name}. It does nothing until repaired (tap it, ${costShort(repairCost(b))}).` });
}
function bashTarget(z, d, any) {   /* the building a zombie goes for: one with people inside within its alert radius, or (marching) whatever it bumps into */
  if ((z.bored || 0) > tick) return null;   /* 3D.48: gave up on a quiet building a moment ago */
  let best = null, bs = 1e9;
  for (const b of world.buildings) { if (b.burnt) continue; const cx = Math.max(b.x, Math.min(b.x + b.w, z.w.x)), cy = Math.max(b.y, Math.min(b.y + b.h, z.w.y)), dd = Math.hypot(z.w.x - cx, z.w.y - cy);
    const occ = enclosedB(b) && occupied(b); if (!occ || !(dd < (d.alert || 4) || (any && dd < 1.6))) continue;   /* V3D.21: only a building with someone inside (an empty one is left alone) */ const sc = dd - (occ ? 3 : 0); if (sc < bs) { bs = sc; best = b; } }
  return best;
}
function bashSpot(z, b) {   /* a walkable tile next to the building, nearest the zombie */
  let best = null, bd = 1e9; for (let x = b.x - 1; x <= b.x + b.w; x++) for (let y = b.y - 1; y <= b.y + b.h; y++) { if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) continue; if (!Wd.walkable(world, x, y, true)) continue; const c = tc(x, y), dd = dist(c, z.w) + (S.z.some((o) => o !== z && o.bldT === b && o.bpt && dist(o.bpt, c) < .3) ? 3 : 0); if (dd < bd) { bd = dd; best = c; } }
  return best;
}
function startBash(z, b) { const p = bashSpot(z, b); if (!p) return false; z.mode = 'zbash'; z.bldT = b; z.bpt = p; z.path = null; z.target = null; z.stateTicks = 30; return true; }
/* fighters answer: any zombie or raider bashing a building pulls in the nearest free fighters (up to two each); at night guards leave bed for it */
function answerSOS() {
  const hits = S.z.filter((z) => z.hp > 0 && (z.mode === 'zbash' || z.mode === 'rsmash')); if (!hits.length) return;
  for (const z of hits) {
    const on = S.sv.filter((q) => q.target === z && ['chase', 'attack', 'recover'].includes(q.mode)).length; if (on >= 3) continue;   /* 3D.41: up to three fighters per attacker */
    const c = S.sv.filter((q) => isFighter(q) && !q.errand && canFight(q) && !q.carrying && !q.rescuing && (['free', 'wait', 'walk', 'postCombat', 'pitch', 'chat', 'campfire', 'goFacility'].includes(q.mode) || ['useFacility', 'hiding'].includes(q.mode) || q.sleeping || (q.mode === 'work' && isNight())) && dist(q.w, z.w) < 20 && !(q.skipZ && q.skipZ.z === z && q.skipZ.t > tick))   /* 3D.180 bug A2: a fighter who has just found there is no way to this one is not sent straight back at it (the angry face flashed above them again and again) */   /* 3D.41 owner: a building under attack wakes the fighters, however tired */
      .sort((a, b) => dist(a.w, z.w) - dist(b.w, z.w)).slice(0, 3 - on);
    for (const q of c) { if (insideBuilding(q)) { const bb = insideBuilding(q); q.facility = null; q.hideAt = null; q.w = { ...Wd.approachPoint(bb) }; } if (q.mode === 'chat') endChat(q); if (q.mode === 'pitch') endPitch(q); if (q.sleeping) { q.sleeping = false; bark(q, 'wake', {}, { pri: 2 }); } q.fleeT = 0; engage(q, z); q.why = `Answering the SOS at the ${DEFS[(z.bldT || z.goalB || {}).type]?.name || 'building'}`; emote(q, '😤', 60); }
  }
}
function engineerRepairs() {   /* idle Engineers patch damaged buildings: 1 wood, stone or scrap per 12 HP (3D.61: the building's own materials) */
  const dmg = world.buildings.filter((b) => !b.burnt && bHp(b) < b.max && tick - (b.lastHit || -9999) > 600 && (S[repStep(b)] || 0) >= 1); if (!dmg.length) return;
  for (const q of S.sv) { if (q.job !== 'Engineer' || !['free', 'wait', 'walk'].includes(q.mode) || q.sleeping || q.purpose || q.carriedLoot || isNight() || insideBuilding(q) || threatOf(q)) continue;   /* 3D.63: not out of bed, not mid-delivery */ const b = dmg.sort((a, c) => dist(q.w, Wd.approachPoint(a)) - dist(q.w, Wd.approachPoint(c)))[0]; q.mode = 'fix'; q.fixB = b; q.path = null; q.why = 'Repairing the ' + DEFS[b.type].name; return; }
}
function fixTick(s) {
  if (s.fixW) { fixWallTick(s); return; }
  const b = s.fixB; if (!b || !world.buildings.includes(b) || b.burnt || bHp(b) >= b.max || threatOf(s)) { s.fixB = null; s.activity = null; enterFree(s, 30); return; }
  const r = followPath(s, Wd.approachPoint(b), WALK); if (r === 'moving') return; if (r === 'fail') { s.fixB = null; enterFree(s, 60); return; }
  s.moving = false; s.activity = 'Building'; if (tick % Math.round(40 / TUNE.work) === 0) { const rk = repStep(b); if ((S[rk] || 0) < 1) { floats.push({ w: { ...s.w }, t: 'Needs ' + RES_ICON[rk] + ' ' + RES_NAME[rk], col: '#ff8a7a', a: 80 }); s.fixB = null; s.activity = null; enterFree(s, 60); return; } b.hp = Math.min(b.max, b.hp + 12); S[rk] -= 1; b.repUse[rk] = (b.repUse[rk] || 0) + 1; if (b.hp >= b.max) b.repUse = {}; flow(rk, 'Repairs', -1); ui(); floats.push({ w: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, t: '+12', col: '#9fe08a', a: 40 }); }
}
const zDef = (z) => (z.bk && BOSS_KINDS[z.bk] ? bossDef(z) : zombieTypes[z.type] || zombieTypes.walker);
const TOWN_EVENT_DEFS = [
  { id: 'caravan', name: 'Trader Caravan', text: 'A caravan leaves food and water.', food: 3, water: 3, ren: 2 },
  { id: 'supplies', name: 'Supply Cache', text: 'Scavengers uncover some useful scrap.', mat: 2, ren: 1 },
  { id: 'rumor', name: 'Safe Haven Rumor', text: 'Word of the Haven spreads.', ren: 4 },
];
const rankRules = [{ rank: 1, ren: 0, income: 0, residents: 0, facilities: 0 }, { rank: 2, ren: 60, income: 40, residents: 2, facilities: 6 }, { rank: 3, ren: 200, income: 160, residents: 3, facilities: 10 }, { rank: 4, ren: 450, income: 400, residents: 5, facilities: 15 }, { rank: 5, ren: 900, income: 800, residents: 7, facilities: 20 }];   // income = supplies produced

