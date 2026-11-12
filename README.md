# Cheese & Onion

A 2D side-scrolling platformer in the spirit of 1985-era console platformers. Every
character, sprite, tune and level is original, and generated in code. There are no
image or audio files.

A wedge of Swiss cheese takes on a ring of reptilian agents in sunglasses, collecting
onions on the way, across four levels and a boss.

Phaser 3.90 + TypeScript + Vite.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + static site in dist/
npm run preview    # serve dist/ locally
npm run typecheck
```

`dist/` is plain static files with relative paths, so it can be served from any folder.

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | Arrow keys / A D | D-pad / left stick |
| Crouch, enter graters | Down / S | D-pad down |
| Jump (hold for higher) | Space / W / Up / Z | A or B |
| Run, throw pickled onions | Shift / X | X or Y (or a shoulder button) |
| Pause | Esc / P | Start |
| Start game | Enter (or Space) | Start / A |
| Choose difficulty (title screen) | Left / Right | D-pad |
| Mute (remembered) | M | |
| Debug: hitboxes + FPS | F1 | |

The browser won't play audio until you've pressed a key or clicked, so the title music
starts on your first keypress.

## Difficulty

Pick Easy, Normal or Hard on the title screen. The game remembers your choice, and each
mode keeps its own high score. Normal is the base game; the others scale it:

| | Easy | Normal | Hard |
|---|---|---|---|
| Lives | 5 | 3 | 3 |
| Each life starts as | Mature Cheddar | Small | Small |
| Time limit | ×1.5 | ×1 | ×0.75 |
| Enemy speed | ×0.75 | ×1 | ×1.25 |
| Flinger / Overlord attack gaps | ×1.6 | ×1 | ×0.7 |
| Fire bar speed | ×0.7 | ×1 | ×1.3 |
| Overlord hits to defeat | 3 | 5 | 8 |
| Flicker time after a hit | 3 s | 2 s | 1.5 s |
| Mid-level checkpoints | yes | yes | no |

All of these are in `src/difficulty.ts` if you want to retune a mode.

## How it plays

- **Small Cheese** dies in one hit. A **Cracker** turns him into **Mature Cheddar**
  (bigger, orange, breaks bricks, survives one hit by shrinking). A **Chilli** while big
  makes him **Fiery Cheese**, who throws bouncing pickled onions (two on screen at once).
- A **Golden Crisp** gives about 10 seconds of invincibility. A golden **Lucky Onion**
  is an extra life.
- **Onions** replace coins: 100 gives an extra life. **Salt Blocks** (white crystal
  blocks) hold onions or power-ups and go dull once emptied. Some blocks are invisible
  until you hit them from below.
- **Enemies**: Grunt (walks, falls off ledges), Shell-back (stomp it into its shell,
  then kick the shell; the shell will hurt you on the rebound), Hopper (jumps towards
  you), Flinger (lobs sunglasses), and the Reptilian Overlord (can't be stomped; five
  pickled onions on Normal, or pull the lever behind him).
- Stomping enemies one after another without landing scores 100, 200, 400 … 8000,
  then an extra life. Kicked shells and the Golden Crisp use the same scale.
- At the end of each normal level, grab the **breadstick** flagpole (the higher you
  grab it, the more points) and walk into the **picnic hamper**. Any time left over is
  added to your score.
- Falling into a pit or lava, or running out of time, costs a life. The high score is
  saved in `localStorage`.

## The levels

| | Name | Theme | Notes |
|---|---|---|---|
| 1-1 | Gower Greens | overworld | Introduces the enemies; a grater leads to a bonus room |
| 1-2 | Mumbles Mines | underground | Low ceilings, a hidden onion vault, a vertical lift; leaves via a grater |
| 1-3 | Treetop Towers | sky | Treetops, moving platforms, Hoppers and Flingers |
| 1-4 | The Lizard Lair | castle | Lava, fire bars; the Overlord on the bridge |

## Editing and adding levels

Each level is a plain-text file in `src/levels/`. Any `.txt` file there is a level, and
levels are played in filename order (`1-1`, `1-2`, … `1-10` sorts correctly). To add a
level, drop in `1-5.txt` and it's in the game. Vite hot-reloads levels while
`npm run dev` is running.

Each file starts with a full legend in its comment header. The format in brief:

```
; comment lines start with a semicolon
@name Gower Greens            shown on the "WORLD 1-1" card
@theme overworld              overworld | underground | sky | castle
@time 400                     countdown start
@checkpoint 96,12             after passing column 96, respawn at tile (96,12)
@warp main:46 -> bonus:2,1    grater at column 46 of [main] leads to tile (2,1) of [bonus]
@boss true                    last level: ends at the lever, then the victory screen

