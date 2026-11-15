# ListPull website and Studio — product architecture & release notes

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
| `studio/forecast.html` | Synthetic samples, input series, simple in-browser ARIMA(1,1,0) OLS approximation, visualization, CSV export | Illustrative uncertainty bands; not equivalent to full Neubra model training/caching |
| `studio/ai.html` | Local toy-corpus retrieval, source scoring, evidence display, grounded prompt construction and copy | No live LLM, private data search, or API credentials |

## Source relationship and technical decisions

- The separate private **`listpull/svg-editor`** currently contains a React 18/Fabric 3.x editor, with selection, shapes, drawing, image upload, history and SVG/PNG/JPEG export. Its older `react-scripts`/Fabric dependencies make a direct unreviewed production deployment unwise. The public Vector Studio is an independent, dependency-free implementation of a subset of capabilities; it does not copy private application source or expose private assets.
- The private **Neubra Electron** Nash engine has best-response support solving and regret diagnostics. The public educational Strategy Lab uses a smaller tested 2×2 pure/mixed solver. It does not copy derivatives, market assumptions or internal data.
- Neubra's ARIMA service uses a Node `arima` dependency and caches trained models. The public forecast is a **separate minimal** ARIMA(1,1,0) demonstration, not a browser port of the production research code.
- Neubra's Fiddle AI assistant calls an Electron preload bridge (`window.electronAPI.aiExecute`). A static site cannot provide equivalent privileged functionality. The public AI Lab demonstrates evidence retrieval and prompt assembly without connecting to an external model.

## Security and privacy

- The website is deployed as static pages. No passwords, external model API keys, financial credentials or server secrets are requested or persisted.
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
