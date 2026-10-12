# UB Altitude — The Altitude Test

An immersive, flight-inspired activation for the **UnionBank Altitude** card. Guests sit in a
plane-seat replica, open the window, guess the city they are landing in, and answer on the
in-flight entertainment (IFE) screen. Speed matters. After five landings their score is converted
into **UB Miles**, they get a referral code to keep, and they are invited to apply for an Altitude
card to claim the miles.

Everything in this repo is a static web app (no build step) plus a tiny Node server that keeps the
screens in sync. Visuals and mechanics follow the deck **"UB FOR RIAN"** (page renders in
[`docs/deck/`](docs/deck)).

---

## 1. The experience (from the deck)

| Step | What happens |
| --- | --- |
| Attract | Key visual, *The Altitude Test* badge, "Unlock bonus travel miles with your elevated travel knowledge", **Tap to board**. |
| Boarding | **Solo flight** or **Head-to-head** (two passengers compete). Names are typed on an on-screen keyboard (or skipped). |
| Pre-flight briefing | Rules in three cards, **Take off** → 3-2-1 countdown with the cabin chime. |
| Landing (×5) | The plane window shows the city from the air. The IFE asks **"Where are we landing?"** with four pill answers (laid out A C / B D like the deck). A 15 s timer runs; the faster the answer, the bigger the speed bonus. |
| Reveal | Correct answer lights up, miles earned are shown, the window labels the city ("BARCELONA"). |
| Final score | Flip-board tiles — **4/5** — "You've landed! Congratulations on completing your journey!" |
| Earned reward | **105 UB MILES** on a dot-matrix bar, "₱16 = 1 UB Mile · 105 UB Miles = ₱1,680 equivalent spend · Keep exploring. Keep earning!" |
| Claim | Referral code in the deck's format (e.g. `1325XRZ512`), card art, QR code → **Apply now!** (bigger QR in a dialog). |
| Leaderboard | Rank · Name · UB Miles flip-board, the guest's row highlighted. Back to attract after a while. |

### The five landings

| # | Window shows | Options (A–D as in the deck) | Answer |
| --- | --- | --- | --- |
| 1 | Barcelona, Eixample grid from the air | Madrid · Barcelona · Lisbon · Rome | Barcelona, Spain |
| 2 | Tokyo with Tokyo Tower | Seoul · Osaka · Tokyo · Taipei | Tokyo, Japan |
| 3 | The Las Vegas Strip at night | Dubai · Las Vegas · Macau · Singapore | Las Vegas, United States |
| 4 | Sydney Harbour, Opera House and bridge | Auckland · Sydney · Melbourne · Cape Town | Sydney, Australia |
| 5 | Salzburg old town and the Salzach | Salzburg · Prague · Ljubljana · Innsbruck | Salzburg, Austria |

