# AsterEats (working name)

Matching Atlanta's pantries with local farms. Pantries are **planets**, farms are **stars**, and community funding fills a **stardust meter** around each planet.

> **Everything in this app is sample data.** Pantries, farms, pledges and deliveries are invented. No real payments are taken and no partnerships are claimed.

## The welcome popup

The app opens with a short welcome popup: a headline, a two-sentence pitch, and four "why it's different" squares. A **Read more** button opens the longer story (why a pantry would use it, the four steps, and sourced numbers on food insecurity and food waste). **Take the guided tour** starts the tour; **Explore on my own** closes it. The **About** button in the top bar reopens it. All the words are constants at the top of `src/components/IntroModal.jsx`. The sample-data note and the "Source:" lines on every number are required; keep them, and only add numbers you have opened the source for.

## The demo flow (about 3 minutes)

1. **Open on Adamsville.** A pantry needs 100 lbs of leafy greens. Sample Farm A (6 mi away, 120 lbs available) is matched. Goal: $75 produce + $25 delivery = **$100**, with $65 already pledged.
2. Click **Cover the rest ($35)**. The ring fills and the request becomes *Awaiting delivery*.
3. Click **Confirm delivery received** (the pantry confirms). The planet glows gold.
4. Click the **Decatur** planet. It has no match yet. Farms are ranked with a plain-language explanation of *why* (supply, distance, timing, cost), and farms that can't make the deadline or don't grow the right food are listed but dimmed.
5. Click **Match with Sample Farm D**, then pledge a few times and watch the milestones (Spark, Glow, Blaze, Funded) light up.
6. Click **New request**, pick Marietta, type *"We're low on greens, maybe 100 lbs, need it by tomorrow"*, click **Fill the form from my note**, and post it. The sky finds nearby supply.
7. Open the **Impact** tab: only pantry-confirmed deliveries count as delivered.

**Reset demo** (top right) restores the starting state.

## Farm details

