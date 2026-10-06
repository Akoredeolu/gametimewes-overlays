# Gametimewes Overlays

Rossoneri stream overlay pack for **twitch.tv/gametimewes** — flight sim, EA FC Pro Clubs and football watchalongs — in **horizontal (1920×1080)** and **vertical (1080×1920)**, driven live from a web dashboard and hosted free on GitHub Pages so any OBS on any device can load them by URL.

```
index.html              gallery of every scene (horizontal / vertical)
dashboard/              stream control: flight, match, slips, countdown, poll, test alerts, OBS links
overlays/scenes.html    every full-screen scene: ?scene=<id>[&layout=vertical]
overlays/alerts.html    follow / sub / resub / gift / cheer / raid / redeem / GOAL alerts
overlays/chat.html      branded Twitch chat box
overlays/watchalong.html API-Football scorebug + lineups + events + bet slips (+ ?cams=1 for 2-cam)
auth/                   one-click Twitch connection for real alerts
bridge/                 MSFS SimConnect → live telemetry (run on the sim PC)
lib/                    shared modules (config, state, chat, EventSub, sim)
ds/                     Modernist design-system tokens (styles.css)
design/                 the original Claude Design canvases, for reference
firebase/               Realtime Database security rules
```

## Scene ids

| Pack | Scenes |
| --- | --- |
| Flight sim | `f-start` `f-game` `f-cockpit` `f-chat` `f-brb` `f-end` |
| Pro Clubs | `c-start` `c-game` `c-half` `c-brb` `c-end` |
| Watchalong | `w-start` `w-live` `w-lineups` `w-half` `w-end` `w-brb` `w-goal` `w-poll` |

URL flags (any overlay): `layout=vertical` · `preview=1` (show webcam/gameplay placeholders) · `safe=1` with preview (TikTok/Shorts safe zone) · `motion=0` (no stripe animation) · `channel=<login>` (chat from another channel).
Alerts: `types=follow,sub,raid` · `duration=7` · `sound=<mp3 url>` · `pos=left` · `demo=1`.
Chat box: `bare=1` (transparent bubbles) · `fade=30` (seconds) · `commands=1`.

## Data sources

| Data | Source | Notes |
| --- | --- | --- |
| Flight info (callsign, route, aircraft, leg) | Dashboard → Flight, or **Import latest OFP** from SimBrief | SimBrief allows browser requests, no key needed |
| Flight phase, ALT/GS/HDG/VS, distance + ETE to destination | `bridge/` reading MSFS via SimConnect | Auto phase detection; Manual override in dashboard |
| Twitch chat | Public Twitch IRC (anonymous) | No login or token |
| Alerts | Twitch EventSub WebSocket | Token from `/auth/`, lives only in the OBS URL hash |
| Score, minute, scorer, lineups | Dashboard → Match (manual) or API-Football sync | Key stays in your browser |
| Watchalong scorebug / events | `overlays/watchalong.html` polling API-Football | Fixture, theme, slips set from the dashboard |
| Countdown | Dashboard (shared end time) | Every device shows the same clock |
| Prediction poll | Chat `!predict 2-1`, counted by the overlay | Open/close from dashboard |

## One-time setup

### 1. GitHub Pages (hosting)
Repo → **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**. After a minute the pack lives at `https://<github-user>.github.io/gametimewes-overlays/`.

### 2. Firebase (live dashboard → overlays, free Spark plan)
1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** `gametimewes-overlays` (Analytics off).
2. **Build → Realtime Database → Create database** (United States, start in *locked mode*).
3. **Rules** tab → paste `firebase/database.rules.json` → Publish.
4. **Build → Authentication → Get started → Google** → enable. Under **Settings → Authorized domains** add `<github-user>.github.io`.
5. **Project settings → Your apps → Web (</>)** → register → copy the config into `lib/config.js` (`apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`). Commit + push.
6. Open the dashboard, **Sign in**, copy the UID shown under **Setup**, then in Realtime Database → **Data** add `admins / <your-uid> : true`.

The web config values are public by design; the rules only let `admins` write.

### 3. Twitch alerts
1. [dev.twitch.tv/console/apps/create](https://dev.twitch.tv/console/apps/create) → Category *Broadcaster Suite*, Client type *Public*, OAuth Redirect URL `https://<github-user>.github.io/gametimewes-overlays/auth/`.
2. Paste the Client ID into `twitchClientId` in `lib/config.js`, push.
3. Open `/auth/` → **Connect with Twitch** → copy the alerts URL into OBS. Tokens last ~60 days; the dashboard's Setup tab shows the expiry.

### 4. Sim bridge (on the MSFS PC)
1. Install Node.js LTS from nodejs.org.
2. Double-click `bridge/start-bridge.bat` (first run installs dependencies and creates `config.json`).
3. Put your SimBrief username in `bridge/config.json` for distance/ETE. Press `r` + Enter in the window before each new flight.
4. Optional, for OBS on *other* devices: in Firebase **Authentication → Users → Add user** `bridge@gametimewes.local` with a password, add that user's UID under `admins`, and fill the `firebase` block in `config.json`.

## OBS

Add a **Browser** source, paste a URL from the dashboard's **OBS links** tab and set the width/height it shows. For vertical canvases (Aitum Vertical, TikTok Live Studio, a second OBS profile) use the vertical links; key content stays inside the TikTok safe zone (top 180 px, bottom 420 px, right 140 px clear).

## Local development

```
python -m http.server 8000      # then open http://localhost:8000
```
With an empty Firebase config everything runs in *local mode*: the dashboard and overlays sync between tabs of the same browser.
