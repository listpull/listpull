# ListPull website

Static, mobile-first web presence for **ListPull, LLC**, published with ListPull Studio at https://listpull.com/.

## Site map

- `/` — original Blobby's Woodland Wonder hero, game store links, wildlife media and community, with added consumer discovery paths.
- `/labs.html` — product and media hub for Blobby, wildlife, and Studio.
- `/studio.html` — free entry hub for creative production, business insight and AI applications.
- `/studio/image-editor.html` — unified Creative Studio: image editing, vector design, layers, gradients, shadows, cropping, 2.5D effects and exports.
- `/studio/video-editor.html` — browser-native video editor with timeline, titles, media library, audio, voiceover, editing and local video export.
- `/studio/vector.html` — legacy route redirecting into the unified Creative Studio.
- `/studio/strategy.html` — editable Nash equilibrium teaching calculator.
- `/studio/forecast.html` — transparent ARIMA(1,1,0) educational forecast.
- `/studio/ai.html` — integrated IDE, live app preview and optional on-device AI Agent.
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

## Architecture & release readiness

Read `docs/STUDIO_ARCHITECTURE.md` for application modules, browser media technology, licensing, privacy, testing and deployment guidance. Read `docs/ENGINEERING_LABS_LAUNCH.md` for client acquisition, SAM.gov verification, and launch strategy.

**Review and validate draft PR changes before merging into `main`.** Creative projects run without a sign-in, paywall or file-upload server.
