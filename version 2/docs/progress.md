# Tasky v2 progress — 5 November 2026

## Implemented and locally tested

- React JS frontend and Node.js / Express backend in separate frontend and backend folders under version 2.
- Independent version 1 archive. Main branch and the existing production domain remain unchanged.
- Upwork-inspired UI developed from a Google Stitch design: responsive homepage, category discovery, task search, loading/empty/error states and keyboard focus treatment.
- Email/password signup/login, cookie sessions, protected pages and logout. Profile editing and persistent profile photos in MongoDB GridFS.
- Task posting, details, search, pagination and editing. Supporting-document upload/download with a 3 MB limit and signed-in download authorization.
- Proposals: submit, review, accept, decline, withdraw, counter-offer and agree on price. Transactional create/accept writes and duplicate-bid protection.
- Dashboard, task completion and conversation history.
- Local WebSocket messaging with authentication, participant checks, retry acknowledgements, idempotent messages, edits and per-user hiding.
- Hosted Ably adapter: authenticated short-lived subscribe-only tokens scoped to each user; message content is persisted in MongoDB before server-side publishing.
- Serverless database connection reuse, reconnection after disconnect, database-backed rate limits, public contact-data filtering, origin checks and production environment validation.
- Google sign-in React UI reuses the existing Tasky Production client. Full interactive sign-in still needs preview-origin verification.

## Infrastructure and observed deployment results

- GitHub branch: codex/tasky-version-2. The initial implementation was pushed as e9d83e8; the completed UI/realtime/deployment work was pushed as 621fa45.
- Separate Vercel project: tasky-v2-testing. No main customer domain attached or promoted.
- Separate MongoDB Atlas development project and free Mumbai cluster: TaskyV2Dev; database tasky_v2. Scoped database account and required indexes are created.
- User approved 0.0.0.0/0 access ONLY on the isolated v2 Atlas development project for Vercel egress. Production Atlas access was not changed.
- Ably app Tasky v2 Development created; restricted backend key stored server-side in the Vercel preview environment. No key is included in React.
- Vercel build issues fixed: development build dependencies, missing Linux Rollup package in the Windows-generated lockfile, and function names containing the space in version 2. A root api/index.js and root vercel.json deploy adapter preserves the requested folder names.
- The preview at https://tasky-v2-testing-hlsuivpz3-sukhpreet-singhs-projects-46c3ca60.vercel.app reached READY. API readiness returned database connected. Chrome verified account creation and task posting against Atlas.
- The Chrome two-account test exposed an idle connection reconnection failure. The fix and regression test pass, and the updated preview successfully handled hosted login, task access, proposal submission, Ably WebSocket connection and message sending.

## Test evidence

npm run check passes. npm test passes both integration tests: full account/task/proposal/message lifecycle and cached database reconnection. Additional assertions cover document upload/download authorization, price negotiations, unauthorized message edits, per-user hiding and user-scoped Ably token capabilities. Automated tests use isolated MongoDB replicas. Chrome separately verified hosted Ably connection and message sending. Simultaneous delivery in two independent customer sessions and the full Google OAuth consent round-trip remain to be checked.

## Current work

1. Finish simultaneous two-session message delivery, mobile and idle/reconnect browser regression testing on the working hosted preview.
2. Validate Google OAuth authorized origins for the v2 test URL without removing version 1 origins.
3. OAuth cleanup inventory completed across all five visible projects: RetailPulse has RetailPulse Web — Production; restropilot-ai has Tasky Production (matches the app configuration); Fingenie, Gemini API and ace-cargo have no OAuth clients. No clearly unused OAuth client was found, so no client was deleted. API keys and service accounts were outside the requested cleanup and were preserved.
4. Keep the v2 branch and deployment/test documentation current; complete review before main-domain promotion.

## Planned or deliberately deferred

- Dodo Payments will be integrated at the end, per the user's instruction. No payment collection, escrow or payouts are currently enabled.
- Complete hosted mobile/session/reconnection testing and resolve any failures before a customer release.
- Finish OAuth cleanup only after identifying a specific unused client and confirming it can be removed.
- Promote v2 to the main customer URL only after the user approves the tested release. Version 1 stays live on main until then.

## Latest working preview

https://tasky-v2-testing-60s38wcw3-sukhpreet-singhs-projects-46c3ca60.vercel.app

Vercel deployment protection remains enabled; the account owner may need to sign in to Vercel. Synthetic preview accounts and one clearly labelled test task were created in the development database for Chrome verification. No real customer or production data was used.
