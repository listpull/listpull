# ListPull website

Static, mobile-first web presence for **ListPull, LLC**, published with ListPull Studio at https://listpull.com/.

## Site map

- `/` — original Blobby's Woodland Wonder hero, game store links, wildlife media and community, with added consumer discovery paths.
- `/labs.html` — product and media hub for Blobby, wildlife, and Studio.
- `/studio.html` — free creative Studio hub with the image editor embedded.
- `/studio/vector.html` — dependency-free, local-first vector creation preview.
- `/studio/strategy.html` — editable Nash equilibrium teaching calculator.
- `/studio/forecast.html` — transparent ARIMA(1,1,0) educational forecast.
- `/studio/ai.html` — grounded retrieval, optional opt-in local WebGPU model, and safe Fiddle code experiments.
- `/solutions.html` — dedicated client-oriented ListPull Engineering marketing landing page.
- `/engineering.html` — consulting capabilities, engagement approach, and founder-experience attribution.
- Existing Blobby, wiki, support, legal, and contact routes remain unchanged.

## Development

No Node build or hosted API is required to serve the site. For local routing, run a static HTTP server at the repository root:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000/` and the URLs above. ListPull Studio publishes the root of the configured deployment branch.

## Checks

Requires Node 22 (built-in test runner only; no npm dependencies):

```sh
node --test tests/*.test.cjs
for file in assets/*.js; do node --check "$file"; done
```

Automated static/math/data/SEO checks run in `.github/workflows/studio-checks.yml`; a separate Chromium journey test is in `.github/workflows/studio-browser-smoke.yml` and requires Playwright dependencies in GitHub Actions.

## Architecture, provenance & release readiness

Read `docs/STUDIO_ARCHITECTURE.md` for explicit implemented-vs-planned capabilities, privacy boundaries, references to the separate private SVG editor and ListPull Studio systems, and the pre-merge manual browser checklist. Read `docs/ENGINEERING_LABS_LAUNCH.md` for client acquisition, SAM.gov verification, and launch strategy.

**Do not merge draft PR changes into `main` until the site owner has reviewed them.** Publicly hosted examples are previews—not production security certifications or federal contract claims.
