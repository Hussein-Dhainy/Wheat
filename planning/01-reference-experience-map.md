# Reference Experience Map

## Mapping principle

“One-to-one” means matching the reference's **experience grammar**:

- the same narrative count and ordering;
- comparable scroll duration and visual transitions;
- equivalent interaction types;
- a persistent cinematic canvas with overlaid editorial content;
- the same chapter-level navigation model.

It does not mean copying Pioneer trademarks, production copy, 3D models, textures, audio, or proprietary code. All public-facing assets and wording in our build should be original.

## Overall journey

```text
Preloader
   ↓
Landing / invitation to scroll
   ↓
Chapter 1: Science
  1. Genetic foundation → 2. Computer selection → 3. Breeder refinement
   ↓
Chapter 2: Real-world testing
  4. Stress-test interaction → 5. Expanded field trials
   ↓
Chapter 3: Result
  6. Final grain inspection
   ↓
7. Closing actions and references
```

## Global shell

| Element | Reference behavior | Wheat implementation | Confidence |
|---|---|---|---|
| Preloader | Holds entry until critical visual assets are usable. | Branded loader with real byte/asset progress, then a short reveal transition. | Confirmed/Proposed |
| WebGL stage | Persistent full-viewport real-time 3D underneath the story. | One fixed React Three Fiber `Canvas`; scenes are groups in one world rather than separate canvases. | Confirmed/Proposed |
| Story layer | Full-screen HTML headings and body copy appear as scrolling advances. | Semantic `<section>` elements; animation only changes presentation, not content availability. | Confirmed/Proposed |
| Logo | Persistent corner branding and a route back to the start. | Original Wheat project mark; clicking resets to landing. | Observed/Proposed |
| Menu button | Opens a full-screen menu. | Focus-trapped overlay with three chapters and secondary project links. | Confirmed/Proposed |
| Chapter navigation | Science, Real World Testing, Result. | Genetics, Field Testing, Result; selecting one scrolls to its first section. | Confirmed/Proposed |
| Scroll instruction | Landing invites the user to scroll. | Wheel/touch indicator that disappears after first meaningful progress. | Confirmed/Proposed |
| Deep link | Reference supports hashes such as `#result`. | Stable hashes: `#science`, `#testing`, and `#result`; initial load seeks after assets are ready. | Confirmed/Proposed |
| Orientation/compatibility | Reference contains device-rotation and unsupported-WebGL messaging. | Responsive orientation guidance only if the experience truly requires it; otherwise adapt layout. Provide a no-WebGL fallback. | Confirmed/Proposed |

## Landing — invitation

**Reference purpose:** Establish a premium, mysterious tone and introduce the lab-to-field journey.

**Reference content:** A short title, one-sentence premise, and “Scroll to Discover” instruction.

**Proposed wheat scene:**

- A single wheat grain suspended in a dark, atmospheric space.
- Sparse dust/pollen particles reveal depth.
- Subtle pointer parallax makes the grain and camera feel responsive.
- On initial scroll, the camera moves toward/through the grain and transitions into genetic imagery.

**Interaction and motion:** idle rotation, cursor parallax, intro reveal, scroll handoff.

**Acceptance target:** Within five seconds the user understands that scrolling controls a continuous visual story.

## Chapter 1 — Science

### Section 1 — A solid genetic foundation

**Confirmed reference beat:** The story begins with a broad germplasm library. A detail action opens “Explore the Library,” explaining that breeders select from billions of genetic possibilities.

**Proposed wheat translation:** Explain wheat germplasm diversity and the selection of promising parent lines.

**Visual progression:**

- DNA/data strands or connected particles assemble in space.
- Abstract genetic nodes resolve into a collection of wheat grains.
- One candidate grain becomes the visual focus.

**Interactive detail:** Select or hover over genetic nodes to expose small lineage cards. On touch, tap a node. This should be an optional “toy”; the main scroll path must continue without using it.

**Assets:** hero grain model, genetic-node instancing, line shader, small data labels.

**Three.js Journey topics:** particles, buffer geometry, raycasting, shaders, responsive camera.

### Section 2 — Computers reduce the candidates

**Confirmed reference beat:** Large data sets and simulations narrow far more candidates than can be physically field-tested.

**Proposed wheat translation:** Predictive models score potential varieties across simulated environments.

**Visual progression:**

- A large cloud/grid of candidate grains streams through a selection funnel.
- Data pulses pass over candidates.
- Most candidates dim or move away; a small set remains.
- The camera follows the selected group into the next scene.

**Interaction:** Pointer position gently bends the data field; scrolling controls selection progress.

**Assets:** instanced low-poly grains, data ribbons/points, selection glow, abstract environment cards.

**Three.js Journey topics:** instancing, custom attributes, shader animation, performance monitoring.

### Section 3 — Breeders refine the choice

**Confirmed reference beat:** Breeding technology produces purer lines, reduces development time, and narrows the set further.

**Proposed wheat translation:** Controlled crosses and breeder evaluation refine the chosen wheat lines.

**Visual progression:**

- Candidate grains move into a transparent laboratory vessel or selection chamber.
- Pairing/crossing is represented by two streams merging.
- A single seed exits the apparatus and begins to fall toward soil.

**Interaction:** Primarily scroll-directed; pointer adds shallow camera parallax. Avoid adding a separate interaction that distracts before the major field-testing toy.

**Assets:** simplified lab vessel, tubes/frames, animated grain paths, glass material.

**Three.js Journey topics:** GLTF models, animation mixers or GSAP timelines, physically based materials, environment maps.

## Chapter 2 — Real-world testing

### Section 4 — Take it to the field

