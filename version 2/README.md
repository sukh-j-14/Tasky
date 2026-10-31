# Tasky version 2

React JS frontend, Node.js / Express backend, MongoDB Atlas database, and authenticated WebSocket messaging. The UI follows the Upwork reference and the Google Stitch concept recorded in docs/design.md.

## Structure

- frontend/: React pages, account state, API client, WebSocket client and responsive styles.
- backend/: Express routes, controllers, MongoDB models, chat service and WebSocket server.
- backend/tests/: integration test using a disposable local MongoDB instance.
- docs/: design provenance and infrastructure notes.

## Run

From version 2, run npm install, then npm run dev. Open http://localhost:5173. The frontend runs on 5173 and proxies /api, /uploads and /ws to the backend on 5002.

The local backend/.env has been configured for the new Atlas development cluster and is ignored by Git. Do not overwrite it with the example file. A fresh checkout requires copying backend/.env.example to backend/.env and supplying database credentials and a random JWT_SECRET. Add the connecting computer's public IP to the Atlas project's network access list before starting the backend. APP_ORIGIN must list the exact browser origin; production requires HTTPS origins and NODE_ENV=production.

npm run check checks API entrypoints and builds React. npm test exercises the full account/project/chat lifecycle against an isolated MongoDB database; its first run downloads an official MongoDB binary. npm run build builds React. npm start serves the API, WebSocket endpoint and built React files on port 5002. For Vercel setup and the remaining realtime integration blocker, see docs/vercel.md. Local development supports the existing WebSocket server; Vercel requires a managed realtime integration before launch.

## Implemented

- Email/password signup, login, cookie sessions, protected pages and logout.
- Profile editing and profile image upload.
- Task search, pagination, task details, posting and editing.
- Dashboard showing posted projects and proposals.
- Proposal creation, review, acceptance, decline and withdrawal; task completion.
- Conversation list, stored message history, WebSocket send/delivery, automatic reconnection, acknowledgements and duplicate-send protection.
- Origin checks and conversation membership checks. Public task responses exclude contact details. Version 1 remains preserved independently.

## Validation and limits

Integration tests cover signup/login, profile updates, task posting/search, owner restrictions, proposals, acceptance/completion, persisted live messages, duplicate retry, outsider denial, origin denial and socket closure on logout. Browser checks confirmed React signup, dashboard navigation and project posting through to its detail page. Frontend production build passes.

Atlas project, free cluster and scoped database user are created. Live Atlas connectivity remains unverified until this computer is added to the network access list. Integration and browser tests used isolated local MongoDB, not Atlas or production data.

Google authentication remains available in the backend but its React sign-in UI and OAuth client configuration are pending. Supporting document upload, price negotiation and message edit/delete APIs are retained in the backend; their React controls are pending. Payments remain disabled; no payment provider or production deployment is configured. The separate Vercel testing configuration is included. Profile images are stored in MongoDB GridFS and work without persistent local disk. Proposal creation and acceptance use MongoDB transactions; prepare database indexes with npm run db:prepare. Live chat broadcasts run in one Node process; multiple backend replicas would require a shared event transport.

