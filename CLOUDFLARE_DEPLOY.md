# Cloudflare Deployment

This deployment uses Cloudflare Workers and D1 on the free plan. A payment card is not required for the free tier.

1. Create a free Cloudflare account and run `npm install`.
2. Authenticate with `npx wrangler login`.
3. Create the database:

   ```bash
   npx wrangler d1 create computer-monitoring
   ```

4. Copy the returned `database_id` into `wrangler.jsonc`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
5. Apply the database migration and deploy the API:

   ```bash
   npx wrangler d1 migrations apply computer-monitoring --remote
   npm run worker:deploy
   ```

6. Deploy the complete application. The Worker serves both the Vite frontend and the API on one URL:

   ```bash
   npm run worker:deploy
   ```

Open the Worker URL shown by Wrangler. Confirm `https://YOUR-WORKER-URL/api/health` returns JSON with `"status":"ok"`.

The Cloudflare dashboard exposes errors and request logs under **Workers & Pages -> computer-monitoring-api -> Observability**. For live terminal debugging, run `npx wrangler tail computer-monitoring-api --status error`.
