/* Zombie Haven 3D.27 — survivor lines ("barks"): what people say out loud when things happen.
   Shown in Bunker Comic speech bubbles over their heads (drawn in game.js: drawBark). All offline, no AI.
   3D.41 owner: grown-ups talking like real people, swearing included (3D.42: f-word kept rare; shit/hell/damn are fine; some Southern voices). Settings > "Swearing in chat" off masks it (f**k).
   Placeholders: {other} another survivor's name · {b} a building · {n} a number · {r} a resource · {dest} a place.
   Each key is an event; the game picks a random line, never the same one twice in a row.
   style: talk (round bubble) · shout (jagged, yellow) · think (cloud) · whisper (dashed). */
window.ZH_BARKS = {
  /* ---------------- day & night ---------------- */
  morning: { style: 'talk', lines: [
    'Morning.', 'Still breathing. Good start.', 'Who drank the last of the coffee? Seriously?', 'Right. Let\'s get to it.', 'God, my back.',
    'Slept like shit.', 'Another day in paradise.', 'Everyone here? Okay. Good.', 'Day {n}. Not bad for a bunch of idiots.', 'Who the hell was snoring?',
    'Beans for breakfast. Again. Fantastic.', 'Somebody check the barrels before I forget.', 'I need about six coffees.', 'Up. Up. Damn it, up.', 'Mornin\', y\'all.', 'Well, we ain\'t dead yet.', 'Reckon it\'s gonna be a hot one.'] },
  dusk: { style: 'talk', lines: [
    'Getting dark. Wrap it up.', 'Inside soon, people.', 'Last load, then I\'m done.', 'Shut the damn gate.', 'Light the fire before it gets bad.',
    'I hate this part of the day.', 'Who\'s on watch tonight?', 'Sun\'s going. Let\'s not be out here.', 'Night\'s coming. Stay close.', 'Y\'all get on inside now.', 'I\'m fixin\' to lock up.'] },
  night: { style: 'whisper', lines: [
    'Did you hear that?', 'Something\'s out there.', 'Keep it down.', 'Can\'t sleep with that groaning.', 'Is the gate shut? Check again.',
    'Too quiet. I don\'t like it.', 'Shit, what was that?', 'Wake me if they come.', 'Somethin\' ain\'t right out there.', 'Keep the fire going.'] },
  dawn: { style: 'talk', lines: [
    'We made it.', 'Fuck me, that was a long night.', 'Never been so happy to see the sun.', 'Everyone okay? Sound off.', 'Okay. Okay. We\'re fine.',
    'Still here, you bastards.', 'Night\'s done. Thank God.', 'Lord have mercy, we made it.'] },
  horde: { style: 'shout', lines: [
    'Horde! Get ready!', 'Here they come!', 'Everybody to the walls!', 'Holy shit, that\'s a lot of them!', 'Hold the line!',
    'Positions, now!', 'Oh, hell no.', 'They\'re at the edge of town!', 'Barricade the gate!', 'Stick together!', 'Here they come, y\'all!'] },
  boss: { style: 'shout', lines: [
    'What the fuck is that?!', 'That one\'s huge!', 'Big one! Big one!', 'Oh no. No no no.', 'Everyone on the big bastard!', 'We\'re gonna need a bigger stick.', 'Well, I\'ll be damned.'] },

  /* ---------------- weather ---------------- */
  rain: { style: 'talk', lines: [
    'Rain. Barrels will fill.', 'Free water, finally.', 'Great. Wet socks again.', 'Get the buckets out.', 'At least the dead get soaked too.',
    'Good for the crops, bad for my boots.', 'Bloody rain.', 'Comin\' down like cats and dogs.'] },
  storm: { style: 'shout', lines: ['Storm! Get under a roof!', 'That thunder\'s close!', 'Tie everything down!', 'Jesus, listen to that wind.'] },
  snow: { style: 'talk', lines: ['Snow. Brilliant.', 'Can\'t feel my fingers.', 'Pretty. Cold as hell, though.', 'Fire. I need fire.'] },
  rainStop: { style: 'talk', lines: ['Rain stopped.', 'Sun\'s back.', 'Okay, back to it.', 'Mud everywhere. Lovely.'] },

  /* ---------------- needs ---------------- */
  hungry: { style: 'think', lines: [
    'I\'m starving.', 'Stomach\'s eating itself.', 'I\'d kill for a burger.', 'When do we eat?', 'I miss pizza so damn much.',
    'Is that a can of beans? Mine.', 'I could eat a horse.', 'I\'d kill for some biscuits and gravy.', 'My belly\'s gnawin\' on my backbone.'] },
  thirsty: { style: 'think', lines: ['Need water.', 'Mouth like sandpaper.', 'Just one sip…', 'Is the barrel full?', 'So damn thirsty.', 'Dry as a bone, I swear.'] },
  tired: { style: 'think', lines: [
    'Dead on my feet.', 'Need to lie down.', 'Eyes keep closing.', 'Five more minutes…', 'I could sleep standing up.', 'I\'m wrecked.', 'I\'m plumb tuckered out.'] },
  hurt: { style: 'talk', lines: [
    'Ow. Shit.', 'I need a bandage.', 'That\'s gonna bruise.', 'I\'m fine. Mostly.', 'Someone patch me up?', 'Damn, that stings.'] },
  eat: { style: 'talk', lines: ['Oh, that\'s good.', 'Best beans I\'ve had all week.', 'That hits the spot.', 'Who cooked? Thanks.', 'Better than nothing.', 'Any more of that?', 'Now that\'s good eatin\'.'] },
  drink: { style: 'talk', lines: ['Ahh. Better.', 'Water never tasted so good.', 'That\'s the stuff.'] },
  sleep: { style: 'think', lines: ['Night, all.', 'Finally. Bed.', 'Wake me if anything explodes.', 'Don\'t let me die in my sleep.'] },
  wake: { style: 'talk', lines: ['I\'m up. Barely.', 'What did I miss?', 'Slept like a log.', 'Coffee. Now.'] },
  healed: { style: 'talk', lines: ['Good as new.', 'Thanks, doc.', 'All patched up.', 'Much better.', 'Back at it.'] },

  /* ---------------- town supplies ---------------- */
  lowFood: { style: 'talk', lines: ['We\'re running out of food.', 'Pantry\'s almost empty.', 'We need more farms. Like, now.', 'Rationing again? Great.', 'Somebody find food, for God\'s sake.'] },
  lowWater: { style: 'talk', lines: ['Water\'s nearly gone.', 'We need more rain barrels.', 'Barrels are bone dry.', 'No water, no Haven.'] },
  full: { style: 'talk', lines: ['Storage is full.', 'Where am I supposed to put this?', 'We need more storage.', 'No room for more {r}.'] },
  rich: { style: 'talk', lines: ['Look at all this stuff.', 'We\'re actually doing okay.', 'Never had this much {r}.', 'Not bad, Haven. Not bad.'] },

  /* ---------------- gathering ---------------- */
  chop: { style: 'talk', lines: [
    'Timber!', 'This tree had it coming.', 'Good wood.', 'Watch your heads!', 'Fresh logs coming.', 'Splinters. Just great.', 'This ol\' tree\'s comin\' down!', 'One more swing…', 'My arms are done.'] },
  mine: { style: 'talk', lines: ['Solid stone.', 'Hard work, hard rock.', 'My arms are jelly.', 'Stone for the walls.', 'This rock is a bitch.', 'Good chunk, this one.'] },
  wreck: { style: 'talk', lines: ['Good scrap in this one.', 'Old car, new parts.', 'Rust everywhere.', 'Found some bolts.', 'This used to be somebody\'s ride.'] },
  bin: { style: 'talk', lines: ['Clothes. Kind of clean ones.', 'Ugh. But useful.', 'Found some cloth.', 'Smells like death. Taking it anyway.'] },
  fuel: { style: 'shout', lines: ['Fuel! There\'s fuel in it!', 'Hell yes, fuel!', 'Still gas in the tank!'] },
  foundRare: { style: 'talk', lines: ['Found {n} {r}!', 'Look at this. {r}!', 'Lucky find.', 'Well, would you look at that.', 'Today doesn\'t suck.'] },
  haul: { style: 'talk', lines: ['Coming through!', 'Heavy as hell.', 'Delivery for the {b}.', 'Where do you want it?', 'Move, move, heavy stuff.'] },
  mark: { style: 'talk', lines: ['On it.', 'I\'ll grab that one.', 'Got it.', 'That one? Sure.', 'Yeah, yeah, I\'m going.'] },
  tool: { style: 'talk', lines: ['New tools. Look at this.', 'This changes everything.', 'Work just got easier.', 'Now we\'re talking.'] },

  /* ---------------- building ---------------- */
  hammer: { style: 'talk', lines: [
    'Building the {b}.', 'Hold this. No, the other end.', 'Measure twice, hammer once.', 'Ow! Shit, my thumb!',
    'Almost there.', 'Who\'s got nails?', 'Hand me that hammer, darlin\'.', 'Straight-ish. Good enough.', 'Come on, you stupid board.'] },
  built: { style: 'shout', lines: [
    'The {b} is done!', 'We built it!', 'Look at that {b}.', 'Finished!', 'Built to last. Probably.', 'Not bad, right?', 'Damn, that looks good.', 'Ain\'t that a sight.'] },
  upgraded: { style: 'shout', lines: ['Upgrade done!', 'Look at the {b} now.', 'Bigger and better.', 'Moving up in the world.', 'Look how far we\'ve come.'] },
  noStuff: { style: 'talk', lines: ['We need more {r} for that.', 'Not enough {r}.', 'Can\'t build with thin air.', 'Someone fetch {r}, damn it.'] },
  power: { style: 'talk', lines: ['Power\'s on!', 'Real lights. Holy shit.', 'Hear that hum? Beautiful.', 'Electricity. Like the old days.'] },
  noPower: { style: 'talk', lines: ['Generator\'s out of fuel.', 'Lights went out. Shit.', 'We need fuel for the generator.'] },
  fire: { style: 'shout', lines: ['FIRE!', 'The {b} is burning!', 'Get water! Now!', 'Buckets, everybody!', 'Shit, it\'s spreading!'] },
  fireOut: { style: 'talk', lines: ['Fire\'s out.', 'Saved it.', 'That was way too close.'] },

  /* ---------------- danger & fighting ---------------- */
  spot: { style: 'shout', lines: [
    'Zombie!', 'Walker over there!', 'Heads up!', 'We\'ve got company.', 'Zombie! West side!', 'Oh shit, a biter.', 'Here comes one.', 'Got one comin\' up the road!'] },
  engage: { style: 'shout', lines: ['I\'ve got this one!', 'Come here, you ugly fuck!', 'Back off!', 'Not today!', 'Get away from them!', 'My turn.', 'Eat this, asshole.', 'Come on then, sugar.'] },
  help: { style: 'shout', lines: ['HELP!', 'Help me!', 'They\'re on me!', 'Somebody!', 'I need backup!', 'Get it off me!', 'Shit! Help!'] },
  answer: { style: 'shout', lines: ['Coming, {other}!', 'Hang on, {other}!', 'On my way!', 'Nobody touches {other}!', 'Hold on, I\'m coming!'] },
  kill: { style: 'talk', lines: [
    'Got it.', 'Stay down.', 'One less.', 'Gross. But done.', 'Next.', 'That\'s how it\'s done.', 'Bless your heart. Now stay dead.', 'Too easy.', 'Who\'s next?', 'That\'ll learn ya.'] },
  bossKill: { style: 'shout', lines: ['We got the big one!', 'The big bastard is down!', 'Holy shit, we did it!', 'Tell everyone!'] },
  down: { style: 'shout', lines: ['I\'m hit!', 'Ugh… I\'m down…', 'Can\'t… get up…', 'Help… please…', 'Shit… shit…'] },
  rescuer: { style: 'shout', lines: ['I\'ve got you, {other}!', 'Hold on! I\'m here!', 'Stay with me, {other}!', 'Let\'s get you out of here.'] },
  rescued: { style: 'talk', lines: ['You saved my ass, {other}.', 'Thank you. Really.', 'I owe you one.', 'Thought I was done for.'] },
  wallHit: { style: 'shout', lines: ['They\'re at the wall!', 'The wall\'s taking hits!', 'Fix that damn wall!', 'The gate won\'t hold!'] },
  raiders: { style: 'shout', lines: ['Raiders!', 'Bandits at the gate!', 'They want our stuff!', 'Protect the stores!', 'Those sons of bitches!'] },
  calm: { style: 'talk', lines: ['All clear.', 'I think that\'s all of them.', 'Quiet again.', 'Everyone okay?', 'Let\'s clean up this mess.', 'Well, that\'s that.'] },

  /* ---------------- people ---------------- */
  newcomer: { style: 'talk', lines: ['Hi. I\'m new. Please don\'t shoot me.', 'You have walls. Thank God.', 'Thanks for letting me in.', 'I can work. I promise.', 'This place safe? Looks safe.'] },
  welcome: { style: 'talk', lines: ['Welcome to the Haven.', 'New face. Hi.', 'Glad you made it.', 'Grab a bed, if we have one.', 'You\'re one of us now.', 'Welcome. Can you cook?', 'Make yourself at home, hon.'] },
  levelUp: { style: 'shout', lines: ['I\'m getting good at this.', 'Practice pays off.', 'Look at me go.', 'Hell yeah.'] },
  grief: { style: 'whisper', lines: ['We\'ll miss you, {other}.', 'It should\'ve been me.', 'Rest now, {other}.', 'Why them…', 'Not {other}. Not like this.', 'Damn this world.'] },
  love: { style: 'talk', lines: ['You\'re the best, {other}.', 'Sit with me, {other}?', 'I\'m glad you\'re here.', 'Our weird little family.'] },
  baby: { style: 'talk', lines: ['A baby. Here. Wow.', 'So tiny.', 'Now we really have to make it.', 'Welcome to the world, kid. Sorry about the mess.'] },
  trader: { style: 'talk', lines: ['Trader\'s here.', 'Got anything good?', 'What\'s for sale?', 'Let\'s see what you\'ve got.'] },
  traderBye: { style: 'talk', lines: ['See you, trader.', 'Come back soon.', 'Safe travels.'] },

  /* ---------------- expeditions ---------------- */
  farewell: { style: 'talk', lines: ['Good luck at the {dest}.', 'Come back in one piece.', 'Be careful out there.', 'Don\'t do anything stupid.', 'Don\'t get bitten, dumbass.'] },
  return: { style: 'shout', lines: ['We\'re back!', 'Look what we found!', 'Home sweet home.', 'Miss us?', 'Y\'all won\'t believe what we saw.'] },
  returnHurt: { style: 'talk', lines: ['We made it. Barely.', 'Rough trip.', 'Never going there again.', 'Need a doctor. Now.'] },
  greetSquad: { style: 'talk', lines: ['They\'re back!', 'Welcome home.', 'What did you bring?', 'Everyone in one piece?'] },

  /* ---------------- free time (thoughts) ---------------- */
  idle: { style: 'think', lines: [
    'Wonder if the internet still works.', 'I used to be an accountant. Ha.', 'Remember ice cream?', 'One day we\'ll rebuild all of it.',
    'This place is starting to feel like home.', 'I miss my dog.', 'Hot showers. God, I miss hot showers.', 'What day is it even?',
    'Note to self: don\'t get bitten.', 'Wonder what\'s past the hills.', 'Is it lunch yet?', 'What a shitty way for the world to end.', 'Could be worse. Could be dead.', 'I reckon Mama would\'ve liked it here.', 'Ain\'t nothin\' like a porch at sunset.'] },
  happy: { style: 'talk', lines: ['Nice day, for once.', 'I like it here.', 'Feeling good.', 'Not bad. Not bad at all.', 'Today doesn\'t suck.'] },
  sad: { style: 'think', lines: ['Everything is so hard.', 'I miss the old world.', 'When does it end?', 'Shit day.', 'What\'s even the point.'] },
  scared: { style: 'whisper', lines: ['I don\'t want to be out here.', 'Was that a groan?', 'Please be the wind…', 'Too dark. Way too dark.', 'Shit, shit, shit.'] },
  bonfire: { style: 'talk', lines: ['Fire\'s nice.', 'Tell a story, {other}.', 'Anyone know a song?', 'Kill for a beer right now.', 'Best part of the day.', 'Somebody pass the moonshine.'] },

  /* ---------------- two-person chats (line, reply) ---------------- */
  chat: { style: 'talk', pairs: [
    ['Good work today.', 'You too.'], ['How\'s the {b} coming?', 'Slowly. Like everything.'], ['Want to hear a joke?', 'If it\'s about zombies, no.'],
    ['Sleep okay?', 'Like shit. You?'], ['What did you do before?', 'Dentist. Don\'t ask.'], ['Making soup tonight.', 'Please, no more bean soup.'],
    ['How\'s the arm?', 'Still attached.'], ['Saw a deer today.', 'Alive or the other kind?'], ['Think anyone else made it?', 'Somebody had to.'],
    ['Your turn to cook.', 'You\'ll regret that.'], ['Can you fix my boot?', 'Duct tape fixes everything.'], ['I miss music.', 'I can hum. Badly.'],
    ['Plans for tomorrow?', 'Not dying. Then lunch.'], ['This is bullshit.', 'Yeah. Pass the hammer.'], ['You look like hell.', 'Thanks. You too.'],
    ['What I\'d give for a cold beer.', 'Don\'t. Just don\'t.'], ['Y\'all hungry?', 'Does a bear sit in the woods?'], ['You fixin\' to help or what?', 'Hold your horses.']] },
  chatRain: { style: 'talk', pairs: [['Rain again.', 'Good for the barrels.'], ['I\'m soaked.', 'Same. Lovely as hell.'], ['Do they hate rain?', 'Let\'s hope.']] },
  chatNight: { style: 'whisper', pairs: [['Hear that?', 'Just the wind. I hope.'], ['Can\'t sleep.', 'Me neither.'], ['Stay close tonight.', 'Always.']] },
  chatHungry: { style: 'talk', pairs: [['I\'m starving.', 'We need more farms.'], ['Any food left?', 'Half a can.'], ['What\'s for dinner?', 'Disappointment.']] },
  chatThirsty: { style: 'talk', pairs: [['Water\'s low.', 'Build another barrel?'], ['So thirsty.', 'Pray for rain.']] },
  chatGrief: { style: 'whisper', pairs: [['I keep thinking about {other}.', 'Me too.'], ['They were brave.', 'Braver than me.']] },
  chatFight: { style: 'talk', pairs: [['See me out there?', 'You were a damn animal.'], ['That was close.', 'Way too close.'], ['We beat them.', 'This time.']] },
  chatFriends: { style: 'talk', pairs: [['Glad you\'re around.', 'Don\'t get soppy on me.'], ['Remember when we met?', 'You threw a pan at me.'], ['Partners?', 'Partners.']] },
  chatNew: { style: 'talk', pairs: [['Hi. I\'m new here.', 'Welcome, {other}.'], ['You\'re the new one, right?', 'Yep. Hi.'], ['Need anything?', 'A map of this place.']] },
};
