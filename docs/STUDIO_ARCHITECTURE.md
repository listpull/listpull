# ListPull Studio — application architecture and release review

## Public product routes

| Route | Product | Primary workflow |
| --- | --- | --- |
| `/` | ListPull homepage | Blobby game, wildlife media, direct Studio access and business services |
| `/studio.html` | Studio hub | Open full creative, video, analytics and AI workspaces |
| `/studio/image-editor.html` | Creative Studio | Edit photos and SVG elements together in one layered artboard |
| `/studio/video-editor.html` | Video Studio | Edit video, images, audio, captions, animated titles and exports |
| `/studio/vector.html` | Redirect | Legacy link to the combined Creative Studio |
| `/studio/ai.html` | Live AI Agent and IDE | Edit a browser app with AI-assisted code changes |
| `/studio/strategy.html` | Business Insights | Sector scenarios, CSV profiling, descriptive outcomes, GPS illustration |
| `/studio/forecast.html` | Forecast Lab | Upload a time series, review a forecast and compare baseline error |
| `/engineering.html`, `/solutions.html` | Engineering | Buyer-facing service and integration information |

## Creative Studio

The raster and vector interfaces have been consolidated. Both types of artwork are editable within one instance of Fabric.js 7.4.0. Fabric.js is distributed under the MIT license. The application uses one artboard for image files, imported SVG objects and layered typography.

Implemented editing controls include: editable artboard width and height, presets and fit/zoom; PNG/JPEG/WebP/SVG import; shape/freehand/text creation; object selection, positioning, scaling, rotating, skew, flip, grouping, copy/paste, layer order/Z and visibility; object alignment; editable typography; solid/linear/radial fill and alpha; shadows; 2.5D stepped extrusions; stroke widths; image crop and several photo filters; local JSON project save/load; undo/redo; PNG/JPEG/WebP/SVG exports; fullscreen editor mode.

The Z coordinate is a **layer stacking value**, while the depth property produces **2.5D layers**. This is not full three-dimensional mesh geometry or volumetric rendering. The visual approach is deliberately kept exportable as conventional 2D design elements.

SVG import runs through a sanitization step to drop scripts and active external references. Test untrusted SVG artwork and imported project JSON further before using them for regulated workflows or making a public security assurance.

## Video Studio

Native browser media elements decode locally provided footage, still images and audio. Canvas 2D composites the timeline, its color looks and animated caption layers. Web Audio connects media to playback and recording. `captureStream()` with `MediaRecorder` handles file export using the formats the browser reports supporting.

Implemented: local import, media library, timeline with footage/images plus caption/title and audio tracks, clip order, in/out trimming, playback speed, split at playhead, scrub, source audio controls, text/title editing and movement, simple transitions, filters, stills, SRT subtitle import, microphone voiceover capture, project JSON, source-file relinking and MP4/WebM export as supported by the runtime.

Browser media encoding is **not identical across environments**. MediaRecorder support, MIME types, memory and GPU/CPU capacity must be validated on target devices. Some projects may require more advanced offline WebCodecs encoding, codec packaging or a separately reviewed licensing arrangement; this release does not falsely claim all browser codecs work on every device.

## AI Creative Agent

Creative Studio and Video Studio offer a real **opt-in on-device language model** through WebGPU and WebLLM. No hosted provider API credentials or customer accounts are required. The visitor intentionally initiates a model download.

- Creative Studio: model proposes a JSON description of editable shapes and text; the person reviews it and applies it to the canvas.
- Video Studio: model proposes a storyboard plus editable titles with timings; the person reviews and applies those changes.
- These workflows generate **editable illustration and media-planning instructions**; they do not claim an integrated photorealistic diffusion image generator or synthetic text-to-video model.

The main AI Workspace also retains its separate code-editing and conversational use case. A person approves generated code before it is run in the sandboxed application preview.

## Full-screen controls

The shared `assets/studio-fullscreen.js` provides whole-editor fullscreen for Creative Studio, Video Studio and the AI IDE, plus a separate Video Studio program monitor fullscreen button. It supports pointer interaction, Escape exit and a CSS full-viewport fallback where the browser's Fullscreen API is unavailable. Canvas rendering size is recalculated when the workspace changes dimensions.

## Privacy, licensing and client workflows

No authentication, server-side media upload or paywall is required for these tools. Imported media lives in the visitor's browser session and remains under that user's control. Local JSON project files and exported media are user-initiated downloads; reopen projects and relink source footage by filename. The browser may download JavaScript or an AI model from third-party distribution endpoints.

The consolidated editor depends on **Fabric.js 7.4.0 (MIT)**. No commercial-key-dependent video SDK is bundled in this release. Both IMG.LY CreativeEditor/VideoEditor and VidStudio products may offer additional tooling, but their respective commercial license conditions must be evaluated before embedding in ListPull.

## Automated verification

- Node syntax: `for file in assets/*.js; do node --check "$file"; done`
- Math/data/site checks: `node --test tests/*.test.cjs`
- End-to-end Chromium journeys: `tests/studio-browser.spec.cjs` (run by `.github/workflows/studio-browser-smoke.yml`).
- Smoke cases cover the original homepage, labs dropdown, design import, editable dimensions/gradients/crops, 2.5D layering, SVG and project exports, fullscreen workspaces, timeline split/title/still/video encoding, analytics, AI IDE interactions and mobile navigation.

For a commercial or enterprise deployment, additionally perform cross-browser video export (including audio), larger-media stress tests, SVG security review, accessibility audit, design usability testing, license checks and device-specific AI model validation. These are engineering release gates, not customer-facing marketing copy.
