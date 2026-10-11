# AsterEats: handoff for a teammate (and their Claude)

Paste this whole file into a new Claude chat (or attach it with the project zip) and say what you want to change. It explains what we're building, what exists, how it works, and what to be careful about.

## 1. The situation

- **Event:** a vibe-coding hackathon in Atlanta. Building started Fri Oct 9, 2026 at 8:30 PM. Judging is Sun Oct 11 at 9:30 AM.
- **Tracks:** Cox Social Good, Adobe Creative, AI/ML, Fintech, plus side challenges.
- **Our entry:** Cox Social Good track. Side challenges we are pursuing: the Gemini API challenge and the GoDaddy domain challenge. (Replit and Mercedes challenges still need to be read and decided.)
- **Team:** two frontend-leaning people, possibly two backend-experienced people joining. One teammate is deploying through GitHub.

## 2. The idea

A need-first food-matching platform for metro Atlanta. Instead of farms listing what they have and hoping someone wants it, **a pantry posts what it actually needs** (for example "100 lbs of leafy greens within 24 hours"), and the app finds the best nearby farm, then lets the community fund the delivery.

Shown as a **night sky**:
- **Planets = food pantries.** A gold ring around a planet is the **stardust meter** (funding progress).
- **Stars = farms.** Eligible farms glow; farms that can't help are dimmed.
- A gold line is the match between a planet and a star.
- A planet glows gold with a check when the **pantry confirms** the food arrived.

The constellation look came from a teammate's idea for the Creative track, moved into the Social Good track.

**Name:** AsterEats is the working name (CosmoCrop and Stargrazer were alternatives). Not final. The domain still has to be checked on GoDaddy. To rename, change `APP_NAME` and `TAGLINE` in `src/config.js` and the `<title>` in `index.html`.

**Similar programs:** an earlier version of this note said a product called "HarvestLink" exists and is similar. That could not be verified (the name only turned up as a startup-idea page and an unrelated farm-equipment product), so don't cite it. Real programs that do parts of this include The FarmLink Project, Feeding America Eastern Wisconsin's FarmLink, AmpleHarvest.org and Concrete Jungle. Our difference is the need-first direction, plain-language "why this farm" explanations, community funding, and pantry-confirmed delivery. Do not claim a partnership with any real organization, and keep real organization names out of the app itself.

## 3. What is built (all sample data, no backend)

A static React app (Vite) with an SVG sky map, a side panel, an Impact tab and a "New request" form.

Request lifecycle: `open` (needs a match) → `matched` (farm chosen, funding open) → `funded` (pledges reach the goal) → `delivered` (pantry confirms pounds received). Funding milestones: Spark 25%, Glow 50%, Blaze 75%, Funded 100%. There is deliberately no donor leaderboard.

Demo flow (about 3 minutes), also in `README.md`:
1. Adamsville opens with a matched request: $65 of $100 pledged.
2. Click "Cover the rest", then "Confirm delivery received". The planet glows.
3. Click Decatur: farms are ranked with reasons. Match one, pledge, watch the milestones.
4. New request for Marietta: type a note, click "Fill the form from my note", post it.
5. Impact tab: only pantry-confirmed deliveries count.
6. "Reset demo" restores the start.

