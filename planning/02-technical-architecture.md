# Technical Architecture

## Chosen stack

| Concern | Tool | Why |
|---|---|---|
| Application | React with JavaScript | Requested stack; component composition for UI and scene systems. |
| Build tool | Vite | Fast local feedback, static production output, straightforward asset handling. |
| 3D renderer | Three.js through `@react-three/fiber` | Three.js capabilities with React lifecycle and composition. |
| 3D helpers | `@react-three/drei` | Loaders, environment helpers, bounds, HTML anchors, and common utilities. |
| Scroll choreography | GSAP + ScrollTrigger | Explicit labelled timelines and precise synchronization between DOM and 3D. |
| Post-processing | `@react-three/postprocessing` | Controlled bloom, vignette, color grading, and depth effects. |
| Shared state | Zustand | Small store for quality tier, active chapter, overlay state, assets-ready, and audio preference. |
| Styling | CSS Modules plus global design tokens | Local component ownership without introducing a heavy UI system. |
| 3D creation | Blender | Original modeling, UVs, baking, rigging, and export. |
| Model optimization | glTF Transform and/or `gltfjsx` | Compression, inspection, pruning, and React component generation where useful. |
| Texture compression | KTX2/Basis Universal | Smaller GPU-ready textures with PNG/JPEG/WebP fallbacks where appropriate. |
| Unit/component tests | Vitest + React Testing Library | Content, controls, state, and utility logic. |
| Browser tests | Playwright | Scroll journey, deep links, overlays, keyboard behavior, mobile emulation, and console errors. |
| Static hosting | Vercel, Netlify, or Cloudflare Pages | No backend is required; deploy the Vite `dist` output. |

Do not pin versions in the planning documents. Pin tested versions in `package.json` when the project is scaffolded.

## Important architectural decision

> **Authorized current override:** The five-scene infinite diagonal prototype uses
> one continuous virtual scene position instead of document scroll. The scoped
> rationale and safeguards are recorded in
> [06-infinite-diagonal-transitions.md](./06-infinite-diagonal-transitions.md).
> The native-scroll guidance below remains the default outside that scene system.

Use **native document scroll as the source of truth**, not a virtual-scroll system in the first implementation.

- The browser owns scroll position, history restoration, keyboard scrolling, and touch behavior.
- ScrollTrigger maps DOM section ranges into scene progress.
- A single `experienceProgress` value drives the master 3D timeline.
- Interactive detail modes temporarily disable only the necessary scroll response, then restore it.
- Smooth-scroll libraries are optional polish and should not be added unless native scroll cannot meet the art direction.

This keeps the practice project understandable and prevents scroll, React state, and 3D state from becoming three competing clocks.

## Rendering model

```text
Browser document scroll
        │
        ▼
GSAP ScrollTrigger + named labels
        │
        ├── DOM section transitions
        ├── camera rig timeline
        ├── scene-group visibility/progress
        └── URL hash/chapter state
                     │
                     ▼
        One persistent R3F Canvas
        ├── Landing/Science group
        ├── Lab/Breeding group
        ├── Field/Testing group
        ├── Result group
        └── shared lighting/effects
```

Avoid remounting the canvas between chapters. Avoid one canvas per section.

## Proposed source layout

```text
src/
  app/
    App.jsx
    routes.js
  experience/
    ExperienceCanvas.jsx
    ExperienceDirector.jsx
    camera/
      CameraRig.jsx
      cameraKeyframes.js
    scenes/
      LandingScene.jsx
      GeneticsScene.jsx
      PredictionScene.jsx
      BreedingScene.jsx
      FieldScene.jsx
      TrialsScene.jsx
      ResultScene.jsx
    interactions/
      GeneticLibrary.jsx
      StressTestLab.jsx
      GrainInspector.jsx
    effects/
      Effects.jsx
    shaders/
  story/
    Story.jsx
    sections/
    copy.js
    timeline.js
  ui/
    Preloader/
    Header/
    Menu/
    DetailOverlay/
    QualityNotice/
    WebGLFallback/
  state/
    useExperienceStore.js
  hooks/
    useQualityTier.js
    useReducedMotion.js
    useChapterHash.js
  assets/
  styles/
    tokens.css
    globals.css
public/
  models/
  textures/
  audio/
```

## Responsibilities

### React/DOM

- Semantic headings, paragraphs, buttons, dialogs, and navigation.
- Layout and responsive typography.
- Accessibility and focus management.
- Scroll height and trigger markers.
- Loading, fallback, and error messaging.
- Content configuration.

### React Three Fiber/Three.js

- Camera, lighting, models, particles, materials, post-processing.
- Object transforms based on normalized progress.
- Raycasting only for truly spatial interactions.
- GPU resource lifecycle and quality scaling.

### GSAP

- Master cinematic timeline with named labels.
- ScrollTrigger connections.
- DOM enter/leave animation.
- Short overlay transitions.

Do not put business/content state inside GSAP. Do not call React state setters every animation frame. Store frequently changing render values in refs or damped R3F values.

## Timeline contract

Create one exported timeline definition containing stable labels:

