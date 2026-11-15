# ListPull website and Studio — product architecture & release notes

## Guided visitor workflows (expanded November 15, 2026)

**Who this is for:** prospective clients, product owners, artists and analysts who may not know data-science jargon. The page now starts with recognizable tasks before expert controls.

- **Strategy & data discovery:** eight synthetic one-click sample industries; 3 MB/5,000-row local CSV import; automatic numeric, categorical and date field profiling; column completeness; suggested mappings; group averages/medians; observed categorical success rates with Wilson intervals (independence assumption); inventory-balance sensitivity with adjustable demand; and an optional empirical 2×2 Nash payoff matrix if both actors' actions and rewards are observed in all combinations. A report can be exported as JSON. The app cannot identify causes or validate future forecasts from observational snapshots.
- **Forecasting:** CSV upload and numeric field selection; optional time sorting; last 120 valid records; baseline ARIMA(1,1,0) OLS-style projection; sample scenarios; CSV output; and a simple held-out evaluation using mean absolute error compared to repeating the last observation. Warnings are shown when a simple baseline performs at least as well. Uncertainty bands remain illustrative rather than calibrated.
- **Image:** click-to-try product/social/nature looks; compare with unfiltered source; choose fitting or crop-to-fill; download actual 1080-square, 1200×630 website, 1280×720 thumbnail, 1080×1350 portrait, or native-size PNG. No private uploads.
- **Vector:** template designs for marketplace badges, nature stickers, and promotional layouts; editable layers; size presets for social and ecommerce deliverables. SVG remains scalable. No PDF/CMYK printing system or vetted SVG import is promised.
- **AI + Fiddle:** existing deterministic citation-focused retrieval remains the default. If the visitor explicitly opts in and has WebGPU support, an external WebLLM package/model can be downloaded to run local inference without API keys. Real models may be large, may fail on weak devices, and can produce incorrect answers. New Fiddle runs HTML/CSS/JavaScript templates in a **sandboxed iframe with network-blocking CSP**; the ListPull Studio bridge and sensitive ListPull Studio stock data are not copied to the public website.

**Health and wildlife limitations:** aggregated health examples compare case counts; no contact-tracing, diagnosis, or epidemiological prediction is supplied. Wildlife examples compare observed sightings; they do not estimate future animal trajectories.

**Demo data privacy:** CSV files are read in the browser and stay in memory for the current page; only aggregate outputs/downloads are generated. Do not load regulated or identifiable datasets on public/shared devices; browser extensions, third-party scripts and exported files may still have their own privacy implications.

**Verification:** `tests/studio-data.test.cjs` covers schema and analytic fixtures. `tests/studio-browser.spec.cjs` runs smoke tests in Chromium via `.github/workflows/studio-browser-smoke.yml`; a successful browser test is not a full security, accessibility or model-validation audit.

## Audience strategy (November 2026)

**Root `/`: keep the original public-facing ListPull experience.**
The Blobby hero, platform download links, wildlife card grid and community section are retained. An accessible orange **ListPull Labs** dropdown links to the game, Labs index, wildlife media and Studio. Mobile-friendly Play / Create / Explore shortcuts appear in the hero. A new three-product `section-labs` and engineering `cta-panel` offer more discovery without displacing the primary consumer audiences.

**Business buyers:** `/solutions.html` preserves the engineering-first landing design. `/engineering.html` describes service capabilities and attribution. Previous Accenture/BAE/public-sector work is labeled as the **founder's prior employment experience**, not ListPull corporate contracts. No current SAM registration or government awards are claimed.

**Creative audiences:** `/labs.html` is a real product overview. `/studio.html` launches working client-side demos and embeds the image editor.

## Public browser tools (static hosting, no backend)

| URL | Current functionality | Limits |
| --- | --- | --- |
| `studio.html` | Upload image, brightness/contrast/saturation/grayscale, rotation, flip, caption, PNG export | Raster-only; no crop, full layers, or video export |
| `studio/vector.html` | Shape and text layers, local image placement, select/move, properties, stacking, history, undo/redo, browser autosave, JSON project, SVG/PNG export, keyboard commands | No path-node editor, groups, collaboration, SVG import, or secure cloud projects |
| `studio/strategy.html` | Configurable 2×2 game, synthetic multi-domain payoffs, pure/mixed equilibrium, expected utility, regret diagnostics, JSON export | No generalized matrix-size support or complete equilibrium-continuum enumeration; not a decision recommendation |
| `studio/forecast.html` | Synthetic samples, input series, simple in-browser ARIMA(1,1,0) OLS approximation, visualization, CSV export | Illustrative uncertainty bands; not equivalent to full ListPull Studio model training/caching |
| `studio/ai.html` | Grounded retrieval plus optional opt-in WebGPU model; isolated, editable Fiddle demos | No hosted AI, API-key collection, private data search, or guarantees |

