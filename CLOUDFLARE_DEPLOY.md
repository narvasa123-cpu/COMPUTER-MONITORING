# Cloudflare Deployment

This deployment uses Cloudflare Workers for the site and API, and Supabase Postgres for persistent data.

1. Create a free Cloudflare account and run `npm install`.
2. Authenticate with `npx wrangler login`.
3. In Supabase, open **SQL Editor**, paste and run `supabase/migrations/20260821130000_monitoring_state.sql`.
4. In Supabase, open **Project Settings -> API**, copy the `sb_secret_...` key. Do not use the publishable key for this step.
5. Store the secret in Cloudflare using the interactive prompt, then deploy:

   ```bash
   npx wrangler secret put SUPABASE_SECRET_KEY
   npm run worker:deploy
   ```

Open the Worker URL shown by Wrangler. Confirm `https://YOUR-WORKER-URL/api/health` returns JSON with `"status":"ok"`.

The Cloudflare dashboard exposes errors and request logs under **Workers & Pages -> computer-monitoring-api -> Observability**. For live terminal debugging, run `npx wrangler tail computer-monitoring-api --status error`.
