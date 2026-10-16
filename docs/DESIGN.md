# Swish Street: Game Design

*A street-basketball journey for kids aged 9 to 12. You build your own baller, travel the city court by court, and earn respect from rivals through shooting skill and good sportsmanship.*

Version 0.5 ("Even cooler" round). Platform: iPhone first, then iPad. HTML5 Canvas, wrapped with Capacitor for the App Store.

**What's new in 0.5:**
- **Around the World** (section 4.10): a third pass-and-play game. Seven spots round the arc; make it and you move on and shoot again, miss and the phone passes. Player 2 always gets a last chance to tie, and a tie goes to sudden death.
- **Sudden death that always ends** (section 4.10): each tied sudden-death round now moves one step further out (Top of the Key, Way Downtown, Left Deep, Right Deep, Half Court). This also applies to the Shootout.
- **Three new Street Events** (section 4.11): Boing Bash, Downtown Lights and Hot Streak, each with its own gold prize. The rotation is now ten weeks long, and the week that was running on the update day is unchanged.
- **Rookie to Legend** (section 4.12): a career rank (Rookie, Starter, Hooper, All-Star, Pro, Superstar, Legend) worked out from your whole progress, a Trophy Room with 25 trophies (20 coins each) and a Career stats page.
- **Swish Cam photo studio** (section 3.4): four frames (Polaroid, Comic, Neon, Trading Card with your rank and numbers) and six stickers. The game remembers your favourite frame.
- **Court life** (section 6.1): pigeons, robins and beach crabs that scatter when a ball lands near them or the crowd roars, passers-by who stop to cheer your makes (and groan at misses), umbrellas in the rain and autumn leaves in the park.
- **Polish:** Swish Cam photos from Quick Play, the Daily and H-O-R-S-E now name the real court instead of "Swish Street".

**What was new in 0.4:**
- **2 Players, pass and play** (section 4.10): H-O-R-S-E or a Shootout against a friend on one device. Player 2 builds a look from presets (no typing), and a "Pass the phone!" card appears before every turn. Fully offline, no accounts.
- **Aim Assist** (section 3.1): an Easy / Normal / Pro setting. Easy widens the perfect-release glow by half and halves the wind on your own shots; Pro thins the glow. Normal is untouched (the regression fingerprint matches v0.3 exactly). In 2 Players each player picks their own level, so an older and a younger sibling can play fairly.
- **A second signature trick on every court** (section 3.3), 28 tricks in all. Two of them move: a **Tire Swing** that sways across your shot and the **Plaza Express** shuttle train that rolls in and stops at the station. A GO light tells you when a perfect release would land it.
- **Weekly Street Events** (section 4.11): one themed court remix each week (golden balls, gust fests, gull galas, rush-hour trains...), with bronze, silver and gold medals and an exclusive prize for gold.
- **Signature celebration combos** (section 5): chain three moves, pick a finale effect and a shout-out. Three new moves: Shoulder Shimmy, The Dab and Rim Hang.
- **Fix:** in the Arena Trick Shot, the Ring of Fire no longer sits on top of the score chips and buttons (the camera looks up with a wider lens).

**What was new in 0.3:**
- **Trick Shot Hall** (section 3.3): 21 named trick shots to discover. Seven are signature tricks that use a prop on each court (Bench Bounce, Trampoline Launch, AC Pop, Lifeguard Lob, Pillar Bank, Snowman Hoop, Ring of Fire) in the new Trick Shot mode. The other 14 are skill tricks that can happen in any mode (Moon Ball, Rim Dancer, Train Rider, Gull Dodger and more).
- **Story comics** (section 4.7): comic-page cutscenes drawn in code. An intro plays, then a chapter after each first rival win, where the rival becomes a friend. The Champion finale opens Team Up.
- **Team Up** (section 4.8): after beating the Champion, pick two rivals as your crew. Their passes give perks, and there are three crew relays, including an All-Star Game against the Champion's team.
- **Swish Cam**: a slow-motion polaroid of the ball dropping through the net. It is saved to an in-game Photo Album.
- **Ball trails** (earned by finding tricks), **court jerseys** (earned with 3 stars on a court) and **court moods** on revisits (golden hour, night lights, rain).
- **Accessibility and fixes**: a "Glow was here" reveal after No-Look shots, colour-blind-safe targets and dunk taps, a VoiceOver/keyboard button layer with spoken call-outs, a map that fits small phones, and a camera that follows sky-high bounce shots.

**What was new in 0.2:** all 7 courts are built (Beach Boardwalk, Subway Plaza, Snowy Court and The Arena Final with a Champion finale), four trick twists (Bounce Shot, Eyes Closed, No-Look, On the Move), a rival respect ladder with Legend rewards, two arcade modes (Dunk Fest and Buzzer Beater), instant slow-motion replays, the MC Mic commentator, crowd reactions, court-specific music, a Gear locker tab, a left-handed layout and larger text, and the App Store icon and launch screen.

---

## 1. Pillars

1. **The shot feels amazing.** Every flick has weight, arc and spin. The ball rattles, banks and swishes for real, and the net ripples. Juice (sound, shake, slow-mo, confetti, commentary) rewards good shots without hiding bad ones.
2. **Easy to learn, real to master.** One gesture: swipe up and let go. The glowing *perfect release* band rewards timing, and tilting the swipe aims. Wind, moving hoops and bank shots add depth later.
3. **Good sports, always.** Rivals are friendly characters, not villains. Losing is never harsh, retries are instant, and every line of commentary is encouraging.
4. **Safe and fair.** No ads, no purchases, no loot boxes, no chat and no data collection. Coins come only from play and buy only cosmetics.

## 2. Audience

- **Ages 9 to 12.** They can read short sentences and enjoy mastery, collecting and light competition.
- Sessions of 2 to 10 minutes. Every mode ends with a clear result screen.
- Text is chunky and high-contrast. Buttons are at least 44 points. Instructions use at most one or two short sentences.
- All player-facing text goes through `SS.t()`, so the game can be translated later.

## 3. Core loop

```
Pick a mode -> shoot (swipe up, release in the glow, tilt to aim)
  -> instant feedback (swish / bank / rattle / rim-out, crowd, call-out)
  -> result screen (stars, coins, best scores)
  -> Locker (spend coins on cosmetics and celebrations) -> play again or move on.
```

### 3.1 The shot (built)

- **Gesture.** Press anywhere on the court and drag **up**. The power gauge fills with the drag length (about 36% of the screen height for full power). Let go to shoot. Tilt the drag left or right to aim. A 3-degree dead zone keeps straight swipes straight. (The gauge moves to the left edge with the left-handed setting.)
- **Perfect release window.** A glowing cyan band sits on the gauge. The ideal power depends on distance. Releasing inside the band:
  - snaps the power to the clean arc (a swish with no wind),
  - tightens the aim (except in wind, where you must aim into it yourself),
  - shows "PERFECT!", plays a chime, gives a light haptic tap and sparks.
