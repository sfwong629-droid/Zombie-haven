/* Zombie Haven 3D.27 — survivor lines ("barks"): what people say out loud when things happen.
   Shown in Bunker Comic speech bubbles over their heads (drawn in game.js: drawBark). All offline, no AI.
   Placeholders: {other} another survivor's name · {b} a building · {n} a number · {r} a resource · {dest} a place.
   Each key is an event; the game picks a random line, never the same one twice in a row.
   style: talk (round bubble) · shout (jagged, yellow) · think (cloud) · whisper (dashed). */
window.ZH_BARKS = {
  /* ---------------- day & night ---------------- */
  morning: { style: 'talk', lines: [
    'Morning, Haven!', 'Still alive. Good start.', 'Who made coffee? Nobody? Figures.', 'Sun\'s up. Let\'s get to work.', 'Rise and shine, people!',
    'I dreamed of pancakes again.', 'Another day, another wall.', 'Count heads… all here? Good.', 'Birds are singing. That\'s a good sign.', 'My back hurts. Let\'s go.',
    'Big day today. I can feel it.', 'Somebody check the barrels.', 'Day {n}. Not bad, us.', 'Who snored all night? Be honest.', 'Breakfast is… beans. Again.'] },
  dusk: { style: 'talk', lines: [
    'Getting dark. Wrap it up!', 'Everyone inside soon!', 'Sun\'s going. So am I.', 'Lock the gate, please.', 'Light the fire!',
    'Night\'s coming. Stay close.', 'Last load, then home.', 'I hate this part of the day.', 'Who\'s on watch tonight?', 'Torches up, folks.'] },
  night: { style: 'whisper', lines: [
    'Did you hear that?', 'Something\'s moving out there…', 'Stay quiet. Stay alive.', 'I can\'t sleep with that groaning.', 'Is the gate shut? Check again.',
    'Shh… listen.', 'Too quiet. I don\'t like it.', 'Keep the fire going.', 'Stars are pretty tonight, at least.', 'Wake me if they come.'] },
  dawn: { style: 'talk', lines: [
    'We made it through the night!', 'Dawn! Ha! Still here!', 'That was a long night.', 'Never been so happy to see the sun.', 'Night survived. Breakfast earned.',
    'Everyone okay? Sound off!', 'Phew. Okay. Phew.', 'They\'re pulling back!'] },
  horde: { style: 'shout', lines: [
    'Horde coming! Get ready!', 'Here they come!', 'Everybody to the walls!', 'That\'s a LOT of them!', 'Hold the line!',
    'Positions, people!', 'Nobody panic! Okay, panic a little!', 'They\'re at the edge of town!', 'Barricade the gate!', 'Stick together!'] },
  boss: { style: 'shout', lines: [
    'What IS that thing?!', 'That one\'s HUGE!', 'Big one! Big one!', 'Oh no. Oh no no no.', 'Everyone on the big guy!', 'I\'m gonna need a bigger stick!'] },

  /* ---------------- weather ---------------- */
  rain: { style: 'talk', lines: [
    'Rain! Barrels will fill up.', 'Free water from the sky!', 'Great. Wet socks again.', 'Smells like rain.', 'Get the buckets out!',
    'At least the zombies get wet too.', 'Rain\'s good for the crops.', 'My hair is ruined.'] },
  storm: { style: 'shout', lines: ['Storm! Get under a roof!', 'That thunder\'s close!', 'Tie everything down!', 'Hold onto your hats!'] },
  snow: { style: 'talk', lines: ['Snow! Brr…', 'My fingers are ice.', 'Pretty, but cold.', 'Somebody make a snowman. A nice one.', 'Fire. Need. Fire.'] },
  rainStop: { style: 'talk', lines: ['Rain stopped.', 'Sun\'s back!', 'Okay, back to it.', 'Puddles everywhere. Lovely.'] },

  /* ---------------- needs ---------------- */
  hungry: { style: 'think', lines: [
    'So hungry…', 'My stomach is growling.', 'I\'d eat a boot right now.', 'When\'s dinner?', 'I miss pizza…',
    'Food. Food. Food.', 'Is that a can of beans? Mine.', 'I could eat a horse. A small one.'] },
  thirsty: { style: 'think', lines: ['Need water…', 'My throat is sand.', 'Just one sip…', 'Is the barrel full?', 'So thirsty.'] },
  tired: { style: 'think', lines: [
    'So tired…', 'Need a nap. A long one.', 'My eyes keep closing.', 'Five more minutes…', 'I could sleep standing up.', 'Yawn…'] },
  hurt: { style: 'talk', lines: [
    'Ow. Ow. Ow.', 'I need a bandage.', 'That\'s gonna leave a mark.', 'I\'m okay! Mostly.', 'Somebody patch me up?', 'Just a scratch. A big scratch.'] },
  eat: { style: 'talk', lines: ['Mmm! Delicious!', 'Best beans ever.', 'Ahh, that hits the spot.', 'Who cooked? Thank you!', 'Food is life.', 'Seconds, please!'] },
  drink: { style: 'talk', lines: ['Ahh, fresh water!', 'Much better.', 'Water never tasted so good.', 'Refreshing!'] },
  sleep: { style: 'think', lines: ['Goodnight, Haven…', 'Zzz…', 'Finally. Bed.', 'Wake me if anything explodes.'] },
  wake: { style: 'talk', lines: ['Who\'s up? I\'m up.', 'Okay! I\'m awake! Mostly.', 'Slept like a log.', 'What did I miss?'] },
  healed: { style: 'talk', lines: ['Good as new!', 'Thanks, doc!', 'All patched up.', 'Feeling much better.', 'Back in action!'] },

  /* ---------------- town supplies ---------------- */
  lowFood: { style: 'talk', lines: ['We\'re running out of food!', 'The pantry is almost empty.', 'We need more farms.', 'Rationing again?', 'Somebody find food!'] },
  lowWater: { style: 'talk', lines: ['Water\'s nearly gone!', 'We need more rain barrels.', 'Barrels are dry!', 'No water, no Haven.'] },
  full: { style: 'talk', lines: ['Storage is full!', 'Where do I put this?', 'We need more storage.', 'No room for more {r}!'] },
  rich: { style: 'talk', lines: ['Look at all this stuff!', 'We\'re doing great!', 'Never had so much {r}.', 'The Haven is thriving!'] },

  /* ---------------- gathering ---------------- */
  chop: { style: 'talk', lines: [
    'Timber!', 'Chop chop!', 'This tree had it coming.', 'Good wood!', 'Sorry, tree.', 'Fresh logs coming!',
    'One more swing…', 'Watch your heads!', 'Wood for the Haven!', 'Splinters. Great.'] },
  mine: { style: 'talk', lines: ['Rock and roll!', 'Solid stone!', 'Hard work, hard rock.', 'Clang! Clang!', 'This one\'s a good one.', 'Stone for the walls!', 'My arms are made of jelly now.'] },
  wreck: { style: 'talk', lines: ['Good scrap in this one!', 'Old car, new parts.', 'Rust everywhere…', 'Found some bolts!', 'This used to be somebody\'s ride.', 'Scrap is scrap!'] },
  bin: { style: 'talk', lines: ['Clothes! Kind of clean ones!', 'Ew. But useful.', 'Found some cloth!', 'Nice sweater. Mine now.', 'Smells like grandma\'s attic.'] },
  fuel: { style: 'shout', lines: ['Fuel! There\'s fuel in it!', 'Jackpot! Fuel!', 'Still got gas in the tank!'] },
  foundRare: { style: 'talk', lines: ['Found {n} {r}!', 'Look! {r}!', 'Lucky find!', 'This is rare stuff!', 'Today\'s my lucky day!'] },
  haul: { style: 'talk', lines: ['Delivery!', 'Coming through!', 'Heavy, heavy, heavy…', 'Special delivery for the {b}!', 'Where do you want it?'] },
  mark: { style: 'talk', lines: ['On it!', 'I\'ll grab that one.', 'Got it, boss!', 'That one? Sure!', 'Consider it done.'] },
  tool: { style: 'talk', lines: ['New tools! Look at this beauty!', 'This changes everything!', 'Work just got easier.', 'Shiny!', 'Now we\'re talking!'] },

  /* ---------------- building ---------------- */
  hammer: { style: 'talk', lines: [
    'Hammer time!', 'Bang bang bang!', 'Building the {b}!', 'Hold this. No, the other end.', 'Measure twice, hammer once.',
    'Ow! My thumb!', 'Almost there!', 'Nails! Who has nails?', 'This will be beautiful.', 'Straight-ish. Good enough.'] },
  built: { style: 'shout', lines: [
    'The {b} is done!', 'We built it!', 'Look at that {b}!', 'Finished! High five!', 'Built to last! I think.',
    'Another one for the Haven!', 'Not bad, right?', 'Beautiful work, team!'] },
  upgraded: { style: 'shout', lines: ['Upgrade done!', 'The {b}! Fancy!', 'Bigger and better!', 'Moving up in the world!', 'Look how far we\'ve come!'] },
  noStuff: { style: 'talk', lines: ['We need more {r} for that.', 'Not enough {r}…', 'Can\'t build with air.', 'Someone fetch {r}!'] },
  power: { style: 'talk', lines: ['Power\'s on!', 'Lights! Real lights!', 'Hear that hum? Beautiful.', 'Electricity! Like the old days!'] },
  noPower: { style: 'talk', lines: ['Generator\'s out of fuel!', 'Lights went out!', 'We need fuel for the generator.'] },
  fire: { style: 'shout', lines: ['FIRE! FIRE!', 'The {b} is burning!', 'Get water! Now!', 'Everybody, buckets!', 'It\'s spreading!'] },
  fireOut: { style: 'talk', lines: ['Fire\'s out. Phew.', 'Saved it!', 'That was too close.'] },

  /* ---------------- danger & fighting ---------------- */
  spot: { style: 'shout', lines: [
    'Zombie!', 'Walker over there!', 'Heads up! Zombie!', 'We\'ve got company!', 'Zombie! West side!', 'Uh oh, a biter!', 'Here comes one!'] },
  engage: { style: 'shout', lines: ['I\'ve got this one!', 'Come here, ugly!', 'Back off!', 'Not today!', 'Leave us alone!', 'Get away from them!', 'My turn!'] },
  help: { style: 'shout', lines: ['HELP!', 'Help me!', 'They\'re on me!', 'Somebody! Anybody!', 'I need backup!', 'Get it off!'] },
  answer: { style: 'shout', lines: ['I\'m coming, {other}!', 'Hang on, {other}!', 'On my way!', 'Nobody touches {other}!', 'Coming!'] },
  kill: { style: 'talk', lines: [
    'Got it!', 'And stay down!', 'One less!', 'Gross. But done.', 'Next!', 'That\'s how it\'s done!', 'Bye bye!', 'Too easy.', 'Who\'s next?'] },
  bossKill: { style: 'shout', lines: ['WE GOT THE BIG ONE!', 'The giant is down!', 'Legendary!', 'Tell the whole world!'] },
  down: { style: 'shout', lines: ['I\'m hit!', 'Ugh… I\'m down…', 'Can\'t… get up…', 'Help… please…'] },
  rescuer: { style: 'shout', lines: ['I\'ve got you, {other}!', 'Hold on! I\'m here!', 'Stay with me, {other}!', 'Let\'s get you out of here!'] },
  rescued: { style: 'talk', lines: ['You saved me, {other}!', 'Thank you… thank you!', 'I owe you one.', 'I thought I was done for.'] },
  wallHit: { style: 'shout', lines: ['They\'re at the wall!', 'The wall\'s taking hits!', 'Fix that wall!', 'The gate won\'t hold!'] },
  raiders: { style: 'shout', lines: ['Raiders!', 'Bandits at the gate!', 'They want our stuff!', 'Protect the stores!'] },
  calm: { style: 'talk', lines: ['All clear!', 'I think that\'s all of them.', 'Quiet again.', 'Is everyone okay?', 'Let\'s clean up this mess.'] },

  /* ---------------- people ---------------- */
  newcomer: { style: 'talk', lines: ['Hi! I\'m new. Please don\'t eat me.', 'Wow, you have walls!', 'Thanks for letting me in!', 'I can work. I promise.', 'Is this place safe? It looks safe.', 'Hello, Haven!'] },
  welcome: { style: 'talk', lines: ['Welcome to the Haven!', 'Fresh face! Hi!', 'Glad you made it!', 'Grab a bed. If we have one.', 'You\'re one of us now.', 'Welcome! Do you cook?'] },
  levelUp: { style: 'shout', lines: ['I\'m getting good at this!', 'Level up! Woo!', 'Practice pays off!', 'Look at me go!', 'Skills!'] },
  grief: { style: 'whisper', lines: ['We\'ll miss you, {other}.', 'It should\'ve been me…', 'Rest now, {other}.', 'Why them…', 'Not {other}. Not like this.', 'Let\'s make it count.'] },
  love: { style: 'talk', lines: ['You\'re the best, {other}.', 'Sit with me, {other}?', 'I\'m glad you\'re here.', 'Our little family.'] },
  baby: { style: 'talk', lines: ['A baby! In the Haven!', 'So tiny!', 'Now we really have to win.', 'Welcome to the world, kid.'] },
  trader: { style: 'talk', lines: ['A trader! Let\'s shop!', 'Got anything good?', 'What\'s for sale?', 'Fresh goods from outside!'] },
  traderBye: { style: 'talk', lines: ['Bye, trader!', 'Come back soon!', 'Safe travels!'] },

  /* ---------------- expeditions ---------------- */
  farewell: { style: 'talk', lines: ['Good luck at the {dest}!', 'Come back in one piece!', 'Bring snacks!', 'Be careful out there!', 'Don\'t do anything stupid!', 'We\'ll keep the fire warm!'] },
  return: { style: 'shout', lines: ['We\'re back!', 'Look what we found!', 'Home sweet home!', 'Did you miss us?', 'You will NOT believe what we saw.'] },
  returnHurt: { style: 'talk', lines: ['We made it… barely.', 'Rough trip.', 'Never going there again.', 'Need a doctor…'] },
  greetSquad: { style: 'talk', lines: ['They\'re back!', 'Welcome home!', 'What did you bring?', 'Everyone in one piece?'] },

  /* ---------------- free time (thoughts) ---------------- */
  idle: { style: 'think', lines: [
    'I wonder if the internet still works.', 'I used to be an accountant.', 'Remember ice cream?', 'One day we\'ll rebuild everything.',
    'I should learn to knit.', 'Do zombies dream?', 'This place is starting to feel like home.', 'I miss my dog.', 'Hot showers. Remember those?',
    'What day is it even?', 'Maybe I\'ll plant flowers.', 'I could really use a vacation.', 'Note to self: don\'t get bitten.',
    'I wonder what\'s past the hills.', 'The walls look good today.', 'Is it lunch yet?', 'I bet I could beat a zombie at chess.',
    'Clouds look like bunnies.', 'Someday I\'ll open a café here.', 'Whistle while you work…', 'Life\'s not so bad here.'] },
  happy: { style: 'talk', lines: ['What a nice day!', 'I love this place.', 'Feeling good!', 'La la la…', 'Best town ever!', 'Life is good!'] },
  sad: { style: 'think', lines: ['Everything is so hard…', 'I miss the old world.', 'When will it end?', 'Need a hug.', 'Not my best day.'] },
  scared: { style: 'whisper', lines: ['I don\'t want to be out here…', 'Was that a groan?', 'Please let it be the wind…', 'Too dark. Way too dark.'] },
  bonfire: { style: 'talk', lines: ['Fire\'s nice and warm.', 'Tell a story, {other}!', 'Anyone know a song?', 'Marshmallows would be perfect.', 'Best part of the day.'] },

  /* ---------------- two-person chats (line, reply) ---------------- */
  chat: { style: 'talk', pairs: [
    ['Nice work today!', 'You too!'], ['How\'s the {b} looking?', 'Almost done!'], ['Want to hear a joke?', 'Is it about zombies?'],
    ['Why did the zombie skip school?', 'He felt rotten!'], ['I found a comic book!', 'Read it to me later!'], ['Did you sleep okay?', 'Like a baby. A tired baby.'],
    ['We should build a pool.', 'With what water?'], ['What did you do before?', 'Dentist. Don\'t ask.'], ['I\'m making soup tonight.', 'Please no more bean soup.'],
    ['How\'s your arm?', 'Still attached!'], ['This town needs a name sign.', 'Haven! It says Haven!'], ['Saw a deer today.', 'Was it alive?'],
    ['Do you think others made it?', 'I hope so.'], ['Race you to the barrel!', 'You\'re on!'], ['Your turn to cook.', 'You\'ll regret that.'],
    ['Can you fix my boot?', 'Duct tape fixes all.'], ['I miss music.', 'I can hum!'], ['Big plans for tomorrow?', 'Survive. Then lunch.']] },
  chatRain: { style: 'talk', pairs: [['Rain again…', 'Good for the barrels!'], ['I\'m soaked.', 'Same. Lovely.'], ['Zombies hate rain?', 'Let\'s hope.']] },
  chatNight: { style: 'whisper', pairs: [['Hear that?', 'Just the wind. I hope.'], ['Can\'t sleep.', 'Me neither.'], ['Stay close tonight.', 'Always.']] },
  chatHungry: { style: 'talk', pairs: [['I\'m starving.', 'We need more farms.'], ['Any food left?', 'Half a can.'], ['Dinner?', 'Dream about it.']] },
  chatThirsty: { style: 'talk', pairs: [['Water\'s low.', 'Build another barrel?'], ['So thirsty.', 'Pray for rain.']] },
  chatGrief: { style: 'whisper', pairs: [['I keep thinking about {other}.', 'Me too.'], ['They were brave.', 'The bravest.']] },
  chatFight: { style: 'talk', pairs: [['Did you see me out there?', 'You were amazing!'], ['That was close.', 'Too close.'], ['We beat them!', 'This time.']] },
  chatFriends: { style: 'talk', pairs: [['You\'re my best friend.', 'Aww. You too.'], ['Remember when we met?', 'You threw a pan at me!'], ['Partners?', 'Partners!']] },
  chatNew: { style: 'talk', pairs: [['Hi! I\'m new here.', 'Welcome, {other}!'], ['You\'re new, right?', 'Yep! Hi!'], ['Need anything?', 'A map of this place!']] },
};