**Confirmed reference beat:** Candidates undergo rigorous field stress tests. The detail experience offers five conditions: Wind, Drought, Disease, Soil, and Population Density.

**Proposed wheat translation:** Retain the same five-condition structure because each has a clear wheat equivalent.

**Main visual progression:**

- The chosen grain enters soil.
- Roots emerge, followed by the shoot.
- The camera travels upward as the plant grows into a mature wheat stalk.
- The background expands into a plot of plants.

**“Experience the Tests” interaction:**

| Mode | Visual response | Input | Implementation idea |
|---|---|---|---|
| Wind | Stalks bend in gust waves and recover. | Drag strength/direction or hold. | Vertex displacement plus per-instance phase. |
| Drought | Soil dries, color desaturates, leaves curl slightly. | Drag a moisture control. | Material blend and restrained geometry deformation. |
| Disease | Lesions/spots become visible; resistant plants remain healthier. | Sweep a scanner over plants. | Mask texture or shader reveal. |
| Soil | Root system and soil layers become visible. | Move a vertical cutaway. | Clipping plane or cross-section transition. |
| Density | Plot spacing changes and yield proxy updates. | Slider or drag. | Reposition instances using precomputed layouts. |

The detail mode pauses scroll intentionally, has a visible close/back control, supports keyboard input, and restores the exact previous scroll position.

**Assets:** rigged or shader-deformed wheat stalk, roots, soil cross-section, instanced field, condition UI icons, test-specific textures.

**Three.js Journey topics:** deformation shaders, instanced meshes, raycasting, render targets/masks, GUI-like interaction, performance optimization.

### Section 5 — Testing, testing, and more testing

**Confirmed reference beat:** A second year adds more trial locations, larger decision zones, and many more late-stage comparisons.

**Proposed wheat translation:** Move from one plot to a broad network of trial fields across different conditions.

**Visual progression:**

- Pull upward from the test plot to an aerial field.
- Multiply one plot into many tiles/regions.
- Environmental states ripple across the map.
- Weak candidates disappear; the winning variety remains highlighted.
- Transition from aerial rows into a dense golden field.

**Interaction:** Scroll drives camera altitude and field multiplication; pointer slightly tilts the map.

**Assets:** low-cost instanced field, field tiles, terrain/soil plane, regional markers, atmospheric haze.

**Three.js Journey topics:** instancing, level of detail, fog, camera choreography, texture compression.

## Chapter 3 — Result

### Section 6 — The successful grain

**Confirmed reference beat:** Fewer than 0.01% of candidates succeed. The final kernel can be dragged/spun to discover three result areas: Yield, Consistency, and product traits.

**Proposed wheat translation:** A hero wheat grain represents the final variety. Use three original result categories, provisionally:

1. Yield potential
2. Consistency across environments
3. Resilience/quality traits

Final claims must be clearly fictional/demo data unless reliable sources and permissions are supplied.

**Visual progression:**

- The field collapses or resolves into a single highly detailed grain.
- The background returns to a controlled dark/green studio space.
- Genetic/data details subtly overlay the grain.
- Scrolling introduces the success rate and invitation to inspect.

**Interactive detail:**

- Desktop: drag to rotate the grain; hotspots attach to object-space anchors.
- Touch: swipe to rotate; larger hit areas.
- Keyboard: previous/next hotspot controls.
- Reduced motion: static angles and explicit tabs.

**Assets:** high-detail hero grain, baked PBR maps, hotspot anchors, three information panels.

**Three.js Journey topics:** raycasting, drag gestures, quaternion rotation, model optimization, HTML labels tied to 3D positions.

### Section 7 — Closing actions

**Confirmed reference beat:** Signup, territory contact, podcast, main-site links, legal links, and citations. The original forms relied on external systems.

**Front-end-only treatment:**

- Replace conversion forms with non-submitting demo components or omit them.
- If a form is shown for visual fidelity, label it “Demo only” and validate locally; never imply data was sent.
- Include project/about, credits, source references, restart experience, and optional portfolio link.
- End with a visual callback to the opening grain so the narrative feels cyclical.

**Acceptance target:** No control causes a failing network request, and the user has an obvious way to replay the experience.

## Overlays and secondary states

### Main menu

- Full viewport.
- Three chapter links.
- About/credits/references links.
- Clear close action, Escape support, focus trap, and restored focus.
- Selecting a chapter closes the menu and moves to a stable scroll label.

### Detail panels

- Used only for Section 1, Section 4, and Section 6.
- Enter/exit is animated but not dependent on animation completion for accessibility.
- Back button remains in a predictable location.
- Content remains HTML, not texture-rendered text.

### Fallbacks

- WebGL unavailable: show the complete story as a lightweight editorial page with still images.
- Reduced motion: remove camera fly-throughs, inertia, and continuous particles.
- Low quality tier: lower device pixel ratio, field density, shadow quality, and post-processing.
- Lost WebGL context: display a recoverable message and attempt one controlled renderer reset.

## Scroll pacing model

Use normalized global progress from `0` to `1`, then map named ranges. Exact values should be tuned after the first storyboard pass.

| Beat | Initial range | Approximate scroll screens |
|---|---:|---:|
| Landing | 0.00–0.08 | 1.5 |
| Section 1 | 0.08–0.22 | 2.5 |
| Section 2 | 0.22–0.35 | 2.5 |
| Section 3 | 0.35–0.46 | 2.0 |
| Section 4 | 0.46–0.65 | 3.5 |
| Section 5 | 0.65–0.78 | 2.5 |
| Section 6 | 0.78–0.94 | 3.0 |
| Closing | 0.94–1.00 | 1.5 |

Total initial target: approximately 19 viewport heights. This is a tuning baseline, not a hard requirement.

