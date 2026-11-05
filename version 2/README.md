# Tasky version 2

React JS frontend, Node.js / Express backend, MongoDB Atlas, and authenticated WebSocket messaging with Ably for Vercel deployments.

- frontend/: React app, UI, API client and messaging transport.
- backend/: Express routes, controllers, models, storage and realtime adapters.
- docs/progress.md: detailed implementation, test evidence, current work and remaining items.
- docs/vercel.md: separate preview deployment instructions.

From version 2: npm install, npm run dev, then open http://localhost:5173. The backend runs on 5002. Existing local backend/.env is configured and ignored by Git; do not overwrite it. Fresh checkouts can copy backend/.env.example and supply their own values. Add ABLY_API_KEY server-side to use hosted messaging locally; without it, local development uses the Node WebSocket server.

npm run check builds React and checks backend entrypoints. npm test verifies the core lifecycle and reconnection behavior using disposable MongoDB replicas. npm run db:prepare creates required database indexes. The first test run may download an official MongoDB binary.

The separate Vercel project builds from the repository ROOT using root vercel.json and root api/index.js. These adapters preserve the version 2 folder name while avoiding spaces in Vercel function names. Keep version 1's main deployment and domain unchanged until v2 is tested and explicitly approved for promotion.

Dodo Payments is intentionally deferred until the final stage. Live payments, escrow and payouts are disabled. See docs/progress.md for what is implemented versus what has been verified on the hosted preview.
