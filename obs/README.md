# OBS package

Ready-made OBS scene collections for the Gametimewes overlays, plus the stinger transition and Stream Deck layout.
Built for **OBS 32+ on macOS** with the **Aitum Vertical** plugin (horizontal + vertical canvases).

```
obs/
  templates/   3 scene collections (Flight Sim, Pro Clubs, Watchalong) — no secrets, no device IDs
  stingers/    GTW-Stinger-1080p.webm + GTW-Stinger-Vertical.webm (VP9 with alpha, 1.2 s)
  stingers/src stinger.html + render.mjs — the animation source, re-render after design changes
  build.py     fills the templates in for your machine → obs/dist/ (git-ignored)
```

## Install

1. In OBS, export any collection you already use on this machine (**Scene Collection → Export**). It gives
   `build.py` your webcam, capture card, mic and Aitum Vertical canvas.
2. Build:
   ```
   python3 obs/build.py --from ~/Desktop/my-export.json
   ```
   Add `--alerts-url-file ~/gtw-alerts-url.txt` to bake in your alerts link from `/auth/`
   (a text file with the full URL incl. `#token=`). The token only lands in `obs/dist/`.
3. **Scene Collection → Import**, paste the three paths `build.py` prints.
4. Vertical stinger (Aitum keeps this outside the collection): **Docks → Vertical Scene Transitions → + → Stinger**,
   file `obs/stingers/GTW-Stinger-Vertical.webm`, transition point **600 ms**.

## What's inside each collection

| Layer (bottom → top) | Notes |
| --- | --- |
| `[Layer] Audio` | Discord (voice), Apple Music (window capture, **track 1 only** → live stream but not the Twitch VOD on track 2), Stream Deck soundboard |
| Gameplay capture | Elgato, full frame (gameplay scenes only) |
| Overlay | `scenes.html?scene=…`, locked, *Shutdown when not visible* so it loads fresh on show |
| Webcam | cover-fit into the overlay's webcam box |
| `[Layer] Alerts` | `alerts.html`, own mixer fader |

- Every main scene is **linked** to its `V · …` twin (Aitum Linked Scenes), so the vertical canvas follows.
- Default transition **GTW Stinger** (cut at 600 ms).
- Scene hotkeys are the same in every collection — one Stream Deck page drives whichever is loaded:

| Ctrl+Opt+Shift | Flight Sim | Pro Clubs | Watchalong |
| --- | --- | --- | --- |
| 1 | Starting Soon | Starting Soon | Starting Soon |
| 2 | Gameplay | Gameplay | Live |
| 3 | Cockpit | — | Lineups |
| 4 | Just Chatting | Half Time | Half Time |
| 5 | BRB | BRB | BRB |
| 6 | Ending | Ending | Full Time |
| 7 | — | — | GOAL |
| 8 | — | — | Poll |

Stream Deck: add a page of **System → Hotkey** keys sending those combos (STARTING, LIVE, ALT VIEW, CHAT / HT, BRB, ENDING, GOAL, POLL).
OBS needs **Input Monitoring** permission for hotkeys to work in the background.

## Gotchas (learned the hard way)

- Items on the vertical canvas need `pos_rel` / `scale_rel` / `bounds_rel` computed for 1080×1920, or OBS 32 places them using the
  1920×1080 main canvas and they end up off-screen (black vertical preview). The templates already carry them.
- Apple Music is silent through *Application Audio Capture* — use a window capture of the Music window.
- macOS only lists apps for capture while they have a visible window; open Music/Discord before loading the collection.

## Never commit

`obs/dist/`, OBS exports from your machine, or anything containing `#token=` / `#key=` — those are live Twitch/API credentials.