[main]                        sections are 15 rows; [main] is where you start
....................
...S......?.........
####################
```

| Char | Meaning | Char | Meaning |
|---|---|---|---|
| `.` | empty | `?` | Salt Block: onion |
| `#` | ground | `M` | Salt Block: Cracker (Chilli if already big) |
| `X` | solid block | `*` | Salt Block: Golden Crisp |
| `B` | brick | `U` | Salt Block: Lucky Onion |
| `G` | cheese grater (pipe) | `$` | brick holding 10 onions |
| `E` | enterable grater top | `h` / `u` | hidden block: onion / 1UP |
| `T` | treetop platform | `o` | floating onion |
| `\|` | tree trunk (scenery) | `g` `k` `j` `f` | Grunt, Shell-back, Hopper, Flinger |
| `-` / `^` | moving platform, horizontal / vertical | `W` | Overlord (boss) |
| `L` | lava | `S` | player start |
| `=` | bridge (collapses at the end) | `P` | flagpole base (pole rises to row 2) |
| `F` | fire bar | `H` | picnic hut, bottom-left tile (5×5 tiles) |
| `/` | chain (scenery) | `A` | boss lever |

Some notes:

- Graters are two tiles wide. Draw them with `G`, mark both top tiles `E` if they can
  be entered, and add an `@warp` line. If the warp target sits directly on top of an
  `E` grater, Cheese rises out of that grater. Otherwise he drops in.
- A section can set its own theme: `[bonus underground]`.
- Moving platforms sweep ±3 tiles around where you draw them. A run of `---` is one
  platform.
- Fire bars alternate clockwise and anticlockwise in the order they appear in the file.
- Rows 0 and 1 sit behind the HUD. Ground is normally rows 13 and 14.

Jump limits for level design: a standing jump clears about 4 tiles of height, a full
running jump about 5, and a running jump crosses gaps of 6–8 tiles.

## Tuning

Every gameplay number lives in `src/config.ts`: gravity, the reduced gravity while jump
is held, walk and run speeds, acceleration, skid, coyote time, jump buffer, enemy speeds,
timers, the score chain and how long invincibility lasts. Physics runs at a fixed 60 Hz
step (Arcade Physics, `fixedStep`).

## Project layout

```
src/
  main.ts                 Phaser config, global keys (M, F1), integer-zoom scaling
  config.ts               all tuning constants (Normal difficulty)
  difficulty.ts           Easy / Normal / Hard multipliers
  state.ts                score / lives / onions / difficulty / high scores (shared across scenes)
  input.ts                keyboard + gamepad abstraction (held / pressed)
  scenes/                 Boot, Title, LevelIntro, Game, HUD, GameOver, Victory
  player/Player.ts        movement model, power states, animation, death
  enemies/                Enemy base, Grunt, ShellBack, Hopper, Flinger, Overlord, EnemyShot
  items/                  Onion, PowerUp (Cracker/Chilli/Crisp/Lucky), PickledOnion
  world/                  LevelData (parser), LevelBuilder, tiles, Platform, FireBar
  gfx/                    PixelCanvas, textures (tiles, Cheese, items, props),
                          enemyArt (ASCII pixel art), font + logo
  audio/                  AudioEngine (Web Audio synth + SFX), music (the score)
  fx/effects.ts           popups, sparkles, dust, debris
  levels/*.txt            the levels
```

## Notes

- Graphics come from `src/gfx` at boot. Cheese is drawn by a parameterised wedge
  routine, so every frame and palette (normal, Cheddar, Fiery, four invincibility
  colours) comes from the same code. The enemies are hand-drawn ASCII pixel art in
  `enemyArt.ts`, so you can edit them as text.
- The audio is two pulse-wave voices (12.5/25/50% duty), a triangle bass and an LFSR
  noise channel, scheduled ahead of time with Web Audio. The tunes are in
  `src/audio/music.ts` in a simple `NOTE:sixteenths` notation.
- Dev builds only: `window.__game`, `__G` and `__audio` are exposed for poking at
  things in the console. Adding `?timer` to the URL drives the game loop with
  `setTimeout`, so it keeps running in a background tab, which is useful for automated
  testing. Production builds strip both.