Click or tap any **star** (or focus it and press Enter) to open that farm's card in the side panel: where it is, whether it sells at cost or donates surplus, what it has and how many pounds, how soon it can ship, and the requests it is already part of. If the selected pantry has an open request, the card shows the farm's fit score and plain-language reasons, and a **Match** button when it qualifies (or why it doesn't). "Back to …" returns to the pantry. Code: `src/components/FarmPanel.jsx`.

## Questions tab (hard questions, answered)

The **Questions** tab answers what judges usually ask: how it stays afloat if usage drops, who pays, why donate here instead of a food bank or GoFundMe, where the money goes and tax deductibility, how delivery is verified, fraud, who delivers, food safety, why farms would join, how it differs from existing programs, accessibility, and an honest list of what doesn't work yet. All the text is in one array at the top of `src/components/QuestionsView.jsx`, so the team can reword it to match what you'll actually say. The page states clearly that these are plans, not tested facts; keep it that way.

## Guided tour

Click **Take the tour** (top bar) for an 11-step walkthrough built for judges and first-time visitors: a pantry's need, ranked farms with reasons, the match, neighbors funding it, funded, the pantry confirming delivery, the Impact tab, and Map view. A gold ring points at what each step is talking about, and the demo animates as the tour moves along. **Auto-play** advances by itself (Pause stops it); the arrow keys and Esc work too. Closing the tour resets the demo and restores whatever view you had.

The steps live in one file, `src/lib/tourSteps.js`. Numbers in the text (scores, miles, dollars) are computed from the same matching code the app uses, so they stay correct if you change `sample.json`. Each step rebuilds the demo state from scratch, so Back and Next always agree.

## Map view (for people who find the sky hard to read)

The **Sky view / Map view** buttons above the picture switch between the night sky and a plain road map: interstates in gold, city names, a scale bar, a key, and pantries and farms as clearly labelled pins. **Larger text** makes every label bigger. Set `DEFAULT_MAP_MODE` in `src/config.js` to open on the map instead of the sky.

**Be upfront about this layer:** the highways and cities are a *simplified, hand-drawn* map (`src/data/basemap.js`). City points are accurate; highway lines are only accurate to a mile or two, and only the major roads are drawn. It was drawn without access to real map data, so have someone who knows Atlanta glance at it before judging. To improve it, replace the polylines in `basemap.js` with real OpenStreetMap or Census road data (same `[lat, lng]` shape), or swap in a tile map such as Leaflet + OpenStreetMap (needs internet while presenting). Pantries and farms stay on top either way.

## Motion

The sky is animated to tell the story: planets and stars fade in and the stardust rings fill on load; pledges throw a burst of stardust and a "+$10" label; funding completion sends out shockwave rings; a comet travels between planet and farm on a match and on delivery, followed by a celebration burst; delivered planets glow; open requests pulse softly; numbers count up; panel cards rise in; shooting stars cross the sky now and then.

Everything turns off when the person's system asks for reduced motion (`prefers-reduced-motion`): the page then shows only the final state. All motion CSS is in the last section of `src/styles.css`, and the one-off effects are in `src/components/SkyMap.jsx` (`Effect`).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run check      # sanity checks for the matching logic (no install needed)
```

### No install? Use the prebuilt copy

`preview/` is a ready-made static build. Open `preview/index.html` directly, or upload the folder to any static host (GitHub Pages, Netlify, Vercel, S3). It uses relative paths, so it works from any URL.

## Merging with a teammate's repo

This is a static frontend with no backend, so it merges easily.

- **Easiest:** copy this folder into the repo as the main app, or push it as a branch and open a pull request.
- All sample content lives in **one file**: `src/data/sample.json`.
- `vite.config.js` uses `base: './'`, so the built site works on GitHub Pages under any repo name.
- `.github/workflows/deploy.yml` deploys to GitHub Pages on every push to `main` (enable it under Settings > Pages > Source: GitHub Actions). **This workflow is untested.**

## Rename the project

Change `APP_NAME` and `TAGLINE` in `src/config.js`, and the `<title>` in `index.html`. Nothing else is hard-coded.

## How the matching works (`src/lib/match.js`)

A farm is **eligible** if it lists the requested food AND can arrive before the deadline (prep time + straight-line miles at 30 mph). Eligible farms get a 0-100 fit score:

| Part | Max | What it rewards |
| --- | --- | --- |
| Supply | 40 | Covering more of the requested pounds |
| Distance | 30 | Being closer (0 at 40+ miles) |
| Timing | 20 | Arriving with more time to spare |
| Cost | 10 | Lower total cost per pound |

Delivery cost = $10 + $2.50 per mile. Produce cost = pounds x price per lb (or $0 if the farm donates surplus). Every number is a tunable assumption at the top of `match.js`, not real logistics.

## Known limits (be upfront about these in the pitch)

- **Distances are straight-line**, not driving distance.
- **The request reader is not AI.** `src/lib/parseRequest.js` is a keyword and regex reader that finds food type, pounds and deadline. To use Gemini (or any model), keep the same return shape and call the model from a small **server function**. Never put an API key in the browser code, because anyone can read it.
- **No database.** State lives in the browser and resets on refresh. That is deliberate for a demo.
- **Pledges and deliveries are simulated.**

## What was and wasn't tested

- Matching logic: `npm run check` (17 checks, run and passing).
- The interface: driven end to end in headless Chromium (22 checks: pledge, confirm delivery, match, new request, impact, reset, keyboard selection, mobile layout), with screenshots reviewed by eye.
- Farm details, Questions tab and welcome popup (merged version): 44 checks (welcome popup open, Read more, Esc, About, tour launch, farm card contents, fit score matches the ranking, ineligible farms explain why, keyboard, matching from the card, map view, label overlap, all questions open/close, tour still finishes, phone layout), plus a reduced-motion check.
- Guided tour: 43 checks (every step's state, ring placement, Back, arrow keys, Esc, auto-play, restoring your view, phone layout).
- Map view: 21 checks (labels never overlap each other or a pin in five different states, larger text, phone width, the full funding flow in map view).
- The animations: 22 more checks in headless Chromium (effects appear, clean themselves up, numbers settle, reduced motion shows no animation, phone layout still fits). Not tested: other browsers, or how smooth it feels on a slow laptop.
- **Not tested:** `npm install` / the Vite build, because the sandbox this was built in couldn't reach the npm registry. The `preview/` build was compiled with esbuild against React 19. If `npm run dev` complains, tell whoever is helping you the exact error and it should be a small fix.

## Palette

Plum `#2E1069`, indigo `#272F8B`, lavender `#9B75DB`, gold `#F2B90C`, red `#C20300` (used only as a filled badge with white text, since red text on purple is hard to read).