Farm details: clicking or tapping a star opens a farm card (what it has, price or donated, ready time, its current requests, and its fit for the selected pantry's open request with a Match button). `src/components/FarmPanel.jsx`.

Questions tab: short, honest answers to judge questions (sustainability, who pays, why donate here, money and tax, verification, fraud, who delivers, food safety, farms, existing programs, accessibility, limits). Text lives in `src/components/QuestionsView.jsx`. These are plans, not facts, and the page says so. Update it if the team's answers change (for example once a real Gemini reader exists).

Money tab: how pledges would be held, the refund-if-unconfirmed rule, and draft farm price-lock terms with a fuel-cost exception. Text lives in `src/components/MoneyView.jsx`; the numbers in it (25% fuel trigger, 14-day window) are placeholders. Join tab: demo-only form for pantries and farms (`JoinView.jsx`); nothing is sent or saved.

Welcome popup: opens on load (`src/components/IntroModal.jsx`, styles prefixed `welcome-` in `styles.css`). First screen: headline, short pitch, four "why it's different" squares, sample-data note. **Read more** reveals the "Less to manage" box, the four steps, and three sourced facts (USDA: nearly 48 million people, 14 million children food insecure in 2024; Feeding America: 1 in 6 in Georgia; USDA: 30 to 40 percent of the food supply wasted). The **About** button reopens it. Copy is constants at the top of the file. Do not rename its classes to `intro`: `.intro` already styles the side panel's "Read the sky" card.

Guided tour: **Take the tour** in the top bar runs an 11-step walkthrough (need, ranked farms, match, funding, delivery, impact, map). Steps are in `src/lib/tourSteps.js`; the card and gold pointer ring are `src/components/Tour.jsx`. Text numbers are computed from the matching code. Elements it points at carry `data-tour="..."` attributes, so keep those if you restructure components.

Map view: a **Sky view / Map view** toggle above the picture. Map view shows a simplified road map (gold interstates, real city names, scale bar, key) with pantries as house pins and farms as stars, for people who find the sky hard to read. **Larger text** scales every label. The highway lines are hand-drawn and only roughly accurate (`src/data/basemap.js`); cities are accurate. Do not present it as survey-accurate. Labels are placed automatically beside their pins (`SkyMap.jsx`, `BaseMap.jsx`) so they don't collide.

Full screen, zoom and pan: Sky and Map view fill the window. The top bar is see-through and floats over the picture, and pantry or farm details open in a side bar (bottom sheet on phones) only when something is selected. Drag to pan, scroll or pinch to zoom, or use the +, - and reset buttons (bottom right, with a compass and a live scale bar). The pan/zoom logic is `src/lib/panZoom.js`; it moves the SVG viewBox, and a drag never counts as a click. The header and footer heights are measured in `App.jsx` (`--topbar-h`, `--foot-h`) so overlays never tuck under them.

Animations (all switched off automatically if the system asks for reduced motion): rings fill on load, pledge sparkles and a floating "+$10", shockwave rings when funded, a comet between planet and farm on match and delivery, a celebration burst, glowing delivered planets, pulsing open requests, count-up numbers, panel cards sliding in, occasional shooting stars.

## 4. How it works

- **Matching** (`src/lib/match.js`): a farm is eligible if it grows the requested food and can arrive before the deadline (prep hours + miles at 30 mph). Eligible farms get a 0 to 100 score: supply 40 + distance 30 + timing 20 + cost 10. Delivery cost = $10 + $2.50 per mile. Produce cost = pounds × price per lb, or $0 if the farm donates surplus. Every number is an assumption, not real logistics.
- **Map** (`src/lib/geo.js`, `SkyMap.jsx`): real latitude and longitude projected to scale, so distance on screen matches distance in miles (straight-line, not driving).
- **Request reader** (`src/lib/parseRequest.js`): a keyword and regex reader. **It is not AI.** Be honest about that in the pitch.
- **All sample content** is in one file: `src/data/sample.json` (5 pantries, 8 farms, 4 starting requests).

## 5. File map

```
src/
  App.jsx                  state, views, handlers (choose, pledge, confirm, add, reset)
  config.js                app name and tagline
  styles.css               palette, layout, motion (motion is the last section)
  components/
    SkyMap.jsx             the sky or map, pins, labels, lines, and one-off effects
    BaseMap.jsx            the road map layer (roads, signs, city names, scale bar)
    SidePanel.jsx          request card, ranked farms, funding, delivery
    NewRequestModal.jsx    the new request form
    ImpactView.jsx         the Impact tab
    CountUp.jsx            number count-up
    Tour.jsx               the guided tour card and pointer ring
    FarmPanel.jsx          farm details card (when a star is clicked)
    QuestionsView.jsx      the Questions tab (hard questions, answered)
    MoneyView.jsx          the Money tab (where pledges go, farm price terms)
    JoinView.jsx           the Join tab (demo registration form)
    IntroModal.jsx         the welcome popup shown on load (and from About)
  lib/ match.js geo.js parseRequest.js categories.js motion.js tourSteps.js panZoom.js
  data/sample.json         all sample data
  data/basemap.js          hand-drawn highways and city points for Map view
scripts/check-match.mjs    17 checks for matching and the reader
preview/                   ready-made static build (open preview/index.html)
preview-src/index.html     page template for the no-install build
.github/workflows/deploy.yml   GitHub Pages deploy (untested)
```

## 6. Running it

- **No install:** open `preview/index.html` in a browser (unzip first, don't open from inside the zip).
- **Dev:** `npm install`, then `npm run dev` (http://localhost:5173). `npm run build` outputs `dist/`. `npm run check` runs the matching checks.
- **Important:** the Vite build was never run in the environment this was made in (no npm registry access), so `npm install` / `npm run dev` are untested. The `preview/` build was made with esbuild and React 19. If Vite errors, send the exact error to your Claude; it is likely a small fix.
- **Rebuilding `preview/` without Vite** (esbuild is needed): bundle `src/main.jsx` to `preview/app.js` as an IIFE with the JSX automatic runtime, then copy `preview-src/index.html` to `preview/index.html`. `preview/app.css` comes from `styles.css`.

## 7. What was tested, and what wasn't

- Tested: matching logic (17 checks), the full click-through in headless Chromium (22 checks), the animations (22 checks), Map view (21 checks), the guided tour (43 checks), farm cards, Questions and the welcome popup together after merging (44 checks), phone width, reduced motion.
- Not tested: Vite dev/build, the GitHub Pages workflow, browsers other than Chromium, real devices.

## 8. Rules to keep (please keep these)

1. **Everything is sample data and says so.** Keep the "Sample data" badge and the footer. Don't present invented pantries, farms or numbers as real.
2. **No fake partnerships** or real organization names.
3. **No API keys in browser code.** Anyone can read them. A Gemini or other model call must go through a small server function.
4. **Pledges and deliveries are simulated.** No real payments.
5. **Red (#C20300) only as a filled badge with white text.** Red text on the purple background fails contrast.
6. **Keep keyboard access:** planets are focusable and respond to Enter and Space.
7. **Keep reduced-motion support** for any new animation (the block at the end of `styles.css`).
8. **Be upfront in the pitch:** distances are straight-line, the request reader is not AI, there is no database.

## 9. Palette (from Adobe Color)

Plum `#2E1069`, indigo `#272F8B`, lavender `#9B75DB`, gold `#F2B90C`, red `#C20300`. Darker plum `#1B0948` is the page background, `#F6F1FF` is text.

## 10. Open items and ideas to play with

- Final name and the GoDaddy domain check.
- Merge into the teammate's GitHub repo (easiest: copy this folder in, or push as a branch and open a pull request).
- Gemini upgrade: replace `parseRequest.js` with a model call through a server function. Keep the same return shape `{category, lbs, deadlineHours, found}`.
- Real persistence if a backend teammate joins (requests, pledges, confirmations).
- Optional stretch: voice or audio feedback (ElevenLabs side challenge), sound on delivery.
- Map upgrade: replace `basemap.js` with real road data, or use Leaflet + OpenStreetMap tiles (needs internet while presenting; test on the venue Wi-Fi first).
- Visual ideas: constellation lines connecting delivered pantries, a time-lapse of the sky filling up, a "tonight's sky" intro.
- Pitch material: the Notion description (idea, why it matters, supporting data) was drafted earlier and still needs updating to the sky concept and final name.

When you change something, run `npm run check` (if installed) and open the page to click through the demo flow before the next judging round.
