# Offseason S&C — College Basketball

Mobile-first web app for an 8-week offseason program: 4 lifting days + daily mobility + 2 conditioning days. Heavy focus on **mass gain** and **hip flexibility**.

## Run locally
Just open `index.html` in a browser, or:
```
npx serve .
```

## Deploy (free, public URL)
Pick one — all are free and give you a real URL to share with the team.

### Option A — Netlify Drop (easiest, ~30 seconds)
1. Go to https://app.netlify.com/drop
2. Drag the entire `hoops-offseason` folder onto the page
3. Done — you get a URL like `https://random-name.netlify.app`

### Option B — Vercel
```
npm i -g vercel
vercel --prod
```

### Option C — GitHub Pages
1. Push folder to a GitHub repo
2. Settings → Pages → deploy from branch `main`, root `/`

## Editing the program
All workouts and videos live in **`data.js`**. Change exercises, swap YouTube IDs, adjust sets/reps — no rebuild needed.

## What's inside
- **Today** tab — auto-shows the right workout for the current day of the week
- **Week** tab — full week overview, tap any day
- **Mobility** tab — daily 10–15 min hip-focused routine
- **Conditioning** tab — full conditioning library
- **About** tab — how to use, 8-week progression, nutrition + sleep notes

Every exercise opens an embedded YouTube demo + form cues.

