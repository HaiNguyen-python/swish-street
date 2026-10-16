# Swish Street

A street-basketball journey for kids aged 9 to 12. Build your own baller, flick perfect shots, travel the city court by court and turn friendly rivals into your crew.

- **One gesture:** swipe up and let go. Release in the glow for a perfect shot, and tilt the swipe to aim.
- **Real ball physics:** the ball spins, rattles, banks off the glass and swishes through a moving net.
- **Safe for kids:** fully offline, with no ads, no purchases, no chat, no accounts and no data collection. Coins come only from playing and buy only cosmetics.
- **No build step:** plain HTML5 Canvas and JavaScript, with every picture and sound made in code.

Version 0.5. The full game design is in [docs/DESIGN.md](docs/DESIGN.md).

## What's in the game

| | |
|---|---|
| **Street Tour** | 7 courts (park, school gym, rooftop, beach, subway, snowy court, the Arena) with 21 star challenges, 7 H-O-R-S-E rivals on a Street / Pro / Legend ladder, and a Champion finale |
| **Story** | Comic chapters as rivals become friends, then **Team Up** with a crew of two for three crew relays |
| **Trick Shot Hall** | 28 named trick shots: 14 signature props (two of them move) and 14 skill tricks, which unlock ball trails |
| **Arcade** | Quick Play, the Daily Challenge, Buzzer Beater (half-court heaves) and Dunk Fest (timing dunks with judges) |
| **2 Players** | Pass-and-play on one phone or iPad: H-O-R-S-E, Shootout and **Around the World** (new in 0.5) |
| **Street Events** | A themed court remix every week, with bronze, silver and gold medals and a prize for gold. **Ten events rotate** (three new in 0.5) |
| **Trophy Room** | Your **career rank** from Rookie to Legend, 25 trophies and your career stats (new in 0.5) |
| **Swish Cam** | Slow-motion photos of your best shots in **four frames** (Polaroid, Comic, Neon, Trading Card), plus stickers (new in 0.5) |
| **Locker** | Skin tones, hair, jerseys, shoes, balls, gear, ball trails, celebrations and a signature celebration combo |
| **Court life** | Pigeons, robins and crabs that scatter from bouncing balls, passers-by who cheer your shots, and autumn leaves (new in 0.5) |
| **Settings** | Aim Assist (Easy / Normal / Pro), left-handed layout, larger text, reduced effects, sound and music, and a screen-reader and keyboard layer |

### How to play
- **Shoot:** press anywhere on the court, drag **up**, and let go.
- **Perfect release:** let go while the power bar is inside the glowing band.
- **Aim:** tilt your swipe left or right. In wind, tilt **into** the wind.
- **Street Tour:** earn stars on each court's challenges. Two stars unlock the rival, and beating the rival unlocks the next court.
- **2 Players:** tap the 2 PLAYERS badge next to your baller. A "Pass the phone!" card appears before every turn, so nobody shoots by accident.
- **Around the World:** seven spots from the left block round to the right block. Make it and you move on and shoot again; miss and you pass the phone. If Player 1 gets round first, Player 2 gets one last turn to tie it up.
- **Trophy Room:** tap the trophy button at the top of the title screen. Each trophy pays 20 coins once.
- **Swish Cam:** after a great make, tap the pink camera button. Pick a frame and a sticker, and the photo goes into the album in the Trick Shot Hall.

## Run it

You need any small web server, because browsers block scripts opened straight from a file. With Python installed, from the folder that contains `swish-street`:

```
py -m http.server 8127 --directory swish-street
```

(On macOS or Linux use `python3` instead of `py`.) Then open <http://localhost:8127>.

To play on a phone, connect it to the same Wi-Fi network and open `http://<your-computer's-IP>:8127`.

## Screenshots

There are no screenshots in the repo yet. To make some, open the game in a browser, use the browser's device toolbar for an iPhone size (for example 390 x 844), and take screenshots of the title screen, a court, the Trophy Room and a Swish Cam trading card. A good place for them is `docs/screenshots/`.

## File map

```
index.html            page shell, loads the scripts in order
style.css             full-screen canvas, safe-area probe
src/core.js           SS namespace, SS.t() translation helper, math/RNG/colour utilities
src/data.js           spots, twists, courts, challenges, rivals, events, ranks, cosmetics, call-outs
src/native.js         Capacitor extras (haptics, save backup, splash), no-ops in a browser
src/save.js           versioned localStorage save (v5, migrates v1-v4) with defensive validation
src/audio.js          Web Audio sound effects and generative music with a style per court
src/camera.js         perspective camera, projection, near-plane clipping
src/physics.js        ball physics, rim, glass, wind, obstacles, bounce shots, shot solver, verlet net
src/avatar.js         procedural baller (poses, celebrations, dunk moves, gear), ball skins
src/render.js         environments, court, hoop, net, crowd, extension tables
src/courts.js         Beach Boardwalk, Subway Plaza, Snowy Court and Arena art
src/life.js           court life: birds, crabs, passers-by, autumn leaves (v0.5)
src/ui.js             immediate-mode canvas UI: buttons, panels, text, icons, toasts
src/celebrate.js      signature celebration combos
src/a11y.js           screen-reader layer: invisible DOM buttons over canvas buttons
src/input.js          touch and mouse input
src/session.js        the shooting scene: gesture, perfect window, replays, juice, HUD, Swish Cam
src/modes.js          Tutorial, Quick Play, Daily, Court Challenges, H-O-R-S-E
src/arcade.js         Buzzer Beater and Dunk Fest
src/scenes.js         Title, Street Tour map, Locker, Settings, parental gate
src/tricks.js         Trick Shot Hall, photo album, Trick Shot mode
src/photo.js          Swish Cam photo studio: frames and stickers (v0.5)
src/story.js          comic chapters
src/team.js           Team Up: Crew HQ and the crew relays
src/versus.js         2 Players: setup, H-O-R-S-E, Shootout, Around the World
src/events.js         weekly Street Events and the Event Board
src/career.js         Rookie to Legend career rank and the Trophy Room (v0.5)
src/main.js           boot, resize/UI scale, scene switching, main loop, test hooks
tools/art.html        draws the app icon and launch screen (tools/png.js writes RGB PNGs)
resources/            icon-only.png (1024), splash.png and splash-dark.png (2732)
docs/DESIGN.md        game design document and roadmap
package.json, capacitor.config.json, codemagic.yaml, scripts/   iOS packaging
```

