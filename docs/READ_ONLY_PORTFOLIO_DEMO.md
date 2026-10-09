# Gestoría Canarias — Safe, read-only portfolio demo

**Purpose:** help recruiters evaluate the frontend and product design without exposing a real client database, connecting to paid services, or enabling unsafe operational API routes.

## How to run it locally

From the repository root, using Node.js 24 and pnpm 10:

```sh
pnpm install --frozen-lockfile
PORT=20210 BASE_PATH=/ VITE_PORTFOLIO_DEMO=true pnpm --filter @workspace/gestoria-canarias run dev
```

Visit `http://localhost:20210`. The demo is **100% browser-side** and does not need `DATABASE_URL`, a running Express API, authentication, real NIFs, feed credentials, or upstream official-bulletin requests.

To build a deployable *static* directory:

```sh
PORT=20210 BASE_PATH=/ VITE_PORTFOLIO_DEMO=true pnpm --filter @workspace/gestoria-canarias run build
node artifacts/gestoria-canarias/scripts/verify-demo-build.mjs
```

Static output: `artifacts/gestoria-canarias/dist/public`. Host this folder only if you intend to provide a public demonstration. Use an ordinary static-hosting setup with SPA fallback only if routes beyond `/` are later introduced; the current demo uses client-side view state and opens on `/`.

**Do not forget `VITE_PORTFOLIO_DEMO=true`.** The normal frontend mode is the original application with API calls, and is **not** safe to expose with real client data.

## Walkthrough

1. **Panel general:** project-level dashboard, source coverage and latest sample bulletins.
2. **Publicaciones:** full-text search, bulletin-source and category filters, fictional publication details and export of **only** synthetic CSV rows.
3. **Relevancia:** select one of three fictional companies to see deterministic, tag-based illustrative matches and clear explanations. The scores in this view do **not** run the actual database-backed matching engine.
4. **Sobre la demo:** inspect privacy boundaries and the underlying architecture.

Every displayed bulletin has an “Ejemplo ficticio” label; entries do not correspond to real notices, real statutory deadlines, real official URLs, or legal advice.

## Strict boundaries

- The demo is **read-only**. It neither calls an API nor stores changes in the browser or database.
- It never mounts the real dashboard, alerts, notes, client records, synchronization controls, or entry-state mutation hooks.
- Search/category/source filters and navigation are transient React state. CSV is generated directly from static, synthetic fixtures.
- The rest of the repo still contains the real backend, full frontend, OpenAPI contracts and Drizzle schema. **This demo does not test or guarantee that those operational paths are secure.**
- The API authorization changes in draft PR #2 and #3 remain separate. Do not bypass them or place server tokens in Vite environment variables.
- The app's original functionality remains the default unless `VITE_PORTFOLIO_DEMO=true` is set at build time. Never use a public production URL for the original app until authorization and data handling are reviewed.

## How this supports the portfolio

**Showcase-worthy:** React/TypeScript frontend architecture, layout, accessible filters, content exploration, informative empty states, export, technical communication, CI and safety-aware demo design.

**Not claimed:** a verified live feed, actual agency client matches, real alerts or synchronization in the static demo, production deployment, SLA, or a production-ready multi-user application.

## Verification

The GitHub Actions workflow `.github/workflows/portfolio-demo.yml` runs synthetic fixture tests, workspace typecheck, a Vite static demo build and source/build checks, then uploads a short-lived static artifact for preview. The artifact is not automatically deployed.

A browser-based usability walkthrough and genuine screenshots are recommended before putting a live URL into your GitHub profile.
