# Client data API — interim protection

This repository is public, but **client data is not public**. The client management endpoints at `/api/clients` and `/api/clients/:id` can return names, NIF values, business data and client-to-publication matches.

## What this branch implements

- Every route under `/api/clients` requires a server-only bearer token.
- A missing or weak `BOLETINES_CLIENT_API_TOKEN` **disables client routes** (HTTP 503).
- A missing or incorrect Authorization header receives HTTP 401.
- Tokens are compared using SHA-256 digests and `crypto.timingSafeEqual` and are not logged.
- Client creation logs no longer record the NIF; validation errors do not echo NIF values.

This is **temporary service-to-service authentication**, not a user/session or role-based permission system. Do not call these protected routes directly from browser JavaScript.

## Local/dev configuration

Create a high-entropy token on a trusted machine (example):

```sh
openssl rand -hex 32
```

Store it in a server-side environment variable named `BOLETINES_CLIENT_API_TOKEN`.
Do **not** store the real value in source control, a `NEXT_PUBLIC_*` variable, a Vite `VITE_*` variable, the OpenAPI examples or local storage.

Call the API from a trusted **server-side** client over HTTPS:

```sh
curl -H "Authorization: Bearer YOUR_SERVER_SIDE_TOKEN" https://YOUR_HOST/api/clients
```

For local testing, use `http://localhost` and a disposable dataset. Never paste a real token into screenshots or PR comments.

## Compatibility and remaining security work

- The React app currently does not expose client administration in its main navigation. If a client UI is added, first introduce a real staff identity provider and secure server-side session/roles. **Never ship the bearer secret to the browser.**
- This patch intentionally blocks clients endpoints until the backend is configured. It does **not** protect all other routes: alerts, notes, publication read-state updates and manual sync still have unrestricted HTTP access. These require an auth/abuse review before any multi-user deployment.
- Review `cors()` (currently allows any origin), reverse-proxy access, rate limits, request logging, and where secrets are stored before hosting this service.
- Use only synthetic data until the entire system is access-controlled and reviewed.
- **No database schema migration** is required for this interim guard.

## Verification

```sh
pnpm --filter @workspace/api-server run test:security
pnpm run typecheck
pnpm run build
```

The tests cover middleware decision paths but are not equivalent to a full HTTP/API integration test with database assertions. Security patches should be reviewed and verified before merging.