- **Outside the band,** power error is measured from the edge of the glow, so "almost perfect" still usually scores and big misses really miss. Short shots clang off the front rim, and long ones bank or bounce out.
- **Aim Assist (0.4).** Settings > Aim Assist: **Easy**, **Normal** (default) or **Pro**. This is the only setting that changes how a shot flies, and it only touches your own shots (rivals never get it).

  | Level | Perfect-release glow | Wind on your shots | Who it is for |
  |---|---|---|---|
  | Easy | 1.5x wider | x0.5 | younger players, or anyone stuck |
  | Normal | as before | as before | everyone (the classic shot) |
  | Pro | 0.75x | as before | sharpshooters |

  - The glow multiplier applies to whatever window a mode uses (tutorial, Buzzer Beater and Team Up perks scale too). The wind chip shows the softened wind, so what you see is what the ball feels.
  - A small EASY / PRO badge sits under the power bar so nobody forgets it is on.
  - Normal multiplies by exactly 1, so the regression fingerprint (`SS.debug.fingerprint()`) is identical to v0.3: hash **-745396852**. Easy and Pro give different hashes, as they should.
- **Physics** (`src/physics.js`) runs at a fixed 240 Hz:
  - the rim is a torus with restitution and friction, so the ball can roll, rattle or spin out,
  - the backboard is a box, the rim-to-board bracket is a bar, and the floor bounces,
  - backspin couples to friction on every contact,
  - wind is a lateral force across the shooter's view,
  - swish detection means the ball crosses the rim plane downward inside the ring without touching rim or glass,
  - bank detection means the glass was touched before scoring,
  - a "friendly roll" nudge saves a ball stuck on the rim.
- **Ideal-shot solver.** Simulates each spot headlessly and finds the launch that swishes (or banks cleanly, for bank shots). It also powers rival shots and the moving-hoop lead.
- **Net.** A verlet cloth of 7 rings by 14 knots in a diamond lattice. The ball pushes the knots, the net slows the ball, and it ripples and sways.
- **Juice.**
  - Sound: synth rim clank, glass thud, swish hiss, bounces, crowd cheer and "aww".
  - Visuals: screen kick on rim hits, a zoom punch on scoring, confetti bursts and a backboard flash.
  - Clutch slow-motion when the ball nears the rim on a clutch shot (last seconds of a timed round, or "letter E on the line").
  - A big call-out (SWISH! / Off the glass! / Rattled in!) and a crowd that jumps.
  - A celebration card that plays your equipped move after big shots.
  - "Reduced effects" turns off shake, slow-mo and most particles.
- **MC Mic (0.2).** A friendly commentator in a lower-third pill with a typewriter line and cute "voice" blips (no recorded audio). Notable moments always get a line (deep shots, streaks, ON FIRE, clutch, trains, gulls, replays, dunks); ordinary shots only sometimes, so it never nags. Every line is encouraging.
- **Crowd reactions (0.2).** The crowd jumps and waves signs on makes and puts its hands on its heads ("ohhh!") on misses. Close-up fans have tiny faces. Crowds are drawn in batches per row so a packed Arena stays cheap.
- **Instant replay (0.2).** Every shot is recorded (ball, hoop and shooter). Big moments replay from a sweeping side camera in slow motion with letterbox bars; tap to skip. Used for Buzzer Beater makes, Dunk Fest slams and the H-O-R-S-E game-winning shot.

### 3.2 Trick twists (0.2)
Four new twists join Any Way, Off the Glass and Swish Only. They appear in H-O-R-S-E (picker has 7 twist buttons with a one-line tip), in some court challenges and in the Daily.

| Twist | How it works | Notes |
|---|---|---|
| **Bounce Shot** | The ball must bounce once on the floor and then go in. | The solver finds a sky-high "moon ball" with topspin that lands in front of the hoop and kicks up and in. The camera tilts up to follow it and "BOING!" pops on the bounce. Only on spots with room in front of the hoop, and never with wind. |
| **Eyes Closed** | The hoop (and its glass, pole and net) fades out a moment after the ball is in your hands and comes back as the ball drops. | Pure memory. |
| **No-Look** | The perfect-release glow on the power bar is hidden, and the "entered the glow" tick is muted. | The shooter does a flashy behind-the-head flick. |
| **On the Move** | You slide side to side while aiming. A non-perfect release keeps a third of your sideways speed. | Release at the end of the slide (when you stop) for a clean shot. Rivals wait for the stop too. |

### 3.3 Trick Shot Hall (0.3)
The goal is something a 10-year-old brags about: "I found the Ring of Fire!" Trick shots are named, collected and shown off.

**Signature tricks (Trick Shot mode).** Each court has one prop, placed only in Trick Shot mode, so challenges, H-O-R-S-E and the core flick never see it. A trick spot is set up for it.

| Court | Trick | Prop | How it works |
|---|---|---|---|
| Park | Bench Bounce | Park bench in the key | A moon ball lands on the bench and kicks up and in (from the top). |
| Gym | Trampoline Launch | The Dunk Fest trampoline (bouncy, e 0.92) | Springs off the trampoline into the hoop (from deep). |
| Rooftop | AC Pop | A rooftop air-conditioner with a spinning fan | Pops off its top (from the right elbow). |
| Beach | Lifeguard Lob | Red lifeguard tower beside the hoop | A side bank off the cabin wall (from the right wing). |
| Subway | Pillar Bank | Tiled station pillar with a "BANK ME" tag | A side bank off the pillar (from the left wing). |
| Snow | Snowman Hoop | A big snowman holding a hoop out on a branch | Fly through the ring, then in (from the right elbow). |
| Arena | Ring of Fire | A flaming ring hanging from the rafters | A rainbow arc through the ring from deep. This is the hardest one. |

- Physics: props are static boxes (bank or bounce off a face) or "gates" (a solid torus you can fly through or clip). A touch only counts before the ball scores. The prop collision uses the same contact model as the rim and glass.
- Solver: `Phys.solveTrick` searches aim points on the prop's face, launch angles and spin. For gates it uses the one parabola through the shooter, the ring and the rim. It prefers a swish whose neighbours (power ±1%, aim ±0.5°) also land, so a perfect release always lands the trick. Results are cached per spot.
- Measured: all 7 land on a perfect straight release. With human-like error (power noise 0.07, aim 4°) the Pillar Bank lands 6 of 7 times and the Ring of Fire 2 of 7, so the final court is the hardest.
- Coaching: a dotted chalk line shows the ideal path until you land the trick (toggle on screen; it comes back after 3 misses). "Try other spots" lets you experiment from other spots on the same court.
- Landing a signature trick plays a TRICK CAM slow-mo replay, then takes a Swish Cam photo automatically.

**Second signature tricks (0.4).** Each court has a second prop. It unlocks in the Hall once you land that court's first signature trick, so there is always a next goal.

| Court | Trick | Prop | How it works |
|---|---|---|---|
| Park | Tire Swing | A tire on a rope, hanging from a branch | It **sways side to side** across your shot (period 3.2 s). Thread the ball through the middle (from the left wing). |
| Gym | Vault Hop | A gymnastics vault box with a springy top (e 0.85) | Hop it off the top and in (from the right wing). |
| Rooftop | Water Tower Bank | A wooden water tower with a "BANK IT" sign | A side bank off the tank (from the left wing). |
| Beach | Surfboard Skip | A surfboard on two sawhorses | Skip a moon ball off the board (from the top). |
| Subway | Train Roof Hop | The Plaza Express, a little shuttle train on rails across the court | It **rolls in, stops at the station** for 2.4 s, then rolls out and comes back from the other side. Bounce off its roof (from way downtown). |
| Snow | Sled Jump | A wooden sled on a snow mound | Hop it off the sled (from way downtown). |
| Arena | Big Drum Boom | The band's bass drum (e 0.9) | Boom it off the drumhead (from the left deep spot). |

