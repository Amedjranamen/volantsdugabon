Admin server for Les Volants d'Or

This small Express server allows updating `siteConfig/voteConfig` and sending `sentNotifications` without using Cloud Functions (avoids Blaze).

Quick start (local):

1. Copy your `serviceAccountKey.json` to the project root (or set `SERVICE_ACCOUNT_KEY` env var).
2. Install deps and run:

```bash
cd admin-server
npm install
ADMIN_SERVER_KEY=change-me node index.js
```

3. Call the API:

```bash
curl -X POST "http://localhost:3000/update-vote" \
  -H "Content-Type: application/json" \
  -H "x-api-key: change-me" \
  -d '{"votingEnabled": true, "votingOpenedAt":"2026-06-13T12:00:00Z"}'
```

Deploy to Vercel (recommended for simplicity):

- Create a new Vercel project pointing to this repo.
- Set environment variables in Vercel dashboard: `SERVICE_ACCOUNT_KEY` (you can store JSON as a secret) and `ADMIN_SERVER_KEY`.
- Set the project to use `admin-server/index.js` as the serverless entry (Vercel auto-detects Node serverless). Alternatively create `vercel.json` to route.

Security notes:
- Keep `ADMIN_SERVER_KEY` secret and rotate if leaked.
- Prefer deploying to a platform that supports secret environment variables (Vercel, Render, Railway).
- For extra security, restrict allowed IPs or require JWTs.
