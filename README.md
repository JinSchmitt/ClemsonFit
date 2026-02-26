# ClemsonFit PWA

A Progressive Web App for Clemson students to track dining hall meals, log workouts, and compete on the TigerBoard.

---

## Files

```
clemsonfit_pwa/
├── index.html          ← Main app (all HTML/CSS/JS)
├── manifest.json       ← PWA manifest (name, icons, colors)
├── sw.js               ← Service worker (offline cache + dining API cache)
├── icons/              ← App icons in all required sizes
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png    ← iPad home screen icon
│   ├── icon-180.png    ← iPhone home screen icon (apple-touch-icon)
│   ├── icon-192.png    ← Android home screen
│   ├── icon-384.png
│   └── icon-512.png    ← Splash screen / maskable
└── README.md
```

---

## Deployment (Vercel — recommended, free)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. From this folder:
   ```bash
   vercel deploy
   ```

3. Vercel will give you a URL like `clemsonfit.vercel.app`.  
   **Important:** The service worker requires HTTPS — Vercel provides this automatically.

4. To use a custom domain (e.g. `clemsonfit.app`):
   - Buy domain on Namecheap/Porkbun
   - Add it in Vercel dashboard → Settings → Domains

### Alternative: Netlify
Drag and drop this entire folder onto [app.netlify.com](https://app.netlify.com) — no CLI needed.

---

## How students install on iPhone (iOS 16.4+)

1. Open the app URL in **Safari** (must be Safari, not Chrome)
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**

The app will appear on their home screen with the ClemsonFit icon and open full-screen with no browser chrome — feels native.

**Note:** The install banner inside the app guides students through this automatically.

---

## Wiring up the Live Dining Hall API

In `index.html`, find the `DiningAPI` object near the bottom:

```js
const DiningAPI = {
  USE_LIVE_API: false,   // ← Change to true
  LOCATIONS: {
    'Schilletter': '5b6be6d2f3eeb60e6192af2f',  // verify these IDs
    'Harcombe':    '5b6be6d2f3eeb60e6192af30',
    'Core':        '5b6be6d2f3eeb60e6192af31',
  },
  ...
}
```

### Finding the real location IDs

Clemson uses **Dine On Campus** (by TouchNet/Transact). To find location IDs:

1. Visit [dineoncampus.com/clemson](https://dineoncampus.com/clemson) or the Clemson dining site
2. Open DevTools → Network tab
3. Click on a dining hall
4. Look for requests to `api.dineoncampus.com/v1/location/...`
5. The ID in that URL is your location ID — update `LOCATIONS` with the real ones

### If Dine On Campus doesn't work

Options in order of ease:
- **Ask Clemson Dining directly** — email dining@clemson.edu and ask if they have a developer API or data export. Many schools will share it for student projects.
- **Scrape the Clemson dining website** — use a small Vercel serverless function as a proxy to avoid CORS issues.
- **Open Food Facts API** — free barcode/food database for packaged items: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- **USDA FoodData Central** — free, comprehensive nutrition database: `https://api.nal.usda.gov/fdc/v1/foods/search?query=...&api_key=DEMO_KEY`

### CORS note

If the dining API blocks browser requests, create a simple proxy in `/api/dining.js` (Vercel serverless):

```js
// /api/dining.js
export default async function handler(req, res) {
  const { locationId, date } = req.query;
  const upstream = await fetch(
    `https://api.dineoncampus.com/v1/location/${locationId}/periods?date=${date}`
  );
  const data = await upstream.json();
  res.setHeader('Cache-Control', 's-maxage=900'); // cache 15min
  res.json(data);
}
```

Then update the fetch URL in `DiningAPI.fetchMenu()` to point to `/api/dining?locationId=...`.

---

## Adding Supabase (backend + real leaderboard)

1. Create a free project at [supabase.com](https://supabase.com)
2. `npm install @supabase/supabase-js`
3. Replace `localStorage` calls with Supabase:

```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(YOUR_URL, YOUR_ANON_KEY)

// Auth
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })

// Leaderboard (replace mock players)
const { data } = await supabase
  .from('user_xp')
  .select('name, xp, streak, protein, lifts')
  .order('xp', { ascending: false })
  .limit(20)
```

Tables to create: `profiles`, `food_logs`, `workout_logs`, `user_xp`, `weight_logs`

---

## Upgrading to React Native later

When you're ready to ship to the App Store:
- Your business logic (XP system, food parsing, dining API adapter) copies over as-is
- UI components rewrite from HTML/CSS → React Native StyleSheet or NativeWind
- Use **Expo EAS Build** to produce the `.ipa` for App Store submission
- Apple Developer Account required ($99/year)