- **Moving props.** The solver always works on the prop at rest, so the ideal shot never jumps around. Each frame the game moves the live prop; a moving box bounces the ball in its own frame of reference (relative velocity), so a slow train barely nudges it. Static props are unchanged.
- **GO light.** For the two moving props a traffic light under the LANDED chip shows **GO!** when a perfect, straight release right now would land the trick. It comes from a timing table: the game simulates the ideal shot with the prop really moving for every moment of the cycle (about 50 ms, once, while the intro card shows). Measured: the tire is GO 28% of the time (two 0.45 s windows per swing), the train 28% (a 2.6 s window every 9.2 s).
- Measured on a perfect straight release: all 7 new tricks land in the real game loop. With human-like error (power noise 0.07, aim 4°, 60 shots each, static props) they land 33 to 49 times out of 60, the same band as the first seven (37 to 50). The Big Drum Boom is the hardest new one.
- Low props sit far enough out that your baller does not hide them, and the camera rises a little at those spots.

**Skill tricks (any mode, player shots only, not the tutorial).** Moon Ball (peak above 7.5 m), Rim Dancer (4+ rim touches), Kiss and Roll (bank + rattle), Downtown Splash (deep swish), Half-Court Hero, Blindside Swish (No-Look swish), Memory Bank (Eyes Closed bank), Boing Swish (bounce shot swish), Train Rider (score while a train passes), Gull Dodger (score while the gull patrols), Ice Cold (swish in the last seconds), Friendly Roll (score after a rim nudge), Wind Rider (wind 1.3+), Drive-By (On the Move swish).

**Rewards.** A first discovery gives +25 coins (+50 for signature tricks) and a "NEW TRICK SHOT!" card. Finding 1/3/6/9/13/17/21 tricks unlocks ball trails: Sparkle, Comet, Bubbles, Rainbow, Star Dust, Galaxy and Legend Flame. Finding all 28 (0.4) unlocks the **Aurora** trail. The Hall (Title > TRICK SHOTS) has Signature (two tricks per court, side by side), Skill (mystery cards with hints) and Photos tabs.

**Arena framing fix (0.4).** The Ring of Fire hangs at 5.7 m, so at its trick spot it used to sit on top of the TRIES chip and the "Try other spots" button. That spot now looks up further with a slightly wider lens (a new `zoom` field on the camera goal, eased like the rest of the camera): the ring sits below the chips on phones and on iPad in both orientations, and your baller is still in view. A rotation re-frames the spot.

### 3.4 Swish Cam (0.3)
- After a swish, bank, bounce or trick make, a pink SWISH CAM button wobbles for 5 seconds. Tap it to get a polaroid.
- The shot is re-rendered from the recording at the moment the ball is in the net, from a low side camera. The shooter is parked out of shot. It is framed with a date stamp, the shot name, your nickname and the court.
- Photos are saved locally in an in-game album (`swishstreet.album`, 12 newest, JPEG, about 25 KB each), viewable in the Hall. In a web browser there is also a Save (download) button. The iOS app does not offer it yet, because saving to Photos would need a native plugin and a parental gate.
- **Photo studio (0.5).** The shot is rendered once and cropped round the ball; the studio (`src/photo.js`) frames it at 300 x 380. Under the photo a row of frame buttons and a Sticker button re-frame it instantly, and the newest album entry is swapped for the new version (only if it is still the photo you just took).

  | Frame | Look |
  |---|---|
  | Polaroid | the classic white polaroid with a date stamp |
  | Comic | a yellow halftone page, a tilted panel, a "SWISH!" burst and a caption box |
  | Neon | a night frame with glowing cyan and pink tubes |
  | Trading Card | a gold card with your name, jersey number, the shot name on a ribbon, and your career rank, makes, swishes and tricks. Player 2's card says "Guest star" instead, so their shots never show your numbers. |

  - Stickers: none, Star, Crown, Flame, Heart or a "SPLASH!" speech bubble, drawn as round white stickers in the photo's corner.
  - The chosen frame and sticker are remembered in the save (`photo`). Every photo taken counts towards the Photographer trophy.

## 4. Modes

### 4.1 Tutorial (built, under 30 seconds)
A coach card and a ghost finger show the swipe. There are three beats: make one from close range (with heavy assist), release in the glow, then aim from the wing. It can be skipped, gives +50 coins the first time and can be replayed from **Practice**.

### 4.2 Street Tour (career, all 7 courts built)
A stylised city map with a path between courts. Each court has **3 star challenges** (21 stars in total). Earning **2 stars** unlocks the court's **rival**, and beating the rival at H-O-R-S-E unlocks the next court. The title screen shows the furthest court you have reached.

| # | Court | Look | Challenges | Rival |
|---|---|---|---|---|
| 1 | **Neighborhood Park** (built) | Sunny morning, chain-link fence, trees | Warm-Up (5 makes from 8 balls), Around the Arc (5 spots from 12 balls), Minute Rush (14 points in 60 s) | **Leo "Hops" Rivera**: bouncy, loud, always smiling |
| 2 | **School Gym** (built) | Wood floor, bleachers, banners | Glass Class (4 bank shots from 10), Moving Target (sliding hoop, 5 makes in 60 s), Trick Shots (hit 3 backboard targets from 12 balls) | **Priya "Professor" Patel**: calm, clever, loves the bank shot |
| 3 | **Rooftop Sunset** (built) | Sunset skyline, string lights, wind flag | Feel the Breeze (5 makes in wind), Silk (3 swishes), Gusty Arc (5 spots in changing wind) | **Kofi "Breeze" Mensah**: super chill, reads the wind |
| 4 | **Beach Boardwalk** (built) | Wooden boardwalk court, sea with rolling waves, palms, lifeguard tower with a breeze flag, umbrellas, sandcastle, circling gulls | Sea Breeze (5 makes in gusts that change while you aim), Gull Patrol (a seagull patrols across your shot path and blocks the ball: "SQUAWK!"; 5 makes from 12), Tide Rush (18 points in 60 s; the tide pushes you to deeper spots every 9 s) | **Marina "Wave" Costa**: surfer, loves the Bounce Shot |
| 5 | **Subway Plaza** (built) | Dusk plaza, elevated track with trains every ~20 s, graffiti wall, station globe light, street lamps | Rush Hour (20 points in 60 s; each train blows a gust), Tile Bounce (4 bounce shots from 10), Echo Streak (4 in a row from 16) | **DJ "Echo" Nakamura**: plays to the beat, loves the No-Look |
| 6 | **Snowy Court** (built) | Mountains, pines, snowfall, snowman, cabin, snow on the backboard | Frosty Rim (the whole court has a bouncier, slippery rim; 5 from 10), Snowflake Smash (3 glass targets from 12), Whiteout (3 Eyes Closed makes from 10) | **Anya "Frost" Ivanova**: ice cold, loves Eyes Closed |
| 7 | **The Arena Final** (built) | Packed tiered stands, jumbotron, scrolling LED board, banners, sweeping spotlights, camera flashes | Spotlight Seven (score from all 7 spots), Showtime (24 points in 60 s with ON FIRE), No-Look Legend (3 No-Look makes from 10) | **The Champion**: uses every twist. Beating the Champion the first time plays the **finale**: the trophy rises, confetti rains, all six rivals clap and you are crowned Champion of Swish Street (a crown shows on the title screen). |

