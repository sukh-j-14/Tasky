# Test payment and delivery flow

Scope: local development and the separate tasky-v2-testing Vercel preview. Enable PAYMENT_SIMULATION=true server-side. ENABLE_PAYMENTS stays false. Simulation cannot be enabled in production. Dodo integration is deferred.

1. Client posts a task; freelancer proposes; both may negotiate.
2. Client accepts one proposal. The accepted, negotiated price is authoritative.
3. Client chooses Simulate declined payment or Simulate successful payment. A decline records a test attempt without funding; retry with success is supported. No card, UPI or bank details are collected.
4. Selected freelancer submits a delivery summary and handoff links after simulated funding.
5. Client reviews and approves. Project completion and the simulated release occur in one database transaction.

All payment controls show Simulation only / no real money. Records live in SimulatedPayment, separate from legacy Payment. INR amounts use integer paise. Test operation IDs and state transitions prevent duplicate funding or release on retries. Competing requests serialize on the project; completion increments the freelancer completion count once. Wallet balances never change. The actual provider endpoints always reject requests.

Only the client can fund/approve; only the selected freelancer can deliver; only the two participants can inspect the test ledger. Accepted project terms cannot be edited through the task-edit endpoint. Unique task-ledger index is prepared with npm run db:prepare.

Tests cover production isolation, authentication and participant permissions, agreed price tampering, decline/retry, operation-ID conflicts, concurrent funding and completion, delivery ordering, persisted ledger, single completion count, unchanged wallet balance and disabled real payments.
