# 💡 SportsLights

**Score-triggered Philips Hue light shows for Braves & Gators games.**

The moment Atlanta scores a run or Florida scores a touchdown, your theater room lights fire a sequenced flash animation — automatically, in real time, no button press needed. Then lights restore to exactly where they were.

---

## Architecture

```
[ESPN API] → [Next.js Dashboard on Vercel] → [sportslights-proxy.js on YOUR computer] → [Hue Bridge at 192.168.68.50]
```

- **Frontend**: Next.js 15 app on Vercel — beautiful dashboard, score display, settings
- **Proxy**: Single Node.js file running locally — bridges Vercel → your local Hue bridge
- **Scores**: ESPN public API polled every 20 seconds, no key required
- **Lights**: Philips Hue local API — instant, no cloud latency

---

## Quick Setup (5 minutes)

### Step 1: Deploy the Frontend to Vercel

1. Upload this folder to GitHub (or drag-drop to [github.com](https://github.com))
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Click Deploy — Vercel auto-detects Next.js, no config needed
4. Your dashboard is live! (e.g. `https://sportslights-xyz.vercel.app`)

### Step 2: Run the Proxy on Your Computer

```bash
# No npm install needed! Uses built-in Node.js modules only.
node sportslights-proxy.js
```

Keep this terminal window open while watching games.

**Requirements**: Node.js 18+ ([nodejs.org](https://nodejs.org))

### Step 3: Get Your Hue API Key

1. Press the physical button on your Hue bridge
2. Within 30 seconds, run:

```bash
curl -X POST http://192.168.68.50/api \
  -H "Content-Type: application/json" \
  -d '{"devicetype":"sportslights#home"}'
```

3. Copy the `username` value from the response — that's your API key

### Step 4: Configure the Dashboard

1. Open your Vercel URL
2. Click the ⚙️ settings icon
3. Enter your Hue API key
4. Find your Theater Room Group ID:
   - Visit: `http://localhost:3001/hue/api/[YOUR-KEY]/groups`
   - Find your theater room and note its ID number
5. Set Light Scope (Theater Room or Whole House)

### Step 5: Watch & Enjoy

- Enable Braves and/or Gators teams
- Hit **START WATCHING**
- When your team scores → lights flash → restore ✨

---

## Light Sequences

| Team | Flash Pattern |
|------|--------------|
| Braves | 🔴 Red → 🔵 Navy → 🔴 Red → ⚪ White → 🔴 Red |
| Gators Football | 🟠 Orange → 🔵 Blue → 🟠 Orange → ⚪ White → 🟠 Orange |
| Gators Basketball | 🟠 Orange → 🔵 Blue → 🟠 Orange → ⚪ White → 🟠 Orange |

Each step is ~600ms. Total animation ~3.5 seconds, then lights restore.

---

## Proxy Environment Variables

```bash
# Optional — override bridge IP
HUE_BRIDGE_IP=192.168.68.50 node sportslights-proxy.js
```

---

## Troubleshooting

**Proxy not connecting?**
- Make sure you're on your home WiFi
- Check bridge IP: `ping 192.168.68.50`

**Lights not changing?**
- Verify API key in settings
- Test with: `curl http://localhost:3001/hue/api/[KEY]/lights`
- Check group ID — use `0` for "all lights"

**Scores not updating?**
- ESPN API is public but occasionally rate-limits. 20s polling is safe.
- Check browser console for errors

---

## File Structure

```
sportslights/
├── app/
│   ├── components/
│   │   ├── Dashboard.tsx       # Main UI
│   │   └── Dashboard.module.css
│   ├── lib/
│   │   ├── types.ts            # Types, team configs, color utils
│   │   ├── useSettings.ts      # Persistent settings hook
│   │   ├── useScorePoller.ts   # ESPN polling hook
│   │   └── useHueLights.ts     # Hue control hook
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
│   └── favicon.svg
├── sportslights-proxy.js       # ← Run this on your computer!
├── package.json
├── next.config.ts
├── vercel.json
└── README.md
```