**H-O-R-S-E (built).** The game is turn-based, so there is no twitchy AI.
- The rival intro card shows the rival's look, name and a friendly line.
- The setter calls a spot and a twist: **Any way**, **Off the glass** (bank only, offered only on angled spots) or **Swish only**.
- If the setter makes it, the other player must match it or take a letter. If the setter misses, nobody gets a letter.
- **Setters alternate every round.** This is a kid-friendly house rule so nobody gets stuck watching.
- Rivals shoot with the same physics and gauge as you, with a skill spread. Each rival is better at their favourite twist and reads the wind.
- Rivals speak in a speech bubble: encouraging when you make a shot, kind when you miss.
- The first win gives +100 coins and unlocks the next court. A loss still gives +10 coins and offers an instant rematch.
- **Respect ladder (0.2).** Each rival can be beaten three times; every rematch is a tougher tier.
  - Tiers: **Street** (their normal game), **Pro** (skill spread x0.8, adds Bounce and No-Look calls), **Legend** (x0.62, adds Eyes Closed and On the Move).
  - The **respect meter** (New face, Rival, Respect, Legend) shows as purple stars on the map and the court card. Rewards: Pro win +60 coins, Legend win +120 coins plus the rival's **signature gear** (Hops Headband, Professor Specs, Breeze Shades, Wave Visor, Echo Phones, Frost Beanie, Champion Crown). After Legend, friendly games give +20.
- **Game shot replay (0.2).** When you win, your last made shot replays in slow motion before the result card.

### 4.3 Quick Play (built)
A 60-second arcade round at the neon **Midnight Court**, with a 3-2-1-GO countdown.
- **Scoring:** a make is worth 2, a swish or bank is worth 3, and every make from the third in a row (combo) adds +1.
- **ON FIRE:** 3 swishes in a row doubles your points until you miss, with a flame trail on the ball.
- The spot moves after every make, and deep spots unlock above 20 points.
- The last 6 seconds are clutch, with slow-mo near the rim.
- Your best score is saved. Coins earned are 5 plus your score divided by 3.

### 4.4 Daily Challenge (built)
- A 10-shot list seeded by the date, so everyone gets the same day: spots, twists, wind and the court.
- **Scoring:** a make is worth 100, a swish adds +50, a satisfied twist is worth 150 (a make that ignores the twist is worth 50), and a perfect release adds +25.
- Today's best and your all-time best are saved. The first run of the day gives bonus coins.
- Since 0.2 the Daily can be set on any of the first six courts and can call Eyes Closed, No-Look and Bounce shots.

### 4.5 Buzzer Beater (built, 0.2)
- Five heaves from half court (centre, left, right) in the Midnight Court with a slightly zoomed, higher camera.
- A **3-second shot clock** runs while you aim and keeps running while the ball flies, so the buzzer can sound with the ball in the air. Let go too late and it's "Too late!".
- A tighter perfect window (0.024). Every make gets "AT THE BUZZER!", a roar, a celebration and a slow-motion replay.
- Coins: 5 + 15 per make. Best saved (`buzzerBest`).

### 4.6 Dunk Fest (built, 0.2)
A timing-based dunk contest in the School Gym. It is a separate mode and never touches the core flick.
1. **Pick a dunk:** Tomahawk (1 star, 1 trick tap), Windmill (2 stars, 2 taps), 360 Spin (2 stars, 2 taps), Between the Legs (3 stars, 3 taps).
2. **Run-up:** you dribble toward a mini trampoline. Tap when your feet hit it (an approach meter shows the sweet spot). Perfect, good or weak jump sets your height.
3. **In the air (bullet time):** a ring shrinks onto the ball; tap when the rings meet for each trick move (Perfect / Nice / Missed).
4. **Slam:** a good jump with at most one missed move slams it through: rim bend, net whip, shake, confetti, crowd roar, then a slow-motion **slam replay**. Otherwise the ball clanks off the front rim ("Need more bounce!").
5. **Judges:** Leo, Priya and Kofi hold up cards (4 to 10) based on difficulty, jump, perfect taps and misses. Three dunks, best total out of 90 is saved (`dunkBest`).

### 4.7 Story comics (0.3)
Short comic pages drawn in code: halftone dots, tilted panels with thick borders, yellow caption boxes, speech bubbles, "SFX" bursts, and characters drawn with the avatar renderer.
- Panels pop in one at a time. Tap or press Next for the next panel. Skip is always available.
- **Intro** ("A Ball and a Dream") plays on the first visit to the Street Tour map.
- **Rival chapters**: after the first win against each rival, the results button becomes "Continue the story". Three panels show the rival's respect, the rival becoming a friend (the crew grows each chapter), and a teaser of the next rival.
- **Finale** ("Team Up"): after the Champion's crown ceremony, everyone you beat cheers. It leads to the Team Up screen.
- Every chapter you have seen can be re-read from the book button on the map.

### 4.8 Team Up (0.3)
Unlocked by beating the Champion; the title button shows a lock until then. In Crew HQ you pick 2 of the 6 rivals you have beaten. Each crewmate stands on the court and passes you the ball, and the passer's perk applies to that shot:

| Crewmate | Perk | Effect |
|---|---|---|
| Leo | Big Glow | Perfect window 0.04 → 0.058 |
| Priya | Angle Ace | Aim wobble halved |
| Kofi | Calm Air | Wind ×0.25 |
| Marina | Rebound Queen | A miss gives one free re-shot |
| DJ | On the Beat | Perfect releases score +1 |
| Anya | Ice Veins | Power bar 15% steadier (longer drag) and slow-mo near the rim |

Relays (stars are saved per relay):
- **Relay Rush** (Midnight Court): 60 seconds of passes, with combos and ON FIRE. Stars at 20, 30 and 40 points.
- **Twist Relay** (Gym): 9 passes. Each passer calls their signature twist (Leo any way, Priya glass, Kofi swish, Marina bounce, DJ no-look, Anya eyes closed). Stars at 4, 6 and 8 makes.
- **All-Star Game** (Arena): your crew against the All-Stars (the Champion plus the two rivals not in your crew). Possessions alternate and the first to 15 wins (2 points, 3 for a swish or a deep shot). The All-Stars shoot with rival physics. Win = 1 star, holding them under 10 = 2 stars, under 6 = 3 stars.

### 4.9 Court moods (0.3)
Once a court's rival is beaten, challenges and rematches there sometimes come in another mood, picked from the date: Golden Hour (park, beach, snow), Night Lights (warm lamp glows and fireflies), Rainy Day (rain streaks and splash ripples). The challenge card says "Today: Night Lights". Only the look changes, never the physics.