```js
export const STORY_LABELS = {
  landing: 0,
  genetics: 0.08,
  prediction: 0.22,
  breeding: 0.35,
  fieldTests: 0.46,
  expandedTrials: 0.65,
  result: 0.78,
  closing: 0.94,
}
```

Each scene receives local progress derived from the master progress:

```js
local = clamp((global - start) / (end - start), 0, 1)
```

This makes sections independently testable and prevents large components full of unexplained global progress numbers.

## State model

Keep the shared store small:

```text
assetsStatus: idle | loading | ready | error
experienceProgress: 0..1 (imperative/ref-backed where possible)
activeChapter: landing | science | testing | result | closing
activeOverlay: null | genetics | stress-tests | grain-inspector | menu
qualityTier: high | medium | low | fallback
reducedMotion: boolean
audioEnabled: boolean
hasEntered: boolean
```

Content belongs in data/configuration, not global state.

## Quality tiers

Quality selection should use conservative capability signals, then allow manual override.

| Feature | High | Medium | Low |
|---|---:|---:|---:|
| Device pixel ratio cap | 1.75–2.0 | 1.25–1.5 | 1.0 |
| Field instances | Full | ~60% | ~30% |
| Dynamic shadows | Limited hero shadows | One low-resolution shadow | Off/baked |
| Post-processing | Full restrained stack | Reduced | Color correction only/off |
| Particles | Full | ~50% | ~20% |
| Shader complexity | Full | Reduced iterations | Simplified material |

Measure performance rather than assuming that desktop means powerful and mobile means weak.

## Performance budgets

Initial targets for the production build:

- Initial critical download: ideally under 3 MB compressed.
- Complete experience download: target under 12–15 MB compressed; load later chapters progressively.
- 3D draw calls: target below 100 in ordinary scenes and below 150 at the field peak.
- Texture dimensions: default maximum 2K; 4K only for a justified hero close-up.
- Desktop target: stable 60 fps on a representative mid-range GPU.
- Mobile target: stable 30 fps on a representative mid-range device.
- Canvas DPR: capped and dynamically reducible.
- No unbounded material, geometry, render-target, or event-listener growth while scrolling repeatedly.

Budgets are validation thresholds, not guarantees; record actual measurements in a later performance report.

## Loading strategy

1. Load shell, fonts, poster, and landing grain.
2. Permit entry when the landing and first transition are ready.
3. Preload Chapter 1 during the landing.
4. Preload field assets during Chapter 1.
5. Preload the high-detail result grain during Chapter 2.
6. Cache decoded assets and dispose only when an asset will not be reused.

The progress indicator must reflect real tracked assets. Never animate a fake loader to 100% while required assets are still missing.

## Accessibility

- All story copy is real HTML and follows a sensible heading hierarchy.
- Every spatial interaction has explicit buttons or keyboard equivalents.
- `prefers-reduced-motion` receives a composed, readable version rather than merely slowing animation.
- Menu and detail overlays are accessible dialogs with focus trapping and Escape support.
- Decorative canvas is hidden from accessibility APIs; equivalent story meaning exists in the DOM.
- Contrast meets WCAG AA for essential text and controls.
- Do not block zoom or force device orientation.
- Provide pause/mute controls if audio or continuous autonomous animation is used.

## Front-end-only rules

- No database, server functions, API routes, authentication, or analytics in the practice scope.
- Story copy is local JavaScript/JSON.
- Contact/newsletter forms are either omitted or explicitly marked demo-only.
- No secrets or private keys are placed in Vite environment variables.
- External links are normal links and use safe `rel` attributes when opening new tabs.
- Hosting configuration only needs SPA/hash handling, cache headers, and compression.

## Testing strategy

### Automated

- Utilities: progress-range mapping, quality selection, and hash mapping.
- Components: menu, overlay focus behavior, local form validation, fallbacks.
- Browser smoke paths: first load, complete scroll, chapter deep link, reopen/close each overlay, mobile viewport, reduced-motion context.
- Assert no uncaught page errors or failed local asset requests.

### Visual/manual

- Capture the same viewport checkpoints for every narrative beat.
- Test Chrome, Edge, Firefox, and Safari; include iOS Safari and Android Chrome before calling mobile complete.
- Run at least one throttled-network pass.
- Run at least one low-power/high-DPR device pass.
- Inspect the renderer after repeated chapter jumps for resource leaks.

## Three.js Journey learning map

| Project need | Course area to review/practice |
|---|---|
| Scene/camera/material foundation | Basics, cameras, textures, lights, shadows |
| Wheat models | Blender, imported models, model optimization |
| Scroll story | Animations plus custom GSAP/ScrollTrigger integration |
| Genetic/data field | Particles and custom buffer geometries |
| Crop motion | Shaders and vertex displacement |
| Hotspots | Raycaster and HTML mixed with WebGL |
| Visual polish | Post-processing and realistic rendering |
| React structure | React Three Fiber lessons, Drei, debug patterns |
| Shipping | Performance tips and production/deployment lessons |

The course supplies the rendering techniques. This plan supplies the experience-director architecture that connects those techniques into one scroll narrative.
