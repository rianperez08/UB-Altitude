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
| Claim | The rose-gold Altitude card beside the referral code in the deck's format (e.g. `1325XRZ512`) and a QR code: "Scan to start your UnionBank Altitude Card application." **See the leaderboard** moves on. |
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
npm start            # → http://localhost:8080/   (The Altitude Test needs no install; `npm install` once for the Idea 2 coin analyzer)
```

The server prints its LAN address. Open the pages above on the venue screens. It also serves two
tiny routes (`/events`, `/bus`) that relay state between screens, so separate Chrome kiosk windows,
separate profiles, or other PCs on the same Wi-Fi all stay in sync.

Without the server (e.g. the Netlify deploy, or opening the files through any static host) the
screens still sync through the browser's BroadcastChannel — but only windows/tabs of the **same
browser profile**. That is fine for a laptop demo (open the IFE, then open the window and
leaderboard from the operator panel); at the venue use the server.

### Hosted preview on Netlify

The Netlify project is **ub-altitude** (https://app.netlify.com/projects/ub-altitude, live at
https://ub-altitude.netlify.app once a deploy has run). It is a static deploy of this repo
(`netlify.toml` publishes the repo root, no build step), so it is ideal for reviewing the screens
on any laptop or phone: open `/` and use the operator panel to pop open the window and leaderboard
in new windows — they sync through the browser. For the venue itself run `npm start` on the booth
PC (the hosted copy has no sync relay between separate kiosk windows or PCs).

Deploys come from the GitHub repo: in Netlify, **Project configuration → Build & deploy →
Continuous deployment → Link repository** → `rianperez08/UB-Altitude`, then every push to the
production branch publishes. A manual deploy from a machine logged into Netlify:

```bash
npx netlify-cli deploy --prod --dir . --site 153ffeba-8c60-46bd-83f2-0bb5a2177fba
```

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
assets/brand/       The Altitude Test badge, UnionBank logo, landing (arrivals) icon, rose-gold Altitude card, favicon
vendor/qrcode.js    QR generator (MIT, Kazuhiko Arase)
server.js           static server + sync relay (zero dependencies)
kiosk/              Chrome kiosk launchers
idea2/              Idea 2 — Altitude Exchange, the coin-to-miles kiosk (see section 7)
lib/coin-analyzer.mjs  Altitude Exchange coin analyzer (Gemini vision)
netlify/functions/  /api/analyze-coins on Netlify
docs/deck/          page renders of the source deck for reference
netlify.toml        static deploy config
```

Assets were extracted from the deck's PDF export at the resolution it carries (1080×1920 city
photos, 1920×1080 backgrounds). The copper background is a clean band of the deck's reward screen
mirror-tiled to full height. The UnionBank logo, the landing icon (leaderboard header) and the
rose-gold card on the claim screen come from the brand kit ("UNIONBANK ALTITUDE"); the card is
resized to 640 px WebP. The "ALTITUDE" wordmark is set in type.

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

---

## 7. Idea 2 — Altitude Exchange (`/idea2/`)

The second idea in the deck: a kiosk that turns the foreign coins left over from your trips into
UB Miles. Money changers don't take foreign coins; Altitude Exchange does. The screens follow the
**"IDEA 2"** UI deck: a portrait kiosk (`idea2/index.html`, designed at 1080×1414 and scaled to
fit) with a white screen panel above a copper coin tray. Live at https://ub-altitude.netlify.app/idea2/.

| Screen | What happens |
| --- | --- |
| start | *Altitude Exchange* wordmark, **start**. The tray shows the live camera looking at the coins. |
| Scanning | The kiosk photographs the tray and sends it to the **coin analyzer**; the scanner light sweeps the tray. |
| Detecting coins from… | One dot-matrix row per issuing country the analyzer found. |
| Currencies detected | One row per currency: total face value `=` pesos (`$0.25 = ₱14.50`). Philippine pesos, unrecognised coins and currencies without a rate are listed but not valued. |
| Total coin value | `₱ 413.00`, then **UB ALTITUDE 1.25%** vs **OTHER CONVERSION 1.75%**, each with "total with FX cost". |
| Converting into Altitude miles | Spinner. |
| Your total miles | Total ÷ ₱16, to two decimals (₱413 → 25.81), **Redeem**. |
| Receipt | The copper printer issues the receipt: UB Miles earned and **Keep your UB Miles** — guests show it at the UnionBank booth to exchange their miles for giveaway items (they applied for the card at the start, so there is no code or apply QR). **done** → start. |

The board screens move on by themselves; tapping the panel skips ahead.

### The coin analyzer

`lib/coin-analyzer.mjs` sends the photo of the tray to Gemini (`gemini-3.8-flash` through the official
`@google/genai` SDK: vision, structured JSON output, high image resolution, nothing stored on Google's
side) and gets back every coin: issuing country, ISO currency, face value, label, confidence. The
kiosk then values the coins with the rates in `idea2/js/config.js` — the model never sets a price.

- **Netlify:** `netlify/functions/analyze-coins.mjs` serves it at `POST /api/analyze-coins`. Add the
  Gemini API key to the project — **Project configuration → Environment variables → `GEMINI_API_KEY`**
  (scope: Functions) — then redeploy. Until then the kiosk shows "Coin analyzer offline". The function
  is rate-limited to 12 scans a minute per visitor.
- **Venue PC:** `npm install` once, then `GEMINI_API_KEY=… npm start`; `server.js` serves the same route.
- Each **start** is one API call. The operator panel's **Test with the sample tray** checks the key,
  the connection and the time a scan takes.

### What the analyzer looks at

The kiosk asks for the camera when it opens (the rear camera on phones and tablets; pick another in
the operator panel). Only the part of the frame drawn inside the tray is sent. Without a camera, the
buttons under the tray switch to **Use a photo** (phones offer their camera) or **Sample tray** (the
coins from the deck) — both go through the same analyzer. The camera needs https or localhost.

- **Rates, fees, miles, timing** — `idea2/js/config.js`. The rates are indicative demo rates; set real
  ones before the event.
- **Operator panel** — **S** (or five taps top-left): tray camera, kiosk location (printed on paper
  receipts), sound, automatic paper receipts, analyzer test, CSV export of every exchange
  (`exchange.scans` in `localStorage`), clear records. **Esc** start screen · **Enter** start / next.
- **Receipt printer** — tick *Print a paper receipt automatically* and start Chrome with
  `--kiosk-printing` so the 80 mm slip prints without a dialog.
- Code: `idea2/js/exchange.js` (flow and screens), `idea2/js/tray.js` (camera, photo, sample,
  capture), `idea2/js/store.js` (log, settings, codes), `idea2/css/exchange.css`; artwork cut from the
  deck in `idea2/assets/` (wordmark, empty tray, sample tray). Shared with the root: dot-matrix text
  (now with `$ € £ ¥ ₩ ₱ = %`), sounds, QR generator.