## Source relationship and technical decisions

- The separate private **`listpull/ListPull Studio`** currently contains a React 18/ListPull Studio.x editor, with selection, shapes, drawing, image upload, history and SVG/PNG/JPEG export. Its older `ListPull Studio`/Fabric dependencies make a direct unreviewed production deployment unwise. The public Vector Studio is an independent, dependency-free implementation of a subset of capabilities; it does not copy private application source or expose private assets.
- The private **ListPull Studio ListPull Studio** Nash engine has best-response support solving and regret diagnostics. The public educational Strategy Lab uses a smaller tested 2×2 pure/mixed solver. It does not copy derivatives, market assumptions or internal data.
- ListPull Studio's ARIMA service uses a Node `arima` dependency and caches trained models. The public forecast is a **separate minimal** ARIMA(1,1,0) demonstration, not a browser port of the production research code.
- ListPull Studio's Fiddle AI assistant calls an ListPull Studio preload bridge (`window.ListPull StudioAPI.aiExecute`). A static site cannot provide equivalent privileged functionality. The public AI Lab now has an optional WebGPU/WebLLM model path (only on explicit user action) and a retrieval-only fallback. It does not use ListPull Studio IPC or any production ListPull Studio agents.

## Security and privacy

- The website is deployed as static pages. No passwords, external model API keys, financial credentials or server secrets are requested or persisted. Opt-in WebLLM fetches model assets and JavaScript from external hosts, but performs supported inference locally in the browser.
- OpenAI's documented key safety guidance explicitly says not to expose API secrets in a public browser. For true BYO-model integrations, plan a **trusted, authenticated backend** with rate limiting, audit logs, access controls and short-lived scoped credentials as appropriate. Do not use a public browser input for raw model API keys.
- Vector Studio accepts raster PNG/JPEG/WebP input with file-size and pixel limits, builds SVG only from whitelisted internal shapes, and validates JSON projects. It does **not** ingest arbitrary executable SVG. Generated graphics and image editors stay client-side. Browser autosave uses device-local storage, which may be accessible to another person using the same browser profile: do not work with confidential assets on shared devices.
- The AI workflow renders retrieved passages and user prompts as text, not raw HTML, to avoid introducing script injection paths from model/source responses.
- All application demos are proof-of-capability previews. Terms like **enterprise-grade**, security certification, SOC 2, 508 compliance, government authority-to-operate, guaranteed accuracy, and multi-user readiness must **not** be advertised without evidence.

## Automated and manual validation

CI: `.github/workflows/studio-checks.yml` runs Node syntax checks and `tests/studio-math.test.cjs` (Nash payoff fixtures, ARIMA baseline, required pages). Browser and end-to-end tests remain necessary before approval.

- [ ] Verify GitHub Actions on the draft PR and resolve failures.
- [ ] Compare the homepage against the live `main` site visually; check Blobby, wildlife/social, nav menu and direct app store links.
- [ ] Test widths 320, 360, 390, 768 and 1440 pixels; portrait and landscape, keyboard navigation and focus indicators.
- [ ] Test Vector on desktop and mobile for drag/pointer capture, zoom, high-DPI PNG, SVG import into external software, saved projects, undo and redo.
- [ ] Test Studio image uploads and exports on recent Safari, Firefox and Chrome; confirm local-only processing.
- [ ] Test numerical edge cases, model warnings, user-modified payoff matrices, and exported JSON/CSV.
- [ ] Verify e-mail address, entity name, privacy/legal pages, social and legacy Blobby links.
- [ ] Commission accessibility, security and performance audits before claiming enterprise production readiness.
- [ ] Obtain explicit owner approval before merging the draft PR to `main`.

## Follow-on product work

1. **Vector**: extend shape support, precision snapping/guides, pen/path editing, alignment, editable SVG import with a vetted sanitizer, stable serialization and autosave version migrations.
2. **Image**: non-destructive layer-based adjustments, crop/resize, batch export, WebP, accessible shortcut help and memory pressure testing.
3. **Video**: feasibility prototype for trimming, captions, timeline, worker-based encoding, format/browser support and user-visible file size limits; NOT shipped.
4. **AI**: secure backend/edge service, opt-in auth, private data retrieval with tenant isolation, evaluation harness and human review.
5. **Multi-user**: only after an access-control design, audit trails, document storage policy and technical security review.
