# API access boundary — interim security hardening

This repository is public, but adviser workflows and personal client information are **not** public. The current API has no staff login or session model, so the security branches use a **temporary server-to-server Bearer token** for sensitive reads and state-changing operations. This is a safety measure, not a production-ready multi-user authorization system.

## Access matrix

| Endpoint group | HTTP methods | Interim access |
| --- | --- | --- |
| `/api/healthz` | GET | Public |
| `/api/entries`, `/api/entries/:id` | GET | Public bulletin data |
| `/api/stats/*` | GET | Public aggregate bulletin statistics |
| `/api/clients*` | GET, POST, PATCH, DELETE | Protected |
| `/api/alerts*` | GET, POST, DELETE | Protected |
| `/api/entries/:id/notes*` | GET, POST, PATCH, DELETE | Protected |
| `/api/entries/:id/read`, `/api/entries/:id/bookmark` | PATCH | Protected |
| `/api/sync`, `/api/sync/status` | POST and GET respectively | Protected |

Every protected route uses the same `requireClientApiToken` middleware (despite its historical name). The guard rejects requests **before querying or mutating data**:

- Secret unset, shorter than 32 characters or malformed: **503** (fail closed).
- No Bearer header or incorrect token: **401**.
- Exact configured token: request may proceed to handler; normal input/database errors still apply.
- Comparing digests via `crypto.timingSafeEqual`; secret values are never intentionally logged.
- Client creation and validation no longer echo NIF in logs/error messages.

## Configure for trusted server-side clients only

Generate a high-entropy token on a trusted machine, for example:

```sh
openssl rand -hex 32
```

Store it as **server-only** `BOLETINES_CLIENT_API_TOKEN`. Do **not** commit it, put it in `VITE_*` / `NEXT_PUBLIC_*`, inject it into browser code, copy it into an OpenAPI example, or store it in a browser.

Server-side HTTPS request example:

```sh
curl -H "Authorization: Bearer YOUR_SERVER_SIDE_TOKEN" https://YOUR_HOST/api/clients
```

Use synthetic, disposable records for development. There is **no need for a production token** just to run CI; CI asserts rejection when it is missing.

## Important compatibility warning — do not merge blindly

The current React interface has **no staff identity/session system**. After this patch, unauthenticated frontend actions to manage alerts, notes, read/bookmark state or initiate/manual-inspect sync will return **401 or 503**. The client-management feature is not currently present in the primary navigation. Introducing the shared token in browser JavaScript would be insecure and is prohibited.

Before deploying this to a user-facing environment, decide which staff workflows must remain usable, implement real user sessions and server-side authorization, and verify every affected UI flow. This patch should remain a draft until that is done.

## Validation

The CI workflow runs:

```sh
node --experimental-strip-types --test artifacts/api-server/src/middlewares/clientApiAccess.test.mjs
pnpm run typecheck
PORT=20210 BASE_PATH=/ pnpm run build
cd artifacts/api-server && node --test test/operatorAuthorization.http.test.mjs
```

The last test launches the **built Express application**, checks HTTP response codes for all protected endpoint patterns with a deliberately nonconnecting PostgreSQL URL, and confirms the public health endpoint still responds. It tests denial **before** database access; it does **not** validate successful authorized database operations, real user sessions, CORS rules or tenant-level isolation.

## Remaining security work

- Replace the single token with authenticated staff sessions and scoped roles. Add account/tenant boundaries if multiple firms or users are supported.
- Review broad `cors()`, rate limiting and CSRF/session protection when browser auth is introduced.
- Verify input limits, XML source resiliency and manual sync throttling.
- Review whether any aggregate public endpoint might inadvertently include private state.
- Add database-backed integration tests for allowed requests and for staff cross-account denial.
- Use synthetic data only until end-to-end access control and data handling have been reviewed.

No database changes, hosting settings or public profile changes are made by these security PRs.