## For developers

### Translation
All player-facing text goes through `SS.t("English text")`. To add a language:
1. Fill `SS.lang.fi = { "Play Again": "Pelaa uudelleen", ... }`.
2. Set `SS.locale = 'fi'`.

### Test hooks (browser console)
- `SS.debug.freeze = true` stops the animation loop, and `SS.debug.step(n)` advances frames by hand.
- **Shot-feel regression test:** `SS.debug.fingerprint()` must return hash `-745396852` (unchanged since v0.3) with Aim Assist on Normal.
- `SS.debug.sim('top', 1.0, 0, 'normal')` runs a headless shot with an exact launch scale, yaw and twist.
- `SS.goNow('play', SS.modes.quick())` jumps into a mode, and `SS.debug.run(frames, powerNoise, aimNoiseDeg)` auto-plays it.
- Other modes: `SS.modes.dunk()`, `SS.modes.buzzer()`, `SS.modes.trick('subway', 1)`, `SS.modes.relay('show')`, `SS.modes.event()`, `SS.modes.versus()` (uses `SS.save.data.vs.game`: `'horse'`, `'shoot'` or `'world'`).
- `SS.goNow('trophies')` opens the Trophy Room. `SS.career.rank()` and `SS.career.check()` show the rank and pay new trophies.
- `SS.events.current(new Date(2026, 10, 9))` shows which Street Event runs in a given week.
- `SS.play.snapPhoto()` takes a Swish Cam photo of the last shot. `SS.photoStudio.compose(crop, meta, frame, sticker)` frames one.
- `SS.life.state()` shows the birds and walkers, `SS.life.scareAll()` makes the birds fly off, and `SS.life.on = false` hides court life.
- The save lives in `localStorage['swishstreet.save']` (v5). Photos live in `localStorage['swishstreet.album']`.

### Remaking the icon and launch screen
Open <http://localhost:8127/tools/art.html> and click each download link, then put the files in `resources/`. Adding `?save=http://127.0.0.1:PORT` posts them to a local helper instead. That is a developer tool only; the game itself makes no network calls.

## iOS path (Capacitor and Codemagic)

You don't need a Mac or Node on Windows, because Codemagic builds on a cloud Mac.

1. **Put the project on GitHub.** `.gitignore` already skips `www/`, `ios/`, `android/` and `node_modules/`.
2. **Create the app in App Store Connect.**
   - The bundle ID is `com.hainguyen.swishstreet`. To use another one, change it in `capacitor.config.json` and `codemagic.yaml`.
   - Set the primary category to Games, with the Kids category for ages 9 to 11 if you want it.
   - Copy the app's **Apple ID** number into `APP_STORE_APPLE_ID` in `codemagic.yaml`.
3. **Set up Codemagic.**
   - Add the GitHub repo.
   - Under Team settings > Integrations, add the App Store Connect API key with the name **Codemagic API Key**. The key stays in Codemagic and never goes in the repo.
   - Enable automatic iOS code signing for the bundle ID.
4. **Icons are ready.** `resources/icon-only.png` (1024x1024, no transparency), `resources/splash.png` and `resources/splash-dark.png` (2732x2732) are in the repo. The build generates all sizes from them.
5. **Build.** Push a git tag (for example `v0.5.0`). Codemagic will:
   - run `npm install` and `npm run build`, which copies `index.html`, `style.css` and `src/` into `www/`,
   - run `npx cap add ios` and `scripts/configure-ios.sh` (portrait on iPhone, any orientation on iPad, no status bar, no-encryption flag),
   - sync, sign and build the `.ipa`, then upload it to **TestFlight**.
6. Test on your device with TestFlight, then submit for review.
   - Privacy answers: **Data Not Collected**.
   - No ads and no third-party SDKs.

Native extras (in `src/native.js`, used automatically in the iOS app):
- haptics on swishes, rim hits and perfect releases,
- a save backup in native Preferences, in case iOS clears web storage,
- the splash screen hides once the game has loaded.

## Version history

- **0.5:** Around the World (a third 2-player game), three new Street Events (Boing Bash, Downtown Lights, Hot Streak) for a ten-week rotation, the Rookie to Legend career rank and Trophy Room with 25 trophies, the Swish Cam photo studio (four frames and stickers), court life (birds, crabs, passers-by, leaves), and a sudden-death tie-breaker that moves further out each round. The save is v5 and migrates v4.
- **0.4:** 2 Players pass and play (H-O-R-S-E and Shootout), Aim Assist, a second signature trick on every court (28 in all), weekly Street Events, signature celebration combos. Save v4.
- **0.3:** Trick Shot Hall, story comics, Team Up, Swish Cam, ball trails, court jerseys, court moods and a screen-reader layer. Save v3.
- **0.2:** the full Street Tour with 7 courts, rivals with a respect ladder, Dunk Fest, Buzzer Beater, replays, the MC Mic commentator and the App Store icon and launch screen.

See the roadmap at the end of [docs/DESIGN.md](docs/DESIGN.md).
