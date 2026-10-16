// Swish Street - game data: spots, courts, challenges, rivals, cosmetics, commentary.
(function () {
  'use strict';
  var SS = window.SS, t = SS.t;
  var D = (SS.D = {});

  // Shot spots around the hoop. a = angle in degrees (0 = straight on, negative = left), d = metres.
  D.SPOTS = {
    close: { a: 0, d: 2.7, name: 'Close Range' },
    top:   { a: 0, d: 4.3, name: 'Top of the Key' },
    lw:    { a: -38, d: 4.2, name: 'Left Wing' },
    rw:    { a: 38, d: 4.2, name: 'Right Wing' },
    lb:    { a: -64, d: 3.6, name: 'Left Block' },
    rb:    { a: 64, d: 3.6, name: 'Right Block' },
    lelb:  { a: -22, d: 3.4, name: 'Left Elbow' },
    relb:  { a: 22, d: 3.4, name: 'Right Elbow' },
    deep:  { a: 0, d: 6.0, name: 'Way Downtown' },
    ldeep: { a: -30, d: 5.8, name: 'Left Deep' },
    rdeep: { a: 30, d: 5.8, name: 'Right Deep' },
    half:  { a: 0, d: 11.4, name: 'Half Court' },
    lhalf: { a: -16, d: 11.0, name: 'Half Court Left' },
    rhalf: { a: 16, d: 11.0, name: 'Half Court Right' }
  };
  D.ARC5 = ['lb', 'lw', 'top', 'rw', 'rb'];
  D.HORSE_SPOTS = ['lb', 'lw', 'lelb', 'top', 'relb', 'rw', 'rb', 'close', 'deep'];
  D.BANK_OK = { lb: 1, lw: 1, rb: 1, rw: 1, lelb: 1, relb: 1, ldeep: 1, rdeep: 1 };

  // HORSE twists. The last four are trick twists, added in v0.2.
  D.TWISTS = {
    normal: { name: 'Any Way', short: 'Any way', icon: 'ball', tip: 'Just make it!' },
    bank:   { name: 'Off the Glass', short: 'Glass', icon: 'glass', tip: 'Must hit the backboard first.' },
    swish:  { name: 'Swish Only', short: 'Swish', icon: 'net', tip: 'No rim, no glass. Pure net!' },
    bounce: { name: 'Bounce Shot', short: 'Bounce', icon: 'bounce', tip: 'Bounce it off the floor into the hoop!' },
    blind:  { name: 'Eyes Closed', short: 'Eyes shut', icon: 'eye', tip: 'The hoop vanishes while you aim!' },
    nolook: { name: 'No-Look', short: 'No-look', icon: 'nolook', tip: 'The power bar has no glow. Feel it!' },
    moving: { name: 'On the Move', short: 'Moving', icon: 'move', tip: 'You slide side to side. Shoot at the stop!' }
  };
  D.TWIST_ORDER = ['normal', 'bank', 'swish', 'bounce', 'blind', 'nolook', 'moving'];
  // Bounce shots need room in front of the hoop.
  D.BOUNCE_OK = { top: 1, lelb: 1, relb: 1, lw: 1, rw: 1, deep: 1, ldeep: 1, rdeep: 1 };
  D.twistOkAt = function (tw, spot) {
    if (tw === 'bank') return !!D.BANK_OK[spot];
    if (tw === 'bounce') return !!D.BOUNCE_OK[spot];
    return true;
  };
  // Respect ladder: each rival can be beaten three times, each time tougher.
  D.TIERS = [
    { name: 'Street', skill: 1, extra: null },
    { name: 'Pro', skill: 0.8, extra: { bounce: 0.12, nolook: 0.1 } },
    { name: 'Legend', skill: 0.62, extra: { blind: 0.12, moving: 0.12, bounce: 0.08 } }
  ];
  D.RESPECT = ['New face', 'Rival', 'Respect', 'Legend'];

  // ---------- Rivals ----------
  D.RIVALS = {
    leo: {
      id: 'leo', name: 'Leo "Hops" Rivera', short: 'Leo',
      tagline: 'Bouncy, loud and always smiling.',
      look: { skin: 2, hair: 'curly', hairColor: 0, jersey: 'lime', shoes: 'red', number: 7, headband: '#ff4d6d' },
      skill: 0.14, aim: 4, twists: { normal: 0.7, bank: 0.2, swish: 0.1 },
      lines: {
        intro: 'Yo! This is my park. Let\'s play H-O-R-S-E!',
        set: ['Watch THIS one!', 'Bet you can\'t copy this!', 'Here we go!'],
        make: ['Boom!', 'Hops is in the house!', 'Called it!'],
        miss: ['Whoops! Your call.', 'Haha, that went wild!', 'Nope! Your turn.'],
        youMake: ['Ooh, nice one!', 'Okay okay, you got skills!', 'Sweet shot!'],
        youMiss: ['Close! That\'s a letter though.', 'Unlucky! Keep going!'],
        lose: 'You got me! Respect. See you on the next court!',
        win: 'Good game! Rematch whenever you want!'
      }
    },
    priya: {
      id: 'priya', name: 'Priya "Professor" Patel', short: 'Priya',
      tagline: 'Calm, clever, loves the bank shot.',
      look: { skin: 3, hair: 'bun', hairColor: 0, jersey: 'purple', shoes: 'white', number: 11, glasses: true },
      skill: 0.11, aim: 3.4, twists: { normal: 0.35, bank: 0.5, swish: 0.15 },
      lines: {
        intro: 'Angles are everything. Ready for a game of H-O-R-S-E?',
        set: ['Geometry time.', 'Mind the angle on this one.', 'Let me show you something.'],
        make: ['Exactly as calculated.', 'The glass never lies.', 'Textbook!'],
        miss: ['Hm. My math was off.', 'Interesting... your turn.', 'I will recalculate.'],
        youMake: ['Impressive form!', 'Well solved!', 'Good angle!'],
        youMiss: ['Almost! Adjust and try again.', 'So close. That is a letter.'],
        lose: 'Well played! You solved me. On to the rooftop!',
        win: 'Good game! Practise your bank shots and come back.'
      }
    },
    kofi: {
      id: 'kofi', name: 'Kofi "Breeze" Mensah', short: 'Kofi',
      tagline: 'Super chill. Reads the wind like a book.',
      look: { skin: 5, hair: 'twists', hairColor: 0, jersey: 'sunset', shoes: 'gold', number: 23, shades: true },
      skill: 0.095, aim: 3, twists: { normal: 0.4, bank: 0.2, swish: 0.4 },
      lines: {
        intro: 'Feel that breeze? Let\'s play H-O-R-S-E up here.',
        set: ['Ride the wind...', 'Smooth and easy.', 'Nothing but net, hopefully.'],
        make: ['Breezy.', 'Smooth like sunset.', 'Wind\'s my friend.'],
        miss: ['The wind said no. Your call.', 'Ha, a gust got me.', 'All good. Your turn.'],
        youMake: ['Ooh, you read the wind!', 'Clean!', 'Nice touch!'],
        youMiss: ['Tricky breeze, right? That\'s a letter.', 'Shake it off!'],
        lose: 'Respect! You\'re the real Rooftop champ.',
        win: 'Good game, friend. The wind will be kinder next time.'
      }
    },
    marina: {
      id: 'marina', name: 'Marina "Wave" Costa', short: 'Marina', reward: 'wave',
      tagline: 'Surfer. Fearless. Loves a bounce shot.',
      look: { skin: 1, hair: 'ponytail', hairColor: 3, jersey: 'teal', shoes: 'blue', number: 4, gear: 'wave' },
      skill: 0.09, aim: 3, twists: { normal: 0.4, bank: 0.1, swish: 0.15, bounce: 0.35 },
      lines: {
        intro: 'Surf\'s up! Ready to ride some H-O-R-S-E waves?',
        set: ['Catch this wave!', 'Cowabunga!', 'Hang ten on this one!'],
        make: ['Totally tubular!', 'Smooth sailing!', 'Riding the wave!'],
        miss: ['Wipeout! Your turn.', 'The tide took that one.', 'Oops, salty fingers!'],
        youMake: ['Gnarly shot!', 'You surf the arc!', 'Rad!'],
        youMiss: ['Big wave, small letter. Keep paddling!', 'Wipeout! That\'s a letter.'],
        lose: 'You ride like a pro! The subway is calling.',
        win: 'Good game! Waves come back every day. So can you!'
      }
    },
    dj: {
      id: 'dj', name: 'DJ "Echo" Nakamura', short: 'DJ', reward: 'echo',
      tagline: 'Plays to the beat. Never looks at the hoop.',
      look: { skin: 1, hair: 'mohawk', hairColor: 5, jersey: 'black', shoes: 'neon', number: 99, gear: 'echo' },
      skill: 0.085, aim: 2.8, twists: { normal: 0.35, bank: 0.15, swish: 0.15, nolook: 0.35 },
      lines: {
        intro: 'Drop the beat! Let\'s spin some H-O-R-S-E.',
        set: ['Turn it up!', 'Remix time!', 'On the beat... now!'],
        make: ['That\'s a hit single!', 'Echo, echo, echo!', 'Platinum!'],
        miss: ['Record scratch! Your turn.', 'Off beat. My bad.', 'Skipped a track!'],
        youMake: ['You\'re on the playlist!', 'Fresh mix!', 'Crowd goes wild!'],
        youMiss: ['Off the beat! That\'s a letter.', 'Keep the rhythm going!'],
        lose: 'You dropped the mic! Snowy Court is next.',
        win: 'Good game! Come back and remix it!'
      }
    },
    anya: {
      id: 'anya', name: 'Anya "Frost" Ivanova', short: 'Anya', reward: 'frost',
      tagline: 'Ice cold. Can shoot with her eyes closed.',
      look: { skin: 0, hair: 'braids', hairColor: 3, jersey: 'blue', shoes: 'white', number: 31, gear: 'frost' },
      skill: 0.08, aim: 2.6, twists: { normal: 0.3, bank: 0.1, swish: 0.25, blind: 0.35 },
      lines: {
        intro: 'Brrr! Hands warm? Let\'s play H-O-R-S-E in the snow.',
        set: ['Snowflake special!', 'Cool and calm...', 'Frosty finish!'],
        make: ['Ice cold!', 'Chill.', 'Frozen in place!'],
        miss: ['Slippery! Your turn.', 'My fingers froze.', 'Brr, that slid off.'],
        youMake: ['Cool shot!', 'You melted the snow!', 'Frosty and fierce!'],
        youMiss: ['Slippery rim! That\'s a letter.', 'Warm up and go again!'],
        lose: 'You are colder than ice! The Arena awaits.',
        win: 'Good game! Hot cocoa, then a rematch?'
      }
    },
    champ: {
      id: 'champ', name: 'The Champion', short: 'Champ', reward: 'crown',
      tagline: 'Learned every trick from every rival.',
      look: { skin: 3, hair: 'cap', hairColor: 0, jersey: 'gold', shoes: 'gold', number: 1, gear: 'breeze' },
      skill: 0.075, aim: 2.4, twists: { normal: 0.2, bank: 0.14, swish: 0.14, bounce: 0.13, blind: 0.13, nolook: 0.13, moving: 0.13 },
      lines: {
        intro: 'So you beat everyone in the city? Then show me. Final H-O-R-S-E!',
        set: ['Every trick in the book.', 'Let\'s see you copy THIS.', 'Champion\'s choice!'],
        make: ['That\'s why I\'m the Champ.', 'Easy money!', 'Like I taught them all!'],
        miss: ['Even champs miss. Your call!', 'Hmm, nerves!', 'Okay, your turn, challenger.'],
        youMake: ['Whoa. You\'re for real!', 'Champion stuff!', 'Respect!'],
        youMiss: ['Close! That\'s a letter.', 'Shake it off, challenger!'],
        lose: 'You did it. YOU are the Champion of Swish Street!',
        win: 'Good game! The belt waits for you. Come back anytime!'
      }
    }
  };
  D.RIVALS.leo.reward = 'hops'; D.RIVALS.priya.reward = 'prof'; D.RIVALS.kofi.reward = 'breeze';
  D.RIVALS.priya.look.gear = 'prof'; D.RIVALS.kofi.look.gear = 'breeze';

  // ---------- Courts (the whole Street Tour map; first 3 are built) ----------
  D.COURTS = [
    {
      id: 'park', name: 'Neighborhood Park', env: 'park', built: true, rival: 'leo',
      blurb: 'Where every legend starts.', map: { x: 0.25, y: 0.84 },
      challenges: [
        { id: 'p1', name: 'Warm-Up', desc: 'Make 5 shots. You have 8 balls.',
          goal: 'makes', need: 5, balls: 8, spots: ['close', 'top', 'lelb', 'relb'], order: 'cycle' },
        { id: 'p2', name: 'Around the Arc', desc: 'Score from all 5 spots. 12 balls.',
          goal: 'arc', need: 5, balls: 12, spots: ['lb', 'lw', 'top', 'rw', 'rb'] },
        { id: 'p3', name: 'Minute Rush', desc: 'Score 14 points in 60 seconds.',
          goal: 'points', need: 14, time: 60, spots: ['close', 'top', 'lw', 'rw', 'lelb', 'relb'], order: 'random' }
      ]
    },
    {
      id: 'gym', name: 'School Gym', env: 'gym', built: true, rival: 'priya',
      blurb: 'Shiny floor. Echoing cheers.', map: { x: 0.68, y: 0.7 },
      challenges: [
        { id: 'g1', name: 'Glass Class', desc: 'Make 4 bank shots off the glass. 10 balls.',
          goal: 'makes', filter: 'bank', need: 4, balls: 10, spots: ['lw', 'rw', 'lb', 'rb'], order: 'cycle' },
        { id: 'g2', name: 'Moving Target', desc: 'The hoop slides! Make 5 in 60 seconds.',
          goal: 'makes', need: 5, time: 60, spots: ['top', 'close'], order: 'cycle', move: { amp: 0.45, period: 4.6 } },
        { id: 'g3', name: 'Trick Shots', desc: 'Hit all 3 glowing targets on the backboard. 12 balls.',
          goal: 'targets', need: 3, balls: 12, spots: ['lw', 'top', 'rw'], order: 'cycle',
          targets: [{ x: -0.5, y: 3.42 }, { x: 0, y: 3.72 }, { x: 0.5, y: 3.42 }] }
      ]
    },
    {
      id: 'roof', name: 'Rooftop Sunset', env: 'roof', built: true, rival: 'kofi',
      blurb: 'High up. Windy. Beautiful.', map: { x: 0.3, y: 0.55 },
      challenges: [
        { id: 'r1', name: 'Feel the Breeze', desc: 'Make 5 shots in the wind. 10 balls.',
          goal: 'makes', need: 5, balls: 10, spots: ['top', 'lelb', 'relb', 'close'], order: 'cycle', wind: { base: 1.0, vary: true } },
        { id: 'r2', name: 'Silk', desc: 'Score 3 swishes - no rim, no glass. 12 balls.',
          goal: 'makes', filter: 'swish', need: 3, balls: 12, spots: ['top', 'close', 'lelb', 'relb'], order: 'cycle', wind: { base: 0.5, vary: true } },
        { id: 'r3', name: 'Gusty Arc', desc: 'Score from all 5 spots as the wind changes. 14 balls.',
          goal: 'arc', need: 5, balls: 14, spots: ['lb', 'lw', 'top', 'rw', 'rb'], wind: { base: 1.2, vary: true } }
      ]
    },
    {
      id: 'beach', name: 'Beach Boardwalk', env: 'beach', built: true, rival: 'marina',
      blurb: 'Sand, gulls and sea breeze.', map: { x: 0.72, y: 0.42 },
      challenges: [
        { id: 'b1', name: 'Sea Breeze', desc: 'Make 5 while the breeze gusts. 10 balls.',
          goal: 'makes', need: 5, balls: 10, spots: ['top', 'lelb', 'relb', 'lw', 'rw'], order: 'cycle', wind: { base: 0.75, vary: true, gust: true } },
        { id: 'b2', name: 'Gull Patrol', desc: 'Seagulls fly past! Time your shot. Make 5 from 12 balls.',
          goal: 'makes', need: 5, balls: 12, spots: ['top', 'lelb', 'relb', 'deep'], order: 'cycle', gulls: true },
        { id: 'b3', name: 'Tide Rush', desc: 'Score 18 points in 60 seconds as the tide rolls in.',
          goal: 'points', need: 18, time: 60, spots: ['close', 'lelb', 'relb', 'top', 'lw', 'rw', 'deep', 'ldeep', 'rdeep'], order: 'tide' }
      ]
    },
    {
      id: 'subway', name: 'Subway Plaza', env: 'subway', built: true, rival: 'dj',
      blurb: 'Trains rumble by. Feel the beat.', map: { x: 0.3, y: 0.3 },
      challenges: [
        { id: 's1', name: 'Rush Hour', desc: 'Score 20 points in 60 seconds. Trains blow a gust!',
          goal: 'points', need: 20, time: 60, spots: ['close', 'top', 'lw', 'rw', 'lelb', 'relb'], order: 'random', trains: true },
        { id: 's2', name: 'Tile Bounce', desc: 'Make 4 bounce shots off the floor. 10 balls.',
          goal: 'makes', filter: 'bounce', need: 4, balls: 10, spots: ['top', 'lelb', 'relb'], order: 'cycle' },
        { id: 's3', name: 'Echo Streak', desc: 'Make 4 in a row! 16 balls.',
          goal: 'streak', need: 4, balls: 16, spots: ['top', 'lelb', 'relb', 'close'], order: 'cycle', trains: true }
      ]
    },
    {
      id: 'snow', name: 'Snowy Court', env: 'snow', built: true, rival: 'anya',
      blurb: 'Slippery rim, frosty hands.', map: { x: 0.7, y: 0.2 },
      challenges: [
        { id: 'n1', name: 'Frosty Rim', desc: 'The icy rim is bouncy! Make 5 from 10 balls.',
          goal: 'makes', need: 5, balls: 10, spots: ['top', 'lw', 'rw', 'lelb', 'relb'], order: 'cycle' },
        { id: 'n2', name: 'Snowflake Smash', desc: 'Hit all 3 targets on the frosty glass. 12 balls.',
          goal: 'targets', need: 3, balls: 12, spots: ['lw', 'top', 'rw'], order: 'cycle',
          targets: [{ x: -0.55, y: 3.3 }, { x: 0, y: 3.78 }, { x: 0.55, y: 3.3 }] },
        { id: 'n3', name: 'Whiteout', desc: 'The hoop vanishes when you aim! Make 3 from 10.',
          goal: 'makes', filter: 'blind', need: 3, balls: 10, spots: ['top', 'close', 'lelb', 'relb'], order: 'cycle' }
      ]
    },
    {
      id: 'arena', name: 'The Arena Final', env: 'arena', built: true, rival: 'champ', final: true,
      blurb: 'The big stage. The big lights.', map: { x: 0.5, y: 0.08 },
      challenges: [
        { id: 'a1', name: 'Spotlight Seven', desc: 'Score from all 7 spots. 14 balls.',
          goal: 'arc', need: 7, balls: 14, spots: ['lb', 'lw', 'lelb', 'top', 'relb', 'rw', 'rb'] },
        { id: 'a2', name: 'Showtime', desc: 'Score 24 points in 60 seconds. ON FIRE counts!',
          goal: 'points', need: 24, time: 60, spots: ['close', 'top', 'lw', 'rw', 'lelb', 'relb', 'deep'], order: 'random', fire: true },
        { id: 'a3', name: 'No-Look Legend', desc: 'No glow on the power bar! Make 3 from 10.',
          goal: 'makes', filter: 'nolook', need: 3, balls: 10, spots: ['top', 'lelb', 'relb', 'close'], order: 'cycle' }
      ]
    }
  ];
  D.courtById = function (id) {
    for (var i = 0; i < D.COURTS.length; i++) if (D.COURTS[i].id === id) return D.COURTS[i];
    return null;
  };

  // ---------- Cosmetics ----------
  D.SKINS = ['#ffdbb5', '#f1c08e', '#d9a066', '#b97a4a', '#8d5a36', '#5c3a22'];
  D.HAIR_COLORS = ['#1d1410', '#4a2c17', '#8a5a2b', '#d9a441', '#c0392b', '#3b82f6'];
  // cost 0 = free
  D.ITEMS = {
    hair: [
      { id: 'short', name: 'Short Crop', cost: 0 },
      { id: 'buzz', name: 'Buzz', cost: 0 },
      { id: 'curly', name: 'Curly Top', cost: 0 },
      { id: 'afro', name: 'Big Afro', cost: 0 },
      { id: 'ponytail', name: 'Ponytail', cost: 0 },
      { id: 'bun', name: 'Top Bun', cost: 0 },
      { id: 'twists', name: 'Twists', cost: 40 },
      { id: 'braids', name: 'Long Braids', cost: 40 },
      { id: 'mohawk', name: 'Mohawk', cost: 60 },
      { id: 'hijab', name: 'Sport Hijab', cost: 0 },
      { id: 'cap', name: 'Backwards Cap', cost: 50 }
    ],
    jersey: [
      { id: 'orange', name: 'Street Orange', cost: 0, c1: '#ff7a1a', c2: '#ffffff' },
      { id: 'blue', name: 'Ocean Blue', cost: 0, c1: '#2563eb', c2: '#ffd23f' },
      { id: 'red', name: 'Fire Red', cost: 0, c1: '#e11d48', c2: '#ffffff' },
      { id: 'lime', name: 'Lime Light', cost: 60, c1: '#84cc16', c2: '#1e293b' },
      { id: 'purple', name: 'Royal Purple', cost: 60, c1: '#7c3aed', c2: '#facc15' },
      { id: 'teal', name: 'Teal Wave', cost: 80, c1: '#0d9488', c2: '#ffffff' },
      { id: 'black', name: 'Midnight', cost: 100, c1: '#18181b', c2: '#f472b6' },
      { id: 'sunset', name: 'Sunset Fade', cost: 120, c1: '#f97316', c2: '#7c3aed', fade: true },
      { id: 'gold', name: 'Champion Gold', cost: 250, c1: '#eab308', c2: '#18181b' },
      // Court jerseys (v0.3): earned by getting all 3 stars on that court.
      { id: 'park_j', name: 'Park Classic', cost: 0, court: 'park', c1: '#15803d', c2: '#fef08a' },
      { id: 'gym_j', name: 'Varsity Blue', cost: 0, court: 'gym', c1: '#1e3a8a', c2: '#f8fafc' },
      { id: 'roof_j', name: 'Rooftop Dusk', cost: 0, court: 'roof', c1: '#9d174d', c2: '#fb923c', fade: true },
      { id: 'beach_j', name: 'Tide Pool', cost: 0, court: 'beach', c1: '#0891b2', c2: '#fde68a' },
      { id: 'subway_j', name: 'Graffiti', cost: 0, court: 'subway', c1: '#6d28d9', c2: '#a3e635' },
      { id: 'snow_j', name: 'Snowflake', cost: 0, court: 'snow', c1: '#bae6fd', c2: '#1e40af' },
      { id: 'arena_j', name: 'Finals Red', cost: 0, court: 'arena', c1: '#b91c1c', c2: '#facc15' },
      // Street Event reward jerseys (v0.4)
      { id: 'glass_j', name: 'Glass Cannon', cost: 0, event: 'glass', c1: '#0ea5e9', c2: '#e0f2fe', fade: true },
      { id: 'rush_j', name: 'Rush Hour', cost: 0, event: 'rush', c1: '#facc15', c2: '#4c1d95' },
      { id: 'skyline_j', name: 'Skyline', cost: 0, event: 'downtown', c1: '#1e1b4b', c2: '#38bdf8', fade: true }
    ],
    shoes: [
      { id: 'white', name: 'Clean Whites', cost: 0, c1: '#f8fafc', c2: '#94a3b8' },
      { id: 'black', name: 'Stealth', cost: 0, c1: '#1f2937', c2: '#ef4444' },
      { id: 'red', name: 'Hot Reds', cost: 40, c1: '#ef4444', c2: '#ffffff' },
      { id: 'blue', name: 'Ice Blues', cost: 40, c1: '#38bdf8', c2: '#ffffff' },
      { id: 'gold', name: 'Gold Kicks', cost: 150, c1: '#facc15', c2: '#78350f' },
      { id: 'neon', name: 'Neon Glow', cost: 120, c1: '#a3e635', c2: '#ec4899' }
    ],
    ball: [
      { id: 'classic', name: 'Classic', cost: 0, c1: '#f97316', c2: '#1c1917' },
      { id: 'street', name: 'Street', cost: 50, c1: '#2563eb', c2: '#f97316', stripes: true },
      { id: 'melon', name: 'Watermelon', cost: 80, c1: '#22c55e', c2: '#14532d', melon: true },
      { id: 'galaxy', name: 'Galaxy', cost: 150, c1: '#4c1d95', c2: '#f0abfc', stars: true },
      { id: 'neon', name: 'Neon', cost: 120, c1: '#ec4899', c2: '#a3e635' },
      { id: 'gold', name: 'Golden', cost: 300, c1: '#facc15', c2: '#a16207' },
      // Street Event rewards (v0.4): earned with a GOLD finish in that week's event.
      { id: 'moon', name: 'Moonlight', cost: 0, event: 'moon', c1: '#cbd5e1', c2: '#1e3a8a', stars: true },
      { id: 'fireball', name: 'Fireball', cost: 0, event: 'fire', c1: '#f97316', c2: '#7f1d1d', stripes: true },
      { id: 'boing', name: 'Boing Ball', cost: 0, event: 'boing', c1: '#22c55e', c2: '#facc15', stripes: true }
    ],
    celebration: [
      { id: 'pump', name: 'Fist Pump', cost: 0 },
      { id: 'spin', name: 'Spin Move', cost: 60 },
      { id: 'robot', name: 'The Robot', cost: 80 },
      { id: 'heart', name: 'Heart Hands', cost: 60 },
      { id: 'flex', name: 'Double Flex', cost: 100 },
      { id: 'bow', name: 'Big Bow', cost: 120 },
      // v0.4: more moves for the signature combo
      { id: 'shimmy', name: 'Shoulder Shimmy', cost: 50 },
      { id: 'dab', name: 'The Dab', cost: 70 },
      { id: 'hang', name: 'Rim Hang', cost: 90 }
    ],
    // Accessories. Items with a "reward" rival are earned by reaching Legend respect with that rival.
    gear: [
      { id: 'none', name: 'No Gear', cost: 0, kind: 'none' },
      { id: 'band_red', name: 'Red Headband', cost: 40, kind: 'headband', c1: '#ef4444' },
      { id: 'band_blue', name: 'Blue Headband', cost: 40, kind: 'headband', c1: '#3b82f6' },
      { id: 'wrist_gold', name: 'Gold Wristbands', cost: 60, kind: 'wrist', c1: '#facc15' },
      { id: 'visor', name: 'Beach Visor', cost: 80, kind: 'visor', c1: '#14b8a6' },
      { id: 'beanie', name: 'Cozy Beanie', cost: 80, kind: 'beanie', c1: '#f472b6' },
      { id: 'phones', name: 'Headphones', cost: 120, kind: 'phones', c1: '#f97316' },
      { id: 'hops', name: 'Hops Headband', cost: 0, reward: 'leo', kind: 'headband', c1: '#ff4d6d' },
      { id: 'prof', name: 'Professor Specs', cost: 0, reward: 'priya', kind: 'glasses', c1: '#111111' },
      { id: 'breeze', name: 'Breeze Shades', cost: 0, reward: 'kofi', kind: 'shades', c1: '#111111' },
      { id: 'wave', name: 'Wave Visor', cost: 0, reward: 'marina', kind: 'visor', c1: '#0ea5e9' },
      { id: 'echo', name: 'Echo Phones', cost: 0, reward: 'dj', kind: 'phones', c1: '#a855f7' },
      { id: 'frost', name: 'Frost Beanie', cost: 0, reward: 'anya', kind: 'beanie', c1: '#38bdf8' },
      { id: 'crown', name: 'Champion Crown', cost: 0, reward: 'champ', kind: 'crown', c1: '#facc15' },
      // Street Event reward gear (v0.4)
      { id: 'gust', name: 'Storm Headband', cost: 0, event: 'gust', kind: 'headband', c1: '#38bdf8' },
      { id: 'gullvisor', name: 'Gull Visor', cost: 0, event: 'gull', kind: 'visor', c1: '#f8fafc' },
      { id: 'globe', name: 'Snow Globe Beanie', cost: 0, event: 'globe', kind: 'beanie', c1: '#a78bfa' },
      { id: 'streakband', name: 'Hot Streak Band', cost: 0, event: 'streak', kind: 'headband', c1: '#f43f5e' }
    ],
    // Ball trails (v0.3): unlocked by discovering trick shots in the Trick Shot Hall.
    trail: [
      { id: 'none', name: 'No Trail', cost: 0 },
      { id: 'spark', name: 'Sparkle', cost: 0, tricks: 1, c1: '#5ef2ff', c2: '#ffffff' },
      { id: 'comet', name: 'Comet', cost: 0, tricks: 3, c1: '#ffffff', c2: '#93c5fd' },
      { id: 'bubble', name: 'Bubbles', cost: 0, tricks: 6, c1: '#7dd3fc', c2: '#e0f2fe' },
      { id: 'rainbow', name: 'Rainbow', cost: 0, tricks: 9, c1: '#f43f5e', c2: '#22c55e' },
      { id: 'stars', name: 'Star Dust', cost: 0, tricks: 13, c1: '#facc15', c2: '#fff7ae' },
      { id: 'galaxy', name: 'Galaxy', cost: 0, tricks: 17, c1: '#a855f7', c2: '#f0abfc' },
      { id: 'legend', name: 'Legend Flame', cost: 0, tricks: 21, c1: '#ffd23f', c2: '#ff3d00' },
      { id: 'aurora', name: 'Aurora', cost: 0, tricks: 28, c1: '#34d399', c2: '#a78bfa' }
    ]
  };
  D.GEAR_CATS = ['hair', 'jersey', 'shoes', 'ball', 'celebration', 'gear', 'trail'];
  D.item = function (cat, id) {
    var list = D.ITEMS[cat] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  };

  D.NICK_A = ['Swift', 'Cosmic', 'Turbo', 'Lucky', 'Mighty', 'Silky', 'Rocket', 'Sunny', 'Thunder', 'Nimble', 'Golden', 'Clutch', 'Breezy', 'Electric', 'Hyper'];
  D.NICK_B = ['Comet', 'Falcon', 'Panda', 'Tiger', 'Hopper', 'Shooter', 'Ninja', 'Wizard', 'Otter', 'Fox', 'Rocket', 'Dolphin', 'Phoenix', 'Penguin', 'Dragon'];

  // ---------- Commentary (always encouraging) ----------
  D.CALLS = {
    swish: ['SWISH!', 'Nothing but net!', 'Pure silk!', 'Splash!', 'Cash money!'],
    bank: ['Off the glass!', 'Bank is OPEN!', 'Kiss off the glass!'],
    rattle: ['Rattled in!', 'Friendly roll!', 'It found a way!'],
    make: ['Bucket!', 'Count it!', 'Good!', 'In it goes!'],
    perfect: ['PERFECT RELEASE'],
    rimOut: ['So close!', 'In and out!', 'Rim said no!'],
    miss: ['Shake it off!', 'Next one!', 'Reset and fire!'],
    airball: ['Airball! It happens!', 'Whoosh... next one!'],
    fire: ["YOU'RE ON FIRE!"],
    clutch: ['CLUTCH!', 'Ice cold!'],
    bounceShot: ['BOUNCE BUCKET!', 'Off the floor!', 'Boing... SWISH!'],
    blindShot: ['Eyes closed!', 'Didn\'t even look!', 'Pure memory!'],
    noLookShot: ['NO-LOOK!', 'Felt that one!'],
    movingShot: ['On the run!', 'Moving and grooving!']
  };

  // "MC Mic", the friendly commentator. Lines are short, upbeat and never mean.
  D.MC = {
    name: 'MC Mic',
    start: ['Welcome to {court}! Let\'s get buckets!', 'MC Mic here, live from {court}!', 'The crowd is HERE for you at {court}!'],
    swish: ['That ball had a GPS!', 'Only net. Beautiful!', 'Did anyone hear the rim? Me neither!', 'Silky smooth, folks!'],
    bank: ['Kiss off the glass. Mwah!', 'Backboard says: you\'re welcome!', 'Glass is open for business!'],
    rattle: ['It danced on the rim... and IN!', 'The rim tried, but no!', 'Friendly bounces only!'],
    make: ['Count it!', 'Bucket getter!', 'That\'s how we do it!', 'Easy two!'],
    deep: ['From DOWNTOWN!', 'Is that legal from way out there?!', 'Call the city planners, that\'s DEEP!'],
    streak: ['{n} in a row! Somebody stop this kid!', 'Make number {n}! The streak is real!'],
    fire: ['WE HAVE A FIRE! Bring the hose!', 'This kid is ON FIRE!'],
    clutch: ['ICE in the veins!', 'Clutch city!'],
    miss: ['Shake it off, next one\'s yours!', 'Even legends miss. Reset!', 'Good look, keep firing!'],
    airball: ['Airball! The air says thanks!', 'Whoosh! Practice swing!'],
    rimOut: ['In and out! So close!', 'The rim was being greedy!'],
    gull: ['A seagull blocked it! Rude bird!', 'Squawk! Gull on the court!'],
    train: ['Here comes the 5:15 train!', 'Train coming! Hold on to your ball!'],
    replay: ['Let\'s see that again!', 'Instant replay, folks!'],
    dunk: ['SLAM! The hoop is shaking!', 'Posterized the air!', 'What a jam!'],
    buzzer: ['AT THE BUZZER!', 'From half court?! NO WAY!'],
    trick: ['Did that just happen?! TRICK SHOT!', 'Somebody film that! Oh wait, I did!', 'That is going in the Hall!'],
    pass: ['Great pass from {n}!', '{n} finds you open!', 'Dish from {n}!'],
    allstar: ['The All-Stars answer back!', '{n} for the All-Stars!']
  };

  // ---------- Trick Shot Hall (v0.3) ----------
  // Signature tricks use a court prop in Trick Shot mode. Skill tricks can happen in any mode.
  D.TRICKS = [
    { id: 'bench', court: 'park', sig: true, name: 'Bench Bounce', hint: 'Bounce it off the park bench and in!' },
    { id: 'tramp', court: 'gym', sig: true, name: 'Trampoline Launch', hint: 'Spring it off the gym trampoline!' },
    { id: 'acpop', court: 'roof', sig: true, name: 'AC Pop', hint: 'Pop it off the rooftop air-conditioner!' },
    { id: 'tower', court: 'beach', sig: true, name: 'Lifeguard Lob', hint: 'Bank it off the lifeguard tower!' },
    { id: 'pillar', court: 'subway', sig: true, name: 'Pillar Bank', hint: 'Bank it off the subway pillar!' },
    { id: 'snowman', court: 'snow', sig: true, name: 'Snowman Hoop', hint: 'Shoot through the snowman\'s hoop!' },
    { id: 'firering', court: 'arena', sig: true, name: 'Ring of Fire', hint: 'Fly it through the ring of fire!' },
    // v0.4: a second signature prop on every court (two of them move!)
    { id: 'tireswing', court: 'park', sig: true, slot: 1, name: 'Tire Swing', hint: 'Thread it through the swinging tire!' },
    { id: 'vault', court: 'gym', sig: true, slot: 1, name: 'Vault Hop', hint: 'Spring it off the vault box!' },
    { id: 'watertower', court: 'roof', sig: true, slot: 1, name: 'Water Tower Bank', hint: 'Bank it off the water tower!' },
    { id: 'surfboard', court: 'beach', sig: true, slot: 1, name: 'Surfboard Skip', hint: 'Skip it off the surfboard!' },
    { id: 'trainroof', court: 'subway', sig: true, slot: 1, name: 'Train Roof Hop', hint: 'Bounce it off the roof of the Plaza Express!' },
    { id: 'sled', court: 'snow', sig: true, slot: 1, name: 'Sled Jump', hint: 'Hop it off the sled!' },
    { id: 'drum', court: 'arena', sig: true, slot: 1, name: 'Big Drum Boom', hint: 'Boom it off the band\'s big drum!' },
    { id: 'moon', name: 'Moon Ball', hint: 'Make a shot that flies higher than 7.5 metres.' },
    { id: 'dancer', name: 'Rim Dancer', hint: 'Make one that bounces on the rim 4 times first.' },
    { id: 'kissroll', name: 'Kiss and Roll', hint: 'Off the glass, around the rim, and in!' },
    { id: 'downtown', name: 'Downtown Splash', hint: 'Swish one from way downtown (deep spots).' },
    { id: 'halfcourt', name: 'Half-Court Hero', hint: 'Make one from half court.' },
    { id: 'blindside', name: 'Blindside Swish', hint: 'Swish a No-Look shot.' },
    { id: 'memory', name: 'Memory Bank', hint: 'Bank one in with your eyes closed.' },
    { id: 'boingswish', name: 'Boing Swish', hint: 'Swish a Bounce Shot.' },
    { id: 'trainride', name: 'Train Rider', hint: 'Score while a train roars past the Subway Plaza.' },
    { id: 'gulldodge', name: 'Gull Dodger', hint: 'Score in Gull Patrol while the gull is flying.' },
    { id: 'icecold', name: 'Ice Cold', hint: 'Swish it in the last seconds of the clock.' },
    { id: 'friendly', name: 'Friendly Roll', hint: 'Score after the rim gives your ball a nudge.' },
    { id: 'windrider', name: 'Wind Rider', hint: 'Score in a big gust (wind 1.3 or more).' },
    { id: 'driveby', name: 'Drive-By', hint: 'Swish one On the Move.' }
  ];
  D.trick = function (id) { for (var i = 0; i < D.TRICKS.length; i++) if (D.TRICKS[i].id === id) return D.TRICKS[i]; return null; };

  // Where each court's signature prop stands (hoop at x = 0, z = 0; the rim is 3.05 m up).
  // type 'box' props are banked or bounced off; type 'ring' props are flown through.
  D.TRICK_SETUPS = {
    park: { trick: 'bench', spot: 'top', art: 'bench',
      prop: { type: 'box', x0: -0.9, x1: 0.9, y0: 0, y1: 0.5, z0: -2.2, z1: -1.7, e: 0.7, mu: 0.3,
        face: { axis: 'y', v: 0.5, a: [-0.3, 0.3], b: [-2.15, -1.75] }, alphas: [60, 66, 72, 78, 84], spins: [1, 0, -1] } },
    gym: { trick: 'tramp', spot: 'deep', art: 'tramp',
      prop: { type: 'box', x0: -0.55, x1: 0.55, y0: 0, y1: 0.28, z0: -3.45, z1: -2.35, e: 0.92, mu: 0.2,
        face: { axis: 'y', v: 0.28, a: [-0.3, 0.3], b: [-3.3, -2.5] }, alphas: [58, 66, 74, 82], spins: [1, 0, -1] } },
    roof: { trick: 'acpop', spot: 'relb', art: 'ac',
      prop: { type: 'box', x0: 0.4, x1: 1.1, y0: 0, y1: 1.1, z0: -1.9, z1: -1.2, e: 0.7, mu: 0.3,
        face: { axis: 'y', v: 1.1, a: [0.45, 1.05], b: [-1.85, -1.25] }, alphas: [64, 72, 80, 84], spins: [1, 0, -1] } },
    beach: { trick: 'tower', spot: 'rw', art: 'tower',
      prop: { type: 'box', x0: -2.5, x1: -1.9, y0: 2.4, y1: 4.4, z0: -1.0, z1: -0.3, e: 0.55, mu: 0.25,
        face: { axis: 'x', v: -1.9, a: [3.3, 4.4], b: [-1.0, -0.3] } } },
    subway: { trick: 'pillar', spot: 'lw', art: 'pillar',
      prop: { type: 'box', x0: 1.9, x1: 2.5, y0: 0, y1: 5.2, z0: -1.0, z1: -0.4, e: 0.6, mu: 0.2,
        face: { axis: 'x', v: 1.9, a: [3.2, 5.0], b: [-1.0, -0.4] } } },
    snow: { trick: 'snowman', spot: 'relb', art: 'snowman', ring: { f: 0.58, y: 4.4, R: 0.36 } },
    arena: { trick: 'firering', spot: 'deep', art: 'firering', ring: { x: 0, y: 5.7, z: -3.1, R: 0.42 } }
  };
  // v0.4: the second signature prop on each court. It unlocks once you land the first one.
  // move: 'swing' sways a ring along the shot line; 'train' rolls a box across the court and
  // stops at the "station" in the middle. The solver always uses the resting position.
  D.TRICK_SETUPS2 = {
    park: { trick: 'tireswing', spot: 'lw', art: 'tire', ring: { f: 0.55, y: 4.2, R: 0.42, tube: 0.06 },
      move: { kind: 'swing', amp: 0.55, period: 3.2 } },
    gym: { trick: 'vault', spot: 'rw', art: 'vault',
      prop: { type: 'box', x0: 0.53, x1: 1.13, y0: 0, y1: 1.0, z0: -1.36, z1: -0.76, e: 0.85, mu: 0.3,
        face: { axis: 'y', v: 1.0, a: [0.58, 1.08], b: [-1.31, -0.81] }, alphas: [56, 62, 68, 74, 80, 84], spins: [1, 0, -1] } },
    roof: { trick: 'watertower', spot: 'lw', art: 'watertower',
      prop: { type: 'box', x0: 2.0, x1: 2.8, y0: 2.6, y1: 4.8, z0: -1.2, z1: -0.4, e: 0.6, mu: 0.2,
        face: { axis: 'x', v: 2.0, a: [3.0, 4.6], b: [-1.2, -0.4] } } },
    beach: { trick: 'surfboard', spot: 'top', art: 'surfboard',
      prop: { type: 'box', x0: -0.3, x1: 0.3, y0: 0.62, y1: 0.72, z0: -2.23, z1: -1.03, e: 0.78, mu: 0.25,
        face: { axis: 'y', v: 0.72, a: [-0.25, 0.25], b: [-2.18, -1.08] }, alphas: [60, 66, 72, 78, 84], spins: [1, 0, -1] } },
    subway: { trick: 'trainroof', spot: 'deep', art: 'tram',
      prop: { type: 'box', x0: -1.6, x1: 1.6, y0: 0.25, y1: 1.55, z0: -2.8, z1: -2.0, e: 0.72, mu: 0.25,
        face: { axis: 'y', v: 1.55, a: [-0.3, 0.3], b: [-2.7, -2.1] }, alphas: [50, 56, 62, 68, 74, 80], spins: [1, 0, -1] },
      move: { kind: 'train' } },
    snow: { trick: 'sled', spot: 'deep', art: 'sled',
      prop: { type: 'box', x0: -0.3, x1: 0.3, y0: 0, y1: 0.5, z0: -2.7, z1: -2.1, e: 0.78, mu: 0.2,
        face: { axis: 'y', v: 0.5, a: [-0.25, 0.25], b: [-2.65, -2.15] }, alphas: [60, 66, 72, 78, 84], spins: [1, 0, -1] } },
    arena: { trick: 'drum', spot: 'ldeep', art: 'drum',
      prop: { type: 'box', x0: -1.5, x1: -0.7, y0: 0, y1: 0.95, z0: -2.31, z1: -1.51, e: 0.9, mu: 0.25,
        face: { axis: 'y', v: 0.95, a: [-1.45, -0.75], b: [-2.26, -1.56] }, alphas: [56, 62, 68, 74, 80, 84], spins: [1, 0, -1] } }
  };
  D.trickSetup = function (courtId, slot) { return slot ? D.TRICK_SETUPS2[courtId] : D.TRICK_SETUPS[courtId]; };

  // ---------- Team Up (v0.3): crew perks and relay challenges ----------
  D.CREW = {
    leo: { perk: 'Big Glow', desc: 'His passes come with a bigger perfect-release glow.', icon: 'bolt' },
    priya: { perk: 'Angle Ace', desc: 'Her passes halve your aim wobble.', icon: 'glass' },
    kofi: { perk: 'Calm Air', desc: 'His passes calm the wind way down.', icon: 'move' },
    marina: { perk: 'Rebound Queen', desc: 'Miss after her pass? She grabs the rebound: shoot again!', icon: 'retry' },
    dj: { perk: 'On the Beat', desc: 'Perfect releases after his pass score +1.', icon: 'mic' },
    anya: { perk: 'Ice Veins', desc: 'Her passes steady your power bar and slow time near the rim.', icon: 'clock' }
  };
  D.CREW_IDS = ['leo', 'priya', 'kofi', 'marina', 'dj', 'anya'];
  // The twist each crewmate calls in the Twist Relay.
  D.CREW_TWIST = { leo: 'normal', priya: 'bank', kofi: 'swish', marina: 'bounce', dj: 'nolook', anya: 'blind' };
  D.RELAYS = [
    { id: 'rush', name: 'Relay Rush', desc: 'Your crew feeds you passes for 60 seconds. Score big!', stars: [20, 30, 40], unit: 'points' },
    { id: 'twist', name: 'Twist Relay', desc: 'Nine passes. Each crewmate calls their trick. Make them!', stars: [4, 6, 8], unit: 'makes' },
    { id: 'show', name: 'All-Star Game', desc: 'Your crew against the All-Stars. First to 15 wins!', stars: [1, 2, 3], unit: 'win' }
  ];

  // ---------- Court moods on revisits (v0.3) ----------
  // Once you have beaten a court's rival, the court sometimes shows up at another time of day.
  D.VARIANTS = {
    sunset: { name: 'Golden Hour', sky: ['#3b1d5e', '#ffb067'], tint: 'rgba(255,140,60,0.14)' },
    night: { name: 'Night Lights', sky: ['#050818', '#1e2a5a'], tint: 'rgba(8,14,48,0.42)', lights: true },
    rain: { name: 'Rainy Day', sky: ['#5b6676', '#a5b0bd'], tint: 'rgba(70,90,120,0.22)', rain: true }
  };
  D.COURT_VARIANTS = { park: ['sunset', 'night', 'rain'], roof: ['night', 'rain'], beach: ['sunset', 'night'], subway: ['night', 'rain'], snow: ['sunset', 'night'] };

  // ---------- Aim Assist (v0.4) ----------
  // The only setting that changes how a shot flies. win scales the perfect-release glow and wind
  // scales the wind on your own shots (rivals are never affected). Normal is exactly 1 and 1, so
  // the core flick is unchanged unless a player picks Easy or Pro.
  D.ASSIST = {
    easy: { id: 'easy', name: 'Easy', win: 1.5, wind: 0.5, desc: 'Bigger glow, gentler wind.' },
    normal: { id: 'normal', name: 'Normal', win: 1, wind: 1, desc: 'The classic Swish Street shot.' },
    pro: { id: 'pro', name: 'Pro', win: 0.75, wind: 1, desc: 'A thinner glow. For sharpshooters!' }
  };
  D.ASSIST_ORDER = ['easy', 'normal', 'pro'];

  // ---------- Street Events (v0.4) ----------
  // One themed remix of a court each week (picked from the week number, so it rotates by itself).
  // A 60-second points round with a twist. Bronze, silver and gold each pay coins once a week;
  // gold also unlocks that event's exclusive item for good.
  D.EVENTS = [
    { id: 'moon', name: 'Moonlight Madness', court: 'park', env: 'park', variant: 'night', color: '#6366f1',
      desc: 'Every 4th ball is a GOLDEN BALL worth triple!', golden: 4, tiers: [30, 55, 85], reward: ['ball', 'moon'] },
    { id: 'glass', name: 'Glass Bonanza', court: 'gym', env: 'gym', color: '#0ea5e9',
      desc: 'The hoop slides! Bank shots score 5.', move: { amp: 0.4, period: 5 }, bankPts: 5, tiers: [14, 22, 30], reward: ['jersey', 'glass_j'] },
    { id: 'gust', name: 'Gust Fest', court: 'roof', env: 'roof', color: '#f97316',
      desc: 'Gusts change while you aim. Swishes in the wind score +3!', wind: { base: 0.9, vary: true, gust: true }, windBonus: 3, tiers: [20, 35, 50], reward: ['gear', 'gust'] },
    { id: 'gull', name: 'Gull Gala', court: 'beach', env: 'beach', variant: 'sunset', color: '#eab308',
      desc: 'Gulls everywhere! Score past a flying gull for +2.', gulls: true, gullBonus: 2, tiers: [28, 45, 70], reward: ['gear', 'gullvisor'] },
    { id: 'rush', name: 'Rush Hour Remix', court: 'subway', env: 'subway', variant: 'rain', color: '#a855f7',
      desc: 'Trains every few seconds. Score while one passes for double!', trains: true, trainFast: true, tiers: [15, 30, 50], reward: ['jersey', 'rush_j'] },
    { id: 'globe', name: 'Snow Globe', court: 'snow', env: 'snow', variant: 'sunset', color: '#38bdf8',
      desc: 'Every 3rd shot is Eyes Closed and worth +4!', blindEvery: 3, blindBonus: 4, tiers: [30, 50, 72], reward: ['gear', 'globe'] },
    { id: 'fire', name: 'Fire Fest', court: 'arena', env: 'arena', color: '#ef4444',
      desc: 'Two swishes in a row and you are ON FIRE. Fire scores triple!', fire: true, fireAt: 2, fireMul: 3, tiers: [40, 75, 120], reward: ['ball', 'fireball'] },
    // v0.5: three more events, so the rotation is ten weeks long
    { id: 'boing', name: 'Boing Bash', court: 'gym', env: 'gym', color: '#22c55e',
      desc: 'Every 2nd shot is a Bounce Shot. Bounce it in for +4!', twistEvery: 2, twistId: 'bounce', twistBonus: 4,
      spots: ['top', 'lelb', 'relb', 'lw', 'rw'], tiers: [40, 56, 72], reward: ['ball', 'boing'] },
    { id: 'downtown', name: 'Downtown Lights', court: 'roof', env: 'roof', variant: 'night', color: '#0ea5e9',
      desc: 'Every shot is from way downtown. Deep swishes score 5!', spots: ['deep', 'ldeep', 'rdeep'], deepSwish: 5,
      tiers: [34, 52, 70], reward: ['jersey', 'skyline_j'] },
    { id: 'streak', name: 'Hot Streak', court: 'park', env: 'park', variant: 'sunset', color: '#f43f5e',
      desc: 'Each make in a row is worth 1 more than the last. Keep it going!', streakPts: true,
      tiers: [30, 52, 74], reward: ['gear', 'streakband'] }
  ];
  // The rotation (v0.5). Weeks before 2026-10-19 keep the old seven-week order, so the event that
  // was running when you updated does not change halfway through its week.
  D.EVENT_ORDER = ['boing', 'fire', 'rush', 'downtown', 'moon', 'glass', 'streak', 'gust', 'gull', 'globe'];
  D.eventById = function (id) { for (var i = 0; i < D.EVENTS.length; i++) if (D.EVENTS[i].id === id) return D.EVENTS[i]; return null; };
  D.TIER_NAMES = ['Bronze', 'Silver', 'Gold'];
  D.TIER_COLORS = ['#c2410c', '#94a3b8', '#facc15'];
  D.TIER_COINS = [20, 30, 50];

  // ---------- Friends (v0.4 pass-and-play) ----------
  // Player 2 builds a look from presets (no typing, no names, nothing personal).
  D.FRIENDS = [
    { name: 'Hoops', look: { skin: 1, hair: 'afro', hairColor: 0, jersey: 'blue', shoes: 'white', number: 3, gear: 'band_red', ball: 'street', celebration: 'spin' } },
    { name: 'Sparky', look: { skin: 4, hair: 'ponytail', hairColor: 1, jersey: 'red', shoes: 'neon', number: 8, gear: 'none', ball: 'neon', celebration: 'heart' } },
    { name: 'Splash', look: { skin: 2, hair: 'cap', hairColor: 0, jersey: 'teal', shoes: 'blue', number: 12, gear: 'none', ball: 'melon', celebration: 'robot' } },
    { name: 'Rocket', look: { skin: 5, hair: 'buzz', hairColor: 0, jersey: 'black', shoes: 'red', number: 21, gear: 'wrist_gold', ball: 'galaxy', celebration: 'flex' } },
    { name: 'Breezy', look: { skin: 0, hair: 'bun', hairColor: 3, jersey: 'lime', shoes: 'white', number: 5, gear: 'visor', ball: 'classic', celebration: 'bow' } },
    { name: 'Nova', look: { skin: 3, hair: 'hijab', hairColor: 4, jersey: 'purple', shoes: 'gold', number: 9, gear: 'none', ball: 'galaxy', celebration: 'heart' } },
    { name: 'Turbo', look: { skin: 2, hair: 'mohawk', hairColor: 5, jersey: 'sunset', shoes: 'black', number: 77, gear: 'phones', ball: 'street', celebration: 'dab' } },
    { name: 'Pixel', look: { skin: 1, hair: 'braids', hairColor: 2, jersey: 'orange', shoes: 'blue', number: 14, gear: 'beanie', ball: 'neon', celebration: 'shimmy' } }
  ];
  D.FREE_HAIR = ['short', 'buzz', 'curly', 'afro', 'ponytail', 'bun', 'hijab', 'twists', 'braids', 'mohawk', 'cap'];
  D.VS_GAMES = {
    horse: { name: 'H-O-R-S-E', desc: 'Set a shot. Your friend must match it or take a letter.' },
    shoot: { name: 'Shootout', desc: 'Three racks of 5 balls each. The last ball of a rack is worth 2!' },
    world: { name: 'Around the World', desc: 'Make it to move on to the next spot. Miss and you pass. First all the way round wins!' }
  };
  D.VS_GAME_ORDER = ['horse', 'shoot', 'world'];
  // Around the World (v0.5): seven spots from the left block round to the right block.
  D.WORLD_SPOTS = ['lb', 'lw', 'lelb', 'top', 'relb', 'rw', 'rb'];

  // ---------- Rookie to Legend (v0.5) ----------
  // Career rank comes from career points, which are worked out from your progress every time
  // (nothing extra is stored), so older saves get their rank straight away.
  D.RANKS = [
    { name: 'Rookie', pts: 0, color: '#94a3b8' },
    { name: 'Starter', pts: 120, color: '#22c55e' },
    { name: 'Hooper', pts: 400, color: '#0ea5e9' },
    { name: 'All-Star', pts: 900, color: '#a855f7' },
    { name: 'Pro', pts: 1700, color: '#f97316' },
    { name: 'Superstar', pts: 2900, color: '#ef4444' },
    { name: 'Legend', pts: 4500, color: '#facc15' }
  ];

  // ---------- Swish Cam photo studio (v0.5) ----------
  D.PHOTO_FRAMES = [
    { id: 'polaroid', name: 'Polaroid' },
    { id: 'comic', name: 'Comic' },
    { id: 'neon', name: 'Neon' },
    { id: 'card', name: 'Trading Card' }
  ];
  D.PHOTO_STICKERS = [
    { id: 'none', name: 'No sticker' },
    { id: 'star', name: 'Star' },
    { id: 'crown', name: 'Crown' },
    { id: 'flame', name: 'Flame' },
    { id: 'heart', name: 'Heart' },
    { id: 'splash', name: 'Splash!' }
  ];

  // ---------- Signature celebration combo (v0.4) ----------
  D.COMBO_FX = [
    { id: 'confetti', name: 'Confetti', colors: ['#ffd23f', '#ff5a1f', '#5ef2ff', '#ff4d6d', '#7cff6b'] },
    { id: 'fireworks', name: 'Fireworks', colors: ['#fde047', '#f472b6', '#60a5fa', '#ffffff'] },
    { id: 'stars', name: 'Star Shower', colors: ['#facc15', '#fff7ae', '#ffffff'] },
    { id: 'hearts', name: 'Hearts', colors: ['#ff4d6d', '#f9a8d4', '#ffffff'] },
    { id: 'bolts', name: 'Lightning', colors: ['#fde047', '#a5f3fc', '#ffffff'] },
    { id: 'bubbles', name: 'Bubbles', colors: ['#7dd3fc', '#e0f2fe', '#ffffff'] }
  ];
  // Shout-outs come from this list only (no free text). All of them are friendly.
  D.COMBO_LINES = ['Splash!', 'Buckets!', "Let's go!", 'Nothing but net!', 'Feeling it!', 'Thanks, crowd!', 'Count it!', 'Swish City!', 'Practice pays!', 'Good game!'];
})();