(The deck's Las Vegas slide re-used the Madrid/Barcelona pills by mistake; the app uses the
Dubai/Las Vegas/Macau/Singapore list from the deck's notes.)

### Scoring (all in `js/config.js`)

```
correct landing          = 15 UB Miles
speed bonus              = up to +15, scaling down to 0 at the buzzer  (ceil(15 × time left / 15 s))
missed / wrong           = 0
max per flight           = 5 × 30 = 150 UB Miles
peso equivalent          = miles × 16
```

Four fast correct answers land around the deck's example of 105 UB Miles.

---

## 2. Screens

| Page | Role | Notes |
| --- | --- | --- |
| `index.html` | **IFE, seat 1 — the host.** Owns the game state and timers. | Landscape, designed at 1920×1080 and scaled to any screen. |
| `index.html?seat=2` | IFE for the second seat (head-to-head). | Mirrors the host; only its own answer buttons are live. The host screen shows "Answering on seat 2…" for that passenger. If no seat-2 screen is connected, both passengers answer side by side on the host screen. |
| `window.html?seat=1` | Plane window, seat 1. | Portrait 1080×1920. Clouds while cruising; the city appears when the round starts; the city name on reveal. |
| `window.html?seat=2` | Plane window, seat 2. | Same landing as seat 1. |
| `leaderboard.html` | Booth leaderboard. | Portrait or landscape, live. |

URL parameters:

| Parameter | Pages | Meaning |
| --- | --- | --- |
| `seat=1|2` | IFE, window | Which seat the screen belongs to. Seat 1 is the host. |
| `preview=0|1` | IFE | Show/hide the plane-window preview beside the IFE (default on — handy on a laptop or a single-screen booth; turn off when real window screens are used). |
| `frame=0` | window | No drawn porthole or shade: just the view, edge to edge, for a screen that sits behind a real window cut-out. |
| `sync=local` | any | Ignore the server relay and sync only inside this browser. |

Keyboard shortcuts on the host: **S** operator panel · **Esc** back to attract · **Enter** next ·
**1–4** seat-1 answers · **7 8 9 0** seat-2 answers. On a touch screen tap the top-left corner five
times to open the operator panel.

---

## 3. Running it

```bash
npm start            # → http://localhost:8080/   (no dependencies to install)
```

The server prints its LAN address. Open the pages above on the venue screens. It also serves two
tiny routes (`/events`, `/bus`) that relay state between screens, so separate Chrome kiosk windows,
separate profiles, or other PCs on the same Wi-Fi all stay in sync.

Without the server (e.g. the Netlify deploy, or opening the files through any static host) the
screens still sync through the browser's BroadcastChannel — but only windows/tabs of the **same
browser profile**. That is fine for a laptop demo (open the IFE, then open the window and
leaderboard from the operator panel); at the venue use the server.

### Venue: one PC, several monitors

1. `npm start` on the PC.
2. Run `kiosk\screens.bat` (Windows). It launches Chrome in kiosk mode once per screen, each with
   its own profile and `--window-position`, so each window lands on its monitor. Edit the x/y
   offsets in the file to match Windows → Display settings. Delete the seat-2 lines for a
   single-seat build.
3. `kiosk\screen.bat <page> <x> <y> [host]` launches a single screen, e.g.
   `kiosk\screen.bat "/window.html?seat=1&frame=0" 1920 0`.
   macOS/Linux: `kiosk/screen.sh`.

### Venue: several PCs

Run `npm start` on one PC (the host IFE) and open `http://<that-ip>:8080/window.html?seat=1`,
`.../leaderboard.html`, `.../?seat=2` on the others. All sync goes through the server.

Reloading the host page resets the current flight to the attract screen (results already saved are
kept).

---

## 4. Operator panel

Press **S** (or tap the top-left corner ×5) on the host:

- Seconds per landing, sound, window preview on/off, the **Apply link** behind the QR code
  (default is a placeholder — set the real Altitude application link before the event; the
  referral code is appended as `?ref=CODE`).
- Open the other screens in new windows (laptop demo).
- **Export flights (CSV)** — one row per passenger per flight: timestamp, mode, name, correct
  count, miles, peso equivalent, referral code, and per round the city, the answer picked,
  correct/incorrect, reaction time in ms, miles.
- **Seed demo leaderboard** (the names from the deck mock-up) and **Clear leaderboard**.

Data lives in the host browser's `localStorage` (`altitude.leaderboard`, `altitude.sessions`,
`altitude.settings`). Export the CSV before clearing the browser profile.

---

## 5. Project layout

```
index.html / window.html / leaderboard.html   the three screens
js/config.js        cities, copy, scoring, timing — edit this first
js/game.js          game state machine + IFE rendering (host and seat-2 client)
js/window.js        plane-window display
js/leaderboard.js   standalone leaderboard
js/leaderboard-view.js  the flip-board renderer (shared)
js/dotmatrix.js     <dot-text> — the LED/flip-board text element (SVG dots, no fonts needed)
js/bus.js           screen sync: BroadcastChannel + localStorage + server SSE, de-duplicated
js/store.js         leaderboard, flight log, settings, CSV export, referral codes
js/sfx.js           synthesised cabin chime / correct / wrong / tick (WebAudio, no files)
js/stage.js         fixed-size stage scaled to the viewport
css/                shared look (copper, pills, boards), IFE, window, leaderboard
assets/cities/      the five aerial photos from the deck (portrait, for the window screens)
assets/bg/          copper brushed-metal backgrounds, key visual
assets/brand/       The Altitude Test badge, UnionBank logo (keyed out of the deck), favicon
vendor/qrcode.js    QR generator (MIT, Kazuhiko Arase)
server.js           static server + sync relay (zero dependencies)
kiosk/              Chrome kiosk launchers
docs/deck/          page renders of the source deck for reference
netlify.toml        static deploy config
```

Assets were extracted from the deck's PDF export at the resolution it carries (1080×1920 city
photos, 1920×1080 backgrounds). The copper background is a clean band of the deck's reward screen
mirror-tiled to full height; the UnionBank mark was masked out of the IFE mock-up. The "ALTITUDE"
wordmark is set in type. The card art on the claim screen is a CSS placeholder until real card
artwork is supplied.

---

## 6. Changing things

- **Cities / answers / order** — `cities` in `js/config.js`. Each entry needs an `answer` that
  matches one of its `options` exactly. `shuffleCities` / `shuffleOptions` randomise per flight.
- **Timing and scoring** — `game` in `js/config.js` (round seconds can also be changed live in the
  operator panel).
- **Copy** — the screen templates are in `js/game.js` (`T.attract`, `T.preflight`, …).
- **Look** — colour tokens at the top of `css/shared.css`; the brushed copper is
  `assets/bg/copper.jpg`.
- **Dot-matrix text** — `<dot-text value="…">` anywhere; `tiles` for one tile per glyph,
  `--dot` sets the pitch.