### 4.10 2 Players: pass and play (0.4)
Title > **2 PLAYERS** (a badge to the right of your baller). One device, two kids, no accounts and no network.
- **Setup screen.** Player 1 is your own baller. Player 2 picks a look from 8 friend presets and can change skin tone and hair; their name comes from the same word-list randomizer as yours (no typing, nothing personal). Each player has their own **Aim Assist** button, so a 7-year-old can play on Easy against a 12-year-old on Pro. Pick the game and any court you have unlocked (or the Midnight Court). The setup is remembered.
- **Pass the phone.** Before every turn a card shows whose turn it is, with their baller waving and what to do ("Match it: Left Wing, Off the Glass"). The court is blocked until they tap **I'm ready!**, so nobody shoots by accident.
- **H-O-R-S-E.** The setter picks a spot and one of the 7 twists on the same picker as the rival game, then shoots. A make means the other player must match it (same spot, same twist, same wind) or take a letter. The setter swaps every round (the house rule from the rival game). First to spell H-O-R-S-E loses.
- **Shootout.** Three racks (left wing, top, right wing) of 5 balls each. The 5th ball of every rack is a **golden money ball** worth 2. Players take turns rack by rack, the HUD shows the rack with the money ball. A tie goes to sudden death from the top of the key, round by round. On windy courts each rack has its own wind, the same for both players.
- **Around the World (0.5).** Seven spots from the Left Block round to the Right Block (`D.WORLD_SPOTS`). On your turn you shoot from your current spot; a make moves you to the next spot and you shoot again, a miss passes the phone. Player 1 always starts, so when Player 1 gets all the way round first, Player 2 gets one **last chance** turn to finish too (equal turns). If Player 2 gets round first, they win straight away. If both finish, it goes to sudden death. Each spot has its own wind on windy courts, the same for both players.
  - The HUD shows seven pips per player and a small top-down map with both players' markers on the arc, plus the current spot ("Left Elbow (3/7)").
  - Going all the way round as Player 1 counts for the World Traveller trophy.
- **Sudden death (0.5).** Shootout and Around the World ties are settled one shot each. Every round that is still tied moves one step further out: Top of the Key, Way Downtown, Left Deep, Right Deep, then Half Court, so a tie-breaker always ends.
- **Results.** The winner's baller celebrates ("Good game, both of you! High five!"), with Rematch, Change setup and Home. A finished game pays the owner +10 coins. Around the World results show how many spots each player cleared and in how many shots.
- **Fair to the save.** Player 2's shots never count in your stats or Trick Shot Hall, and the signature combo is yours only (Player 2 uses their preset move). Swish Cam still works for both, captioned with whoever shot.

### 4.11 Street Events (0.4)
Title > **EVENT** (a badge to the left of your baller, with a red dot until you play this week). A themed remix of one court that changes every Monday by itself (from the device date; no network). Seven events rotate:

| Event | Court | Twist | Gold prize |
|---|---|---|---|
| Moonlight Madness | Park at night | Every 4th ball is a GOLDEN BALL worth triple | Moonlight ball |
| Glass Bonanza | Gym | The hoop slides all round; bank shots score 5 | Glass Cannon jersey |
| Gust Fest | Rooftop | Gusts change while you aim; swishes in the wind +3 | Storm Headband |
| Gull Gala | Beach at golden hour | Gulls patrol; score past a flying gull +2 | Gull Visor |
| Rush Hour Remix | Subway in the rain | Trains every few seconds; score while one passes x2 | Rush Hour jersey |
| Snow Globe | Snowy Court at golden hour | Every 3rd shot is Eyes Closed, +4 if you make it | Snow Globe Beanie |
| Fire Fest | Arena | ON FIRE after only 2 swishes, and fire scores triple | Fireball ball |
| **Boing Bash** (0.5) | Gym | Every 2nd shot is a Bounce Shot; bounce it in for +4 (only from spots with room to bounce) | Boing Ball |
| **Downtown Lights** (0.5) | Rooftop at night | Every shot is from Way Downtown, Left Deep or Right Deep; deep swishes score 5 | Skyline jersey |
| **Hot Streak** (0.5) | Park at golden hour | Each make in a row is worth 1 more than the last (2, 3, 4, ...), +1 for a swish or bank | Hot Streak Band |

