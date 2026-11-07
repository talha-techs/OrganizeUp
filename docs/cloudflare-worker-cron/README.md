# OrganizeUp — Cloudflare Worker Reminder Cron

This directory contains a complete, ready-to-deploy Cloudflare Worker that triggers OrganizeUp's `/api/internal/run-reminders` endpoint every minute using Cloudflare's free Cron Triggers.

---

## Why Use an External Cron?

- **Render Free Tier Sleep:** Free-tier services on Render spin down after 15 minutes of inactivity. Cloudflare Workers run on Cloudflare's global edge network independently, waking the server and firing reminders precisely on schedule.
- **Reliability:** Internal Node `setInterval` timers stop when a server sleeps or restarts. Cloudflare Workers ensure reminders are evaluated every single minute without relying on in-process memory.

---

## Prerequisites

1. A free [Cloudflare Account](https://dash.cloudflare.com/).
2. [Node.js](https://nodejs.org/) installed locally.
3. Your Render server URL (e.g. `https://organizeup-api.onrender.com`).
4. A secure random string for `CRON_SECRET`.

---

## Deployment Steps

### 1. Configure URL in `wrangler.toml`

Open `wrangler.toml` in this folder and update `API_BASE_URL` with your Render backend URL:

```toml
[vars]
API_BASE_URL = "https://your-organizeup-api.onrender.com"
```

### 2. Login to Cloudflare via Wrangler

From this directory, authenticate with your Cloudflare account:

```bash
npx wrangler login
```

### 3. Store CRON_SECRET as an Encrypted Secret

Never put secrets in plain text files. Store `CRON_SECRET` securely in Cloudflare:

```bash
npx wrangler secret put CRON_SECRET
```
*When prompted, paste the exact same `CRON_SECRET` that you added to your Render Environment Variables.*

### 4. Deploy the Worker

Deploy the cron worker to Cloudflare:

```bash
npx wrangler deploy
```

Once deployed, Cloudflare will automatically trigger `scheduled()` every minute (`* * * * *`).

---

## Testing

1. **Manual Trigger via Browser:**
   Visit `https://<your-worker-subdomain>.workers.dev/trigger` to trigger a reminder cycle immediately and view the JSON response.
2. **View Live Logs in Real Time:**
   ```bash
   npx wrangler tail
   ```

---

## Alternative: Free Fallback via Cron-Job.org

If you prefer a zero-code web UI over Cloudflare Workers:
1. Create a free account at [cron-job.org](https://cron-job.org).
2. Click **Create Cronjob**.
3. **URL:** `https://your-api.onrender.com/api/internal/run-reminders`
4. **Execution Schedule:** Every 1 minute (or every 2 minutes).
5. **Request Method:** `POST`
6. **Headers:**
   - Name: `x-cron-secret`
   - Value: `<your-cron-secret-value>`
7. Save the job.

