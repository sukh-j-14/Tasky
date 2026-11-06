# Hosted verification — 6 November 2026

Preview: https://tasky-v2-testing.vercel.app
Application commit: 34f3fbae79e6f258cb4537bd3142148250ec16dc
Deployment: dpl_BHzMDidwTAq7oTsgmvhW3rW9PSqk

## Results

| Area | Evidence | Result |
| --- | --- | --- |
| Build | npm run check in version 2 | Passed |
| Integration | npm test in version 2; isolated MongoDB replicas | 4/4 passed |
| Hosted marketplace | Two independent Chrome sessions; separate hostnames/cookie stores | Post, propose, negotiate, accept passed |
| Hosted chat | Client and freelancer received each other's messages without refreshing | Passed |
| Hosted recovery | Ably WebSocket test tool below | Disconnect/reconnect, history, renewed auth and deduplication passed |
| Simulated workflow | Decline, successful retry, delivery, approval | Completed; simulated release at agreed INR 1,250; no real money |
| Google identity | Stable-address dashboard after provider completion, then full reload | Authenticated session restored |
| Planet interactions | Desktop drag, keyboard open, mobile 390×844 Next, Escape | Passed; no horizontal overflow |

Synthetic task: 6aed8eb33b65792369aba460. Synthetic conversation: 6aed8ecac707c91c638303cd. These identifiers refer only to the isolated development database.

## Reproduce hosted messaging verification

Use backend/scripts/verify-hosted-realtime.cjs from the version 2 working directory with an installed, authenticated Vercel CLI. Supply TASKY_PREVIEW_TEST_PASSWORD through the process environment for the existing synthetic accounts; do not place a password in a command argument, commit, or report.

Arguments in order: stable testing origin, installed Vercel CLI JavaScript entrypoint, synthetic conversation ID. The origin is deliberately restricted to the separate testing address. The tool stores temporary cookie jars and API responses outside the repository, removes them on exit, and prints only test outcomes. It never reads the server Ably key: each authenticated user receives a scoped token through the app endpoint.

The check opens independent client and worker sessions, verifies live delivery, explicitly closes/reopens the recipient connection, checks saved history, requests renewed authentication, verifies another live event and retries its operation ID to confirm exactly one saved message. It writes clearly labelled synthetic messages to the test conversation.

## Limits and release boundary

This verifies explicit reconnect and refreshed credentials, not a prolonged physical-network outage, load capacity, or payment provider. The site remains a protected preview using development services. Real payments and customer-domain promotion are deferred. Version 1/main is unchanged.
