# Tasky v2 progress — 6 November 2026

## Current status

The agreed non-payment v2 scope is implemented and deployed for preview review. Real Dodo Payments integration and promotion to the customer domain remain deferred. Version 1 stays live on main.

Stable testing address: https://tasky-v2-testing.vercel.app

Application source: 34f3fbae79e6f258cb4537bd3142148250ec16dc on codex/tasky-version-2.
Deployment: dpl_BHzMDidwTAq7oTsgmvhW3rW9PSqk (READY, preview environment).
Canonical deployment: https://tasky-v2-testing-ospivcn95-sukhpreet-singhs-projects-46c3ca60.vercel.app

Later documentation/test-tool commits do not change the deployed application. Deployment protection remains enabled; the owner may need to sign in to Vercel.

## Implemented

- Separate React frontend and Node.js/Express backend under version 2; original application archived under version 1. GitHub work remains on codex/tasky-version-2.
- Final Hamol-inspired design developed with Google Stitch reference work and original Three.js artwork: four scroll-driven orbital chapters, opening planet shells, skill panels, Next/Back controls, drag rotation, pointer cursor and parallax, changing background tint, responsive editorial sections and saved dark/light themes. Pause, reduced-motion handling, keyboard controls, dialog focus management and WebGL fallback are included.
- Email/password accounts, cookie sessions, protected pages, logout and Google sign-in using the existing Tasky client. Profile editing and profile photos stored in GridFS.
- Task posting, details, search, pagination and editing; supporting documents with a 3 MB limit and authenticated download authorization.
- Proposals, acceptance/decline/withdrawal, counter-offers and agreement on price. Transactional acceptance and duplicate-proposal protection.
- Dashboard, participant conversations and persisted messages. Message retries are idempotent; edit permissions and per-user hiding are enforced.
- Hosted Ably WebSockets with short-lived user-scoped subscribe-only credentials. Express authorizes and persists messages before publishing. Local development supports authenticated direct WebSockets.
- Preview payment simulation: declined/successful funding, retries, delivery submission, client approval and simulated release. Agreed prices are authoritative. Transactions prevent duplicate release/completion; wallet balances remain unchanged. Every payment control is labelled as test mode. Actual payment endpoints remain disabled; simulation fails closed in production.
- Serverless database connection reuse and reconnection, database-backed rate limits, origin validation, public contact-data filtering and production configuration validation.

## Infrastructure

Separate tasky-v2-testing Vercel project, isolated Tasky v2 Development Atlas project/free Mumbai cluster TaskyV2Dev/database tasky_v2, scoped database user, and separate Tasky v2 Development Ably app. Server credentials are preview-only and absent from React. Database indexes, including the unique simulated-payment ledger index, are prepared.

The approved development-only all-IP Atlas access supports Vercel outbound connections. Production Atlas and the original production Vercel project were not changed. Root api/index.js and vercel.json adapt the requested folder names for Vercel builds.

The approved stable testing origin is saved in the existing Tasky Production Google client, preserving the version 1 origin and the previously approved canonical preview origin. Chrome verified Google callback to the stable-address dashboard and restored authentication after a full reload on 6 November.

OAuth cleanup inventory covered all five visible Google projects. RetailPulse and Tasky clients are in use; the remaining three projects have no OAuth clients. No clearly unused client was found, so none was deleted. API keys and service accounts were outside the cleanup request.

## Verification completed

- npm run check: passed production frontend build and API syntax checks.
- npm test: 4/4 passed, covering account/project/message lifecycle, database reconnection, production simulation isolation, and simulation permissions/retries/concurrent funding/completion/delivery/release.
- Hosted Chrome test with independent synthetic client and worker sessions: task posting, proposal, counter-offer, price agreement, acceptance, messages received in both directions without refresh, declined simulation, successful retry, worker delivery, owner approval and completed/released test state.
- Hosted Ably verification tool: actual WebSocket delivery, explicit recipient disconnect/reconnect, persisted-history catch-up, renewed authentication, live delivery after reconnect, and retry without a duplicate record.
- Google login and session persistence verified on the stable testing address after the user completed Google's provider step.
- Desktop and 390×844 mobile planet details, Next navigation, Escape close/focus restoration, keyboard opening, and drag without accidental opening verified. Mobile dialog/page/viewport widths all measured 390 px. Theme persistence and scroll chapter changes were checked during the UI work.

Synthetic accounts and clearly labelled test records remain in the isolated development database. No real customer funds, production data or real deliverables were used. Explicit reconnect testing is not a prolonged physical-network outage or load test. The lazy-loaded Three.js bundle still produces a size warning; the build succeeds.

## Remaining work

1. User review of this preview and any requested refinements.
2. Integrate Dodo Payments at the end, replacing simulation only after real provider setup and payment-specific testing.
3. Obtain explicit approval before production promotion or replacing the version 1 customer URL. Before that release, provision production configuration and complete a production release review; the development database and simulated payment mode are not a customer payment setup.

See payment-simulation.md for workflow guarantees, design.md for reference provenance, and release-verification.md for reproducible test details.
