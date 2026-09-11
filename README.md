# Adaptivity Performance (website + portal)

Marketing site, customer/tech web portals, admin dispatch, and Supabase Edge Functions.

GitHub Pages deploys from `.github/workflows/deploy.yml`.

## Native apps (not this repo)

Store / TestFlight builds use Expo + EAS — **not** Capacitor wrapping this site:

- Tech: https://github.com/RealAdaptivity/AdaptivityTechApp
- Customer: https://github.com/RealAdaptivity/AdaptivityCustomerApp

The Capacitor packages, capacitor/Expo config files and the deprecated iOS
workflows have been removed. If a native shell ever loads this site it still
routes straight to the portal — `src/site/nativeShell.ts` detects the injected
`Capacitor` global without the dependency.

## `teams-bot/` should live in its own repo

`teams-bot/` is a standalone Microsoft Teams bot with its own `package.json`,
lockfile and `tsconfig.json`. Nothing in the website imports it, no workflow
here builds or deploys it, and it is not part of the Pages artifact — it only
shares the Supabase project.

Splitting it out is a straight move: copy the directory into a new repo, keep
its `SUPABASE_URL` / service-role env vars, and delete it here. It is left in
place for now so the code is not lost in the move.

## Routing and SEO

`src/site/localSeoData.json` is the single source of truth for service cities,
services, and every indexable local URL. The router, page copy, coverage
checker and `scripts/generate-sitemap.mjs` all read it.

`npm run build` runs two guards that fail the build rather than ship a broken
search surface:

- `scripts/verify-local-seo.mjs` — every sitemap URL round-trips through the
  router's own matcher, no city sits outside the 20-mile radius, ad landings
  never leak into the sitemap.
- `scripts/emit-static-routes.mjs` — writes a real HTML file per route with its
  own title, canonical and JSON-LD, and fails if any sitemap URL would fall
  through to `404.html`. GitHub Pages serves that fallback with an HTTP 404
  status, which makes the URL unindexable.

## Local web

```bash
npm install
npm run dev
```

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