- **Rotation (0.5).** Ten events rotate (`D.EVENT_ORDER`). Weeks before Monday 2026-10-19 keep the v0.4 seven-week order, so the event that was running when a player updated (Snow Globe, week 2026-W42) did not change halfway through its week. From 2026-10-19 the order is Boing Bash, Fire Fest, Rush Hour Remix, Downtown Lights, Moonlight Madness, Glass Bonanza, Hot Streak, Gust Fest, Gull Gala, Snow Globe.
- **0.5 medal targets** (auto-player, 60-second rounds): Boing Bash sloppy 47, steady 74, so 40 / 56 / 72. Downtown Lights sloppy 33 to 40, steady 69 to 78, so 34 / 52 / 70. Hot Streak sloppy 30, steady 70 to 82, so 30 / 52 / 74. (As a check, Moonlight Madness steady scored 91 against its 85 gold.)
- Lifetime medals and golds are now kept in the career record (section 4.12), so the Trophy Room can count them.
- Each round is 60 seconds of points (2 for a make, 3 for a swish or bank, +1 from the third make in a row, then the event's twist). A medal bar under the clock shows bronze, silver and gold.
- **Rewards.** Each medal pays coins once per week (bronze 20, silver 30, gold 50, plus 5 for playing). Gold also unlocks the event's exclusive item for good; it shows in the Locker with a lock and "Event gold" until then. There is no timer pressure beyond "5 days left", nothing to buy, and the event comes round again seven weeks later.
- **Medal targets** were set with the auto-player: bronze is about what a sloppy shooter (power noise 0.13, aim 6°) scores, gold about a steady one (0.07, 4°). Easy assist makes all of them friendlier.
- The **Event Board** shows the event, days left, your medals and best this week, the gold prize on your own baller, and next week's event.
- Built on the Court Challenge engine with hooks (`points`, `beforeShot`, `ballSkin`, `onEnd`, `hud`), so gulls, trains, gusts, the sliding hoop and ON FIRE behave exactly as on the Street Tour. 0.5 adds event fields `spots` (a custom spot list), `twistEvery` / `twistId` / `twistBonus`, `deepSwish` and `streakPts`.

### 4.12 Rookie to Legend: career rank and Trophy Room (0.5)
Title > the **trophy button** (top left, next to Settings; your rank is written under it). The goal is a long-term "look how far I've come" for kids who have finished the Street Tour.
- **Career rank.** Career points are worked out from your progress every time (nothing extra to keep in sync, so a v0.4 player gets their rank on the first launch): 1 per make, swish and bank, 3 per dunk, 5 per heave, 20 per Street Tour star, 40 per rival respect level, 25 per trick shot, 15 per relay star, 150 for the crown, 60 per event gold, 15 per event medal, 5 per 2-player game (up to 200 games) and 10 per trophy.

  | Rank | Points |
  |---|---|
  | Rookie | 0 |
  | Starter | 120 |
  | Hooper | 400 |
  | All-Star | 900 |
  | Pro | 1,700 |
  | Superstar | 2,900 |
  | Legend | 4,500 |

  Finishing everything (21 stars, Legend with every rival, 28 tricks, all relays) is about 2,250 points before makes, so Legend needs real play time on top. A rank-up shows a toast.
- **25 trophies**, each a test on the save: First Bucket, Hundred Club, Bucket Machine (1,000 makes), Silk Collector (50 swishes), Nothing but Net (500), Glass Master (50 banks), Heating Up (5 in a row), Unstoppable (10 in a row), Star Chaser (10 stars), All the Stars (21), New Friend (beat a rival), Legend Respect (any rival on Legend), Champion, Trickster (7 tricks), Hall of Fame (28), Quick Hands (40 in Quick Play), Buzzer Beater (3 of 5), Judges Love It (75 in Dunk Fest), Daily Star (1,500 in a Daily), Event Gold, Medal Rack (10 medals), Good Sport (5 games with a friend), World Traveller (all the way round), Crew Captain (6 relay stars), Photographer (5 photos).
  - When a round ends, any trophies earned since last time pay **+20 coins each** once, with a toast and a fanfare ("Trophy: Heating Up! +20", or "3 new trophies! +60"). A v0.4 player gets every trophy they had already earned at the end of their first round.
  - The shelf shows gold cups for earned trophies and grey ones with "???" for the rest. Tap any cup to see how to earn it and your progress ("37 / 50").
- **Career stats** tab: shots, makes, accuracy, swishes, banks, best streak, dunks, heaves, stars, rival wins, tricks, event medals (and golds), games with friends, photos and every best score.
- **Fair to the save.** Player 2's shots never count (the best streak ignores 2-player games and the tutorial).
- **Layout.** Phone: the rank card on top, then the Trophies / Career stats tabs and a 5 x 5 shelf. iPad landscape: the rank card becomes a column with the whole rank ladder, and the stats use two columns.

## 5. Progression and economy

- **Coins** are earned only by playing. There are no purchases, ads or loot boxes, and every price is visible before buying.
- **Locker (built):**
  - 6 skin tones and 6 hair colours, all free,
  - 11 hairstyles, including a sport hijab and a cap,
  - 9 jerseys, 6 shoes, 6 ball skins (Classic, Street, Watermelon, Galaxy, Neon, Golden),
  - jersey number 0 to 99,
  - a nickname from a randomizer. There is no free text, so no personal data is entered.
  - **Gear (0.2):** headbands, gold wristbands, a beach visor, a cozy beanie and headphones for coins, plus seven **reward-only** signature items earned by reaching Legend respect with each rival (shown with a lock and "Beat Leo x3").
- **Celebrations (built):** Fist Pump (free), Spin Move, The Robot, Heart Hands, Double Flex and Big Bow, plus (0.4) Shoulder Shimmy (50), The Dab (70) and Rim Hang (90). They play on a card after big shots: a swish streak, a deep swish, a clutch make, ON FIRE, or winning.
- **Signature combo (0.4):** Locker > Moves > **My Signature Combo**. Chain three moves you own, pick a finale effect (Confetti, Fireworks, Star Shower, Hearts, Lightning, Bubbles) and a shout-out from a fixed friendly list ("Splash!", "Swish City!", "Practice pays!"...). Switch it on and it replaces the single card after big shots: a purple card plays the three moves (0.8 s each, with pips), the effect goes off and a speech bubble pops the shout-out. The editor shows a live preview. Results screens loop the combo too. The effects are drawn from time alone (no particle state), so they cost almost nothing.
- **Earned-only items (0.3):**
  - **Court jerseys** (Park Classic, Varsity Blue, Rooftop Dusk, Tide Pool, Graffiti, Snowflake, Finals Red) unlock with all 3 stars on that court.
  - **Ball trails** (Locker > Trail) unlock as you find trick shots.
  - Neither can be bought. Ownership is worked out from your progress, so it can never go out of sync.
- Everything is cosmetic, so nothing is pay-to-win.
- **Rough pacing:**
  - a Quick Play round earns 15 to 40 coins,
  - a challenge star is worth 30 (5 on replay),
  - a rival win is worth 100,
  - the tutorial is worth 50.
  - Cheap items cost 40 to 60 and the top items cost 250 to 300, so the first purchase comes within about 10 minutes.

## 6. Art direction

- **Bold, colourful and slightly urban**, drawn entirely in code. There are no image files, so it stays crisp at any resolution.
- **2.5D over-the-shoulder camera:** a perspective projection with near-plane clipping. Courts, props, crowd, hoop and net are 3D points, and the sky and skyline are prerendered panoramas that parallax with the camera yaw.
- **Palette per court:**
  - park: sky blue, court blue, orange key,
  - gym: warm wood with blue accents,
  - rooftop: sunset purple and orange,
  - Midnight Court: deep navy with neon pink and cyan,
  - beach: sky blue and sand with a turquoise key on wooden planks,
  - subway: dusk purple and orange with a yellow-lined slate court,
  - snow: ice blue and white with a red key,
  - arena: dark stands, warm hardwood and red.
- New courts live in `src/courts.js` and plug into the renderer through extension tables (`R.PANO`, `R.PROPS`, `R.CROWD`, `R.SURROUND`, `R.WEATHER`, `R.TICK`).
- **App icon and launch screen (0.2):** drawn in code by `tools/art.html` (a ball dropping through a glowing hoop for the icon; the SWISH STREET logo for the splash) and saved as RGB PNGs (no alpha) in `resources/`.
- **Chunky UI:** rounded 3D buttons with a pressed state, thick outlines, an Arial Rounded / Trebuchet type stack (system fonts only), and stars and coins as vector icons. On tablets the UI scales up by as much as 1.6 times.
- **Court life (0.5)** (`src/life.js`). Small touches so every court feels lived in. All of it is drawn, never simulated: it does not touch the ball, the physics or the game's random numbers (it has its own seeded generator).

  | Court | Birds | Passers-by |
  |---|---|---|
  | Park | 4 pigeons behind the hoop | a dog walker, strollers and kids, between the fence and the crowd; autumn leaves drift in the wind |
  | Rooftop | 3 pigeons on the parapet wall | none (it's a roof) |
  | Beach | 2 crabs that scuttle and dig in | surfers with boards on the boardwalk |
  | Subway | 4 pigeons | commuters with briefcases in front of the graffiti wall |
  | Snowy Court | 3 robins | none |
  | Midnight Court | none (asleep) | night owls |
  | Gym, Arena | none (indoors) | none |

  - Birds peck, hop and turn. A ball coming down within about 2 m makes them **flap away** (a soft flutter sound), and a big crowd roar startles some of them; they glide back 5 to 10 seconds later. Crabs dig into the sand instead. Birds are drawn at about 1.6x life size so they read on a phone, and they sleep in the Night Lights mood.
  - At most two passers-by at a time, every 6 to 13 seconds. When you score they stop, jump and wave their arms; after a miss they put their hands on their heads. In the Rainy Day mood they carry umbrellas.
  - Draw order keeps the depth right: walkers are drawn after the back props and before the crowd (on the beach, in front of the railing, after the crowd), birds after the crowd and before the hoop.
  - Reduced effects turns off the leaves. Court life also appears in the menu backgrounds and in Swish Cam photos.
- **Avatar:** a procedural front and back view, with poses for idle, aim, shoot, dribble, clap and wave plus the six celebrations.
  - 0.2 polish: soft outlines and torso shading, legs that swing (running) and tuck (jumping), hands that hold the ball from behind, wristbands and head gear, a turned-away face for No-Look, and dunk poses (run, jump, tomahawk, windmill, 360, between the legs, slam, hang on the rim).

## 7. Audio direction

- Everything is synthesised with Web Audio, so there are no audio files.
- **Sound effects:** a metallic multi-partial rim clank scaled by impact, a glass thud, a filtered-noise swish, ball bounces, an "aww", a crowd cheer with wobbling formants, coin ticks, a perfect chime, a buzzer and countdown beeps.
- **Music:** a generative 92 BPM street groove with swing.
  - Chords Am, F, C, G with an off-beat stab, plus a walking bass, kick, snare and hats.
  - A pentatonic hook is re-generated every 8 bars, so it never repeats exactly.
  - Menus get a lighter arrangement and play gets the full groove.
- **Court-specific grooves (0.2):** each court has its own tempo, chords, drums and lead sound.
  - park: the original groove; gym: brighter with claps; rooftop: slow lo-fi sevenths; Midnight Court: driving four-on-the-floor;
  - beach: calypso kick, shaker and steel-drum lead; subway: boom-bap in C minor with vinyl crackle; snow: slow bells and sleigh shakers; arena: stomp-stomp-clap anthem with power chords (also used by Buzzer Beater and Dunk Fest).
- New sound effects: MC "voice" blips, bounce-shot boing, seagull squawk, train rumble and horn, slam, crowd roar, referee whistle.
- Sound effects and music each have their own toggle. Audio pauses when the app is backgrounded.

## 8. Kid safety and privacy

- Fully offline: no network calls, CDNs, external fonts, analytics or ads.
- No accounts, no chat, no user-generated text (nicknames come from a word list) and no personal data.
- The save is local only (localStorage, mirrored to native Preferences on iOS). It is versioned and every field is validated on load.
- **Parental gate** before "Reset progress": type a number written in words (for example "forty-seven") on a keypad, then confirm.
- Encouraging tone everywhere: misses say "Shake it off!" and losses say "Good game! Rematch whenever you want!".
- Reduced-effects setting for motion-sensitive players.
- **Accessibility (0.2):** a **left-handed layout** (power bar on the left, wind and celebration card on the right) and a **larger text** option (small body text grows by 15 to 25 percent; boxes still clamp it).
- **Accessibility (0.3):**
  - **Screen reader layer.** `src/a11y.js` keeps an invisible layer of real `<button>`s over the canvas buttons. Labels come from the button text or icon names (Back, Pause, Settings, Swish Cam, Story).
    - VoiceOver can swipe through them and double-tap. Keyboard users can Tab and press Enter (with a cyan focus ring).
    - The layer has `pointer-events: none`, so normal touch play is unchanged.
    - A polite live region reads out scene changes, call-outs, toasts, new tricks, comic captions and results.
  - **Colour-blind-safe targets.** Unlit backboard targets are white bullseyes with a dashed outline and a number. Lit targets are solid dark discs with a tick. Dunk tap results show ★ / ✓ / ✗ as well as colour.
  - **No-Look reveal.** After a No-Look release the hidden glow fades in on the power bar with a marker where you let go ("Glow was lower/higher", or "Felt it! Perfect!").
- Photos never leave the device (localStorage only). The Download button exists only in a web browser and saves a local PNG file. There is no sharing, upload or network.
- **0.4 safety notes.** 2 Players is local only: Player 2's look and name come from presets and the word list, nothing is typed and nothing about them is collected. Street Events are picked from the device date, so no server is involved. Shout-outs come from a fixed friendly list. Event prizes are earned only by playing and cannot be bought. Aim Assist is described on the Settings row and shows a badge in play, so it is never a hidden handicap.
- **0.5 safety notes.** The Trophy Room and career rank are local only (no leaderboards). Trophy coins come only from play. Trading-card photos show only the word-list nickname, jersey number and game numbers, never anything personal, and Player 2's card shows no stats at all. Stickers and frames are fixed art; there is no drawing or typing on photos. Court life is purely visual.
- The local art helper used to save the icon PNGs is a developer tool only; the game itself still makes no network calls.

## 9. Technical notes

- Plain classic scripts on a `window.SS` namespace, with no modules, bundler or build step for development.
- The main loop is `SS.frame(dt)`, which can be stepped manually: `SS.debug.step(n)`, `SS.debug.freeze`, `SS.debug.auto()`, `SS.debug.run()` and `SS.debug.sim()` support scripted physics tests and automated playthroughs.
- Rendering:
  - device pixel ratio capped at 2,
  - prerendered panorama and city map, with a memory cap for iPad,
  - no shadowBlur in the frame loop.
- Measured on a desktop at about 2 ms per frame, so there is plenty of headroom for 60 fps on phones. The packed Arena costs roughly 1.5 to 2 times a normal court; far fans are drawn as two-shape figures and every crowd row is drawn in colour batches.
- **Save v2:** `rivals` now stores a respect level (1 to 3) instead of `true`; adds `gear`, `buzzerBest`, `dunkBest`, `champion`, `stats.dunks/heaves` and `settings.lefty/bigText`. A v1 save migrates on load (`true` becomes level 1) and every field is still validated.
- **Save v3 (0.3):**
  - Adds `tricks` (id → times landed), `story` (chapters seen), `crew` (up to 2 beaten rivals), `relay` and `relayStars`, `avatar.trail` and `owned.trail`.
  - A v2 save migrates on load. Every new field is validated: unknown trick ids are dropped, crew members must be beaten rivals, story ids must be short lowercase words, and equipped earned items are reset if they are not earned.
  - The photo album uses its own key, so the main save stays small.
- **Physics additions (0.3):**
  - `world.props` (boxes and ring gates) with `propHits` and `gates` on the tracker, `Phys.solveTrick` and `Phys.path` (the chalk line).
  - With no props, the step is unchanged. A regression fingerprint (14 spots, normal/bank/bounce solves, and a 7×5 grid of power and aim errors on 6 spots) matches v0.2 exactly.
- **Camera (0.3):** in flight, the lift and a new lens pull-back look ahead to the top of the arc. Bounce shots and moon balls now stay on screen in portrait (before, the ball was off screen for about 0.7 s). Normal and deep shots are unchanged (zoom stays 1.0). If the ball still goes above the top edge (landscape), a marker with its height shows where it is.
- **Performance (0.3):** median frame cost at 390×844 @2x in a desktop browser: Quick Play 0.7 ms, Arena challenge 2.4 ms, Trick Shot Arena (fire ring + chalk line) 2.7 ms, All-Star Game 2.9 ms. That is about the same as v0.2 measured side by side, and well under budget. The fire ring uses plain fills, and the rain, fireflies and flames shrink with Reduced effects.
- **Save v4 (0.4):**
  - Adds `settings.assist` (easy / normal / pro), `combo` (on, three moves, effect, shout index), `friend` (preset, skin, hair, word-list name), `vs` (game, court, both assist levels, games played) and `event` (week key like `2026-W42`, best, medal tier, plays). Event prizes live in the normal `owned` lists.
  - A v3 save migrates on load; its equipped celebration seeds the combo. Every new field is validated: combo moves must be owned celebrations, the shout index and friend preset are clamped, names must be letters and spaces, unknown courts and assist levels fall back to defaults, and event items cannot be bought.
- **Physics additions (0.4):** a box prop may carry `vx` (the moving train): contact is solved in the prop's frame. Props without `vx`, and every shot without props, step exactly as before. `S.window(who)` and `S.windFactor()` apply Aim Assist to your shots only.
- **Regression test (0.4):** `SS.debug.fingerprint(assist)` hashes 42 solver runs, a 7x5 grid of launch errors on 6 spots and 1,134 full gesture-to-launch shots (`S.shoot`) in Quick Play, a windy Rooftop challenge and H-O-R-S-E. Normal: **-745396852** in both v0.3 and v0.4 (660 of 1,386 lines score). Easy scores 752, Pro 589.
- **Performance (0.4):** median frame cost at 390x844 @2x in a desktop browser: Quick Play 0.7 ms, Arena challenge 2.5 ms, Trick Shot Arena ring 3.4 ms (a little higher than v0.3 because the wider lens shows more crowd), Train Roof Hop 2.4 ms, Big Drum Boom 2.3 ms, Tire Swing 1.1 ms, 2-player H-O-R-S-E 1.6 ms, Gull Gala event 1.4 ms. The GO-light timing table costs about 50 ms once, during the trick's intro card.
- **Save v5 (0.5):**
  - Adds `career` (`seen`: trophies already paid; `golds`, `medals`: lifetime Street Event medals; `bestStreak`; `world`: Around the World trips; `photos`) and `photo` (`frame`, `sticker`). `vs.game` may now be `world`.
  - A v4 save migrates on load: every event prize you own counts as a gold (and three medals), and this week's medal tier counts too. Every new field is validated: trophy ids must be short lowercase words, numbers are clamped, and unknown frames or stickers fall back to Polaroid / none.
- **Regression test (0.5):** `SS.debug.fingerprint()` still returns **-745396852** with Aim Assist on Normal. Nothing in 0.5 touches `S.shoot`, the solver or the physics step.
- **Performance (0.5):** median frame cost at 390x844 @2x in a desktop browser: park challenge 1.5 ms with court life (1.3 ms without), Subway 1.5 ms, Beach 1.7 ms, Arena Showtime 1.4 ms, Quick Play 0.9 ms. Court life costs about 0.2 ms; the Trophy Room and photo studio are menus.
- **Physics additions (0.2):** per-world rim restitution and friction (icy rim), an `allowBounce` flag for one floor bounce before scoring, and moving sphere obstacles (the gull). The bounce solver searches launch angle, landing point and spin, preferring a swish whose neighbours also score. The core flick, the normal/bank solver and the default physics constants are unchanged.
- Any aspect ratio works:
  - portrait is the primary layout,
  - landscape and iPad are supported,
  - safe-area insets are read from CSS `env()`.

## 10. Roadmap

### Done (v0.1 vertical slice)
- [x] Shot gesture, perfect-release window, aim tilt, mild assist
- [x] Ball physics: spin, rim torus, glass, bracket, floor, wind, swish/bank/rattle detection, stuck-ball rescue
- [x] Ideal-shot solver (swish and bank), moving-hoop lead on perfect release
- [x] Verlet net with ball interaction
- [x] Juice: sounds, shake, punch zoom, slow-mo, confetti, call-outs, crowd, celebration cards, ON FIRE
- [x] Tutorial (3 beats, under 30 seconds)
- [x] Street Tour map with 7 courts (3 built), 9 challenges, 3 rivals with H-O-R-S-E
- [x] Quick Play, Daily Challenge
- [x] Locker: skins, hair, colours, jerseys, numbers, shoes, balls, celebrations, coins
- [x] Settings (sound, music, reduced effects), parental gate, versioned save
- [x] Generative music, synth sound effects
- [x] Capacitor and Codemagic config (portrait iPhone, any-orientation iPad)

### Done (v0.2 full tour)
- [x] App icon and launch screen in `resources/` (`icon-only.png` 1024, `splash.png` and `splash-dark.png` 2732), drawn by `tools/art.html`
- [x] Court 4 Beach Boardwalk (sea breeze gusts, Gull Patrol obstacle, Tide Rush) with rival Marina
- [x] Courts 5 to 7: Subway Plaza (trains and gusts, Tile Bounce, Echo Streak), Snowy Court (icy rim, snowfall, Whiteout), The Arena Final (Spotlight Seven, Showtime, No-Look Legend) with DJ, Anya and the Champion, plus the Champion finale
- [x] H-O-R-S-E trick twists: Bounce Shot, Eyes Closed, No-Look, On the Move (also in challenges and the Daily)
- [x] Rival respect meter and rematch ladder (Street, Pro, Legend) with signature gear rewards
- [x] Wow moments: Buzzer Beater mode, Dunk Fest mode with judges, instant slow-motion replays
- [x] Juice: MC Mic commentator, crowd cheer/"ohhh" reactions and signs, court-specific music, new sound effects
- [x] Avatar polish: outlines, shading, running/jumping legs, ball held in the hands, gear, dunk poses
- [x] Gear locker tab (7 buyable, 7 earned)
- [x] Accessibility: left-handed layout and larger text option
- [x] Save v2 with migration from v1

### Done (v0.3 "extraordinary" round)
- [x] Trick Shot Hall: 21 tricks (7 signature props with Trick Shot mode, 14 skill tricks), chalk line, TRICK CAM replay, discovery cards
- [x] Story comics: intro, 6 rival chapters, finale; re-readable from the map
- [x] Team Up: crew of 2 with pass perks; Relay Rush, Twist Relay, All-Star Game
- [x] Swish Cam photos and Photo Album
- [x] Ball trails (7), court jerseys (7), court moods (golden hour, night, rain)
- [x] No-Look glow reveal, colour-blind-safe targets and dunk taps, screen reader/keyboard layer, small-phone map layout, bounce-shot camera
- [x] Save v3 with migration from v2

### Done (v0.4 "much cooler" round)
- [x] 2 Players pass and play: H-O-R-S-E and Shootout, friend presets, per-player Aim Assist, pass-the-phone cards
- [x] Aim Assist (Easy / Normal / Pro), Normal verified identical with the regression fingerprint
- [x] Second signature prop on all 7 courts (28 tricks), two moving props with a GO light, Aurora trail
- [x] Weekly Street Events (7 rotating remixes, medals, exclusive prizes, Event Board)
- [x] Signature celebration combos with effects and shout-outs; Shoulder Shimmy, The Dab, Rim Hang
- [x] Fix: Arena Ring of Fire no longer overlaps the score chips (phone and iPad, both orientations)
- [x] Save v4 with migration from v3; `SS.debug.fingerprint()` regression hook

### Done (v0.5 "even cooler" round)
- [x] Around the World (third 2-player game) with a last-chance turn and a mini map HUD
- [x] Sudden death that moves further out each tied round (Shootout and Around the World)
- [x] Three new Street Events (Boing Bash, Downtown Lights, Hot Streak) and prizes; ten-week rotation that kept the running week unchanged
- [x] Rookie to Legend career rank, Trophy Room with 25 trophies, Career stats
- [x] Swish Cam photo studio: Polaroid, Comic, Neon and Trading Card frames, six stickers
- [x] Court life: birds, crabs, passers-by who react, autumn leaves
- [x] Save v5 with migration from v4; fingerprint unchanged; git-ready `.gitignore` and README

### Next
1. **Playtest the new content with kids.** Do siblings actually pick Easy/Pro in 2 Players? Is Around the World too long with two beginners? Is the train GO window long enough? Are the event medal targets right with real fingers (they were set with the auto-player)? Is the Ring of Fire still the hardest trick? Do kids notice the passers-by?
2. **Native photo saving** (Capacitor Filesystem/Photos plugin) behind the parental gate, so Swish Cam photos (especially trading cards) can go to the iPad camera roll.
3. **First TestFlight build** (resources are ready): set `APP_STORE_APPLE_ID` in `codemagic.yaml`, push tag `v0.5.0`. Check frame time in the Arena, Trick Shot Arena, the All-Star Game and Dunk Fest on an older iPhone. Test the screen reader layer with real VoiceOver.
4. 2 Players extras: a "best of 3" series and letting Player 2 keep a second preset slot.
5. Street Events built on Dunk Fest and Buzzer Beater (they need their own round engine).
6. Translations through `SS.lang` (Finnish and Vietnamese first?). Story text is already in `SS.t()`.
7. App Store listing, privacy page ("Data Not Collected"), Kids Category review checklist, and real screenshots in `docs/screenshots/`.
