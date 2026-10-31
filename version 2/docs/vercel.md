# Version 2 testing on Vercel

Keep the existing version 1 deployment connected to main. Do not change its root directory, production branch, environment variables or main domain.

Create a SEPARATE Vercel project connected to sukh-j-14/Tasky for testing version 2. Set its Root Directory to `version 2`. Deploy `codex/tasky-version-2` to that project's own .vercel.app URL. Do not attach the main customer domain. Configuration is in version 2/vercel.json: static React build plus one Express API function, placed near Atlas in Mumbai.

## Environment variables

Set these in the separate test project's deployment environment:
- MONGODB_URI: the generated Atlas connection string, transferred securely from ignored backend/.env.
- MONGODB_DB_NAME: tasky_v2.
- JWT_SECRET: a separate random secret of at least 32 characters.
- APP_ORIGIN: exact HTTPS test origin, no trailing slash. List additional approved origins with commas.
- NODE_ENV: production.
- ENABLE_PAYMENTS: false.

Never prefix database credentials or JWT_SECRET with VITE_. Configure Atlas network access for the Vercel function's egress, using an approved fixed-egress option or explicitly approved network policy. This computer's IP is insufficient for Vercel hosting. Do not automatically add 0.0.0.0/0.

Before testing, run npm run db:prepare with the test Atlas environment to create required unique and TTL indexes. This prevents duplicate bids/messages and cleans up rate-limit windows. It creates indexes without dropping existing data; use only the version 2 database. Keep preview and production databases and session secrets separate.

## Messaging blocker

Vercel Functions cannot host the existing persistent WebSocket server. Local messaging still uses the tested authenticated Node WebSocket server. On Vercel the UI explicitly reports live messaging unavailable and disables sending until a managed realtime integration is provisioned and connected. Stored conversations remain readable. Do not consider the deployment ready for customer launch yet.

Vercel account login succeeded. Marketplace discovery returned only Resend email for messaging, which does not meet the WebSocket requirement. A dedicated realtime provider account (such as Ably or Pusher) must be selected and provisioned before implementing its authenticated transport for public launch. No unprovisioned provider SDK or mock service was added.

## Test before promotion

Run npm ci, npm run check, npm test. Verify /api/ready returns connected on the deployed URL. Then test two distinct customer accounts: signup, profile image, task post/edit/search, proposal submission/duplicate rejection, accept/decline/withdraw, task completion, privacy restrictions and live message history/delivery once the realtime provider is integrated. Test on mobile and verify expiry/logout. Payment collection remains unavailable.

After version 2 passes your review, explicitly approve moving the main domain. That is a separate promotion step; pushing this branch does not replace version 1. No production deployment has been performed by this work.

