# Playbot developer portal

Public entry point: https://test-automation-pts.github.io/playbot-portal/

The site combines the current presentation, developer documentation, release
snapshots and already-public Allure/PDF demo dashboards. It needs no login,
backend, analytics, CDN or browser-side dependency.

```sh
npm ci
npm test
npm run build
npm run preview
```

To include dashboards locally, clone the `gh-pages` branch of
`Test-Automation-PTS/playbot-demo-reports` and run:

```sh
node scripts/build.mjs --reports ../published-reports
```

Without report input, the site links to the canonical public dashboards and
explicitly says that no local report snapshot is available. It never invents
test counts or release-to-run associations.

## Content ownership

`content/` is an explicit export from the Playbot framework's
`presentation/README.md`, `presentation/portal.json`, five `docs/*.md` pages
and their selected images. Update those sources in the framework MR, then run
`node scripts/export_portal.mjs <this-checkout>/content`. Historical docs are
read from immutable release tags. The manifest records source commits.
The framework's `playbot-presentation` skill and MR checklist maintain this
contract. Private source links are labeled; public documentation is rendered
locally and does not depend on GitHub authentication.

The framework's `Public developer portal` workflow validates the export on PRs
and retains it as a review artifact. Its presentation skill prepares a companion
portal MR with the exported changes and cross-links both MRs. Merging that portal
MR publishes the documentation automatically; no cross-repository key or new
secret is needed. No private code, customer files, credentials or raw private CI
artifacts are imported. The portal workflow checks the public report repository
every 30 minutes (GitHub may delay schedules), builds and deploys GitHub Pages.

Reports are copied with their archive structure intact. The report environment
(`Playbot.version`, `Customer.commit`, `GitHub.run`) is authoritative when the
legacy `publication.json` lags behind. Versions without retained evidence show
an unavailable state instead of links to a different release's results.

Pages uses GitHub's [custom workflow deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
