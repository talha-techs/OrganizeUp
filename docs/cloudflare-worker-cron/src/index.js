/**
 * Cloudflare Worker Cron Trigger for OrganizeUp Due Reminders
 *
 * Runs automatically every minute via Cloudflare Cron Triggers.
 * Wakes up Render (if dormant) and atomically processes due reminders,
 * dispatching Web Push alerts to users' devices.
 */

export default {
  // 1. Recurring Cron Handler (fired every minute by Cloudflare)
  async scheduled(event, env, ctx) {
    const targetUrl = `${env.API_BASE_URL.replace(/\/$/, '')}/api/internal/run-reminders`;

    console.log(`[Cron] Triggering reminders job at: ${targetUrl} (scheduled time: ${new Date(event.scheduledTime).toISOString()})`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': env.CRON_SECRET || '',
        'User-Agent': 'OrganizeUp-Cloudflare-Cron/1.0',
      },
    });

    const status = response.status;
    const bodyText = await response.text();

    if (!response.ok) {
      console.error(`[Cron] Job failed with HTTP ${status}: ${bodyText}`);
      throw new Error(`Cron trigger failed: HTTP ${status} - ${bodyText}`);
    }

    console.log(`[Cron] Successfully processed reminders (HTTP ${status}):`, bodyText);
  },

  // 2. HTTP Fetch Handler (allows manual testing via web browser / curl)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/trigger') {
      const targetUrl = `${env.API_BASE_URL.replace(/\/$/, '')}/api/internal/run-reminders`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': env.CRON_SECRET || '',
          'User-Agent': 'OrganizeUp-Cloudflare-Manual/1.0',
        },
      });

      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        status: 'OK',
        message: 'OrganizeUp Reminders Cron Worker is active.',
        usage: 'POST/GET /trigger to test manually.',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};

