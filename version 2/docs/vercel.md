# Vercel test deployment

Keep the existing Tasky/version 1 Vercel project and main domain unchanged.

The separate tasky-v2-testing project now builds from the repository ROOT. Root api/index.js is a thin adapter for version 2/backend; root vercel.json installs/builds the version 2 workspace and serves version 2/frontend/dist. This avoids Vercel's rejection of a serverless function name containing the space in version 2.

Use preview deployments of codex/tasky-version-2, with encrypted/sensitive preview variables: MONGODB_URI, MONGODB_DB_NAME=tasky_v2, JWT_SECRET, GOOGLE_CLIENT_ID (reused Tasky Production client), APP_ORIGIN, ABLY_API_KEY, NODE_ENV=production, ENABLE_PAYMENTS=false. Never put credentials in VITE_ variables. Preview origins are additionally derived from Vercel's own deployment/branch URL environment values.

The Atlas v2 development cluster's all-IP network policy was explicitly approved for Vercel egress. It does not apply to the production Atlas project. Index preparation completed on tasky_v2.

Ably delivers live updates using WebSockets. Express persists and authorizes every message; browser tokens can only subscribe to the requesting user's channel. Local development can continue using the direct Node WebSocket server when no ABLY_API_KEY is set.

Run npm ci --include=dev, npm run check and npm test in version 2. The lockfile contains Linux as well as Windows native build packages. Run npm run db:prepare against only the intended database when preparing indexes.

A READY preview and hosted signup/login, task posting/access, proposal submission, Ably connection and message sending have been observed. The reconnection regression test passes. Complete simultaneous two-session delivery, mobile/idle regression and full Google sign-in testing before calling the app ready for customers. Dodo Payments is deferred until the end by user instruction.

Promotion to the main domain remains a separate, explicit approval step. See progress.md for the detailed current implementation and validation status.
