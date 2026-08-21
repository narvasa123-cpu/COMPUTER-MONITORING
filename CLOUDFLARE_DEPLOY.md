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

6. Copy the Worker URL, then set this Netlify environment variable and redeploy the site:

   ```text
   VITE_API_URL=https://computer-monitoring-api.YOUR-SUBDOMAIN.workers.dev
   ```

Confirm the API deployment by opening `https://YOUR-WORKER-URL/api/health`. It should return JSON with `"status":"ok"`.
