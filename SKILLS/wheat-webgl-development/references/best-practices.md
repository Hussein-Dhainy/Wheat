# React, Three.js, and WebGL Best Practices

## Contents

- React Three Fiber
- Shaders
- Scroll and animation
- Assets and rendering
- Performance
- Interaction and accessibility
- Testing and debugging

## React Three Fiber

- Keep the `Canvas` stable and place scene changes inside it.
- Split scenes by narrative responsibility, not every individual mesh.
- Use `useFrame` for continuous render-side updates and refs for mutable objects.
- Never use `setState` in `useFrame` for animation values.
- Reuse scratch math objects declared outside the frame callback or held in refs.
- Memoize expensive derived geometry/data only when dependencies are stable.
- Share geometries and materials intentionally; avoid accidental per-instance clones.
- Use `Suspense` boundaries and preload only assets needed soon.
- Scope and clean GSAP timelines with `gsap.context` where appropriate.
- Keep DOM/application state outside the scene graph unless the scene truly owns it.
- Avoid mounting/unmounting heavy scenes at exact visible boundaries; preload before entry and retain briefly after exit.

## Shaders

- Define the visual purpose before writing GLSL.
- Keep uniform ownership clear: time, global progress, local progress, pointer, quality, and interaction state.
- Prefer vertex displacement for large repeated motion such as field wind.
- Use per-instance attributes or stable hash functions for variation.
- Avoid high-frequency fragment noise and large loop counts on mobile.
- Minimize transparent overdraw; prefer alpha testing for foliage where acceptable.
- Keep vertex and fragment varyings limited and purposeful.
- Avoid branching on rapidly varying per-fragment values when a mix/step formulation works clearly.
- Clamp and ease normalized inputs to prevent transition discontinuities.
- Test precision qualifiers and extensions on mobile WebGL implementations.
- Preserve Three.js color-space and tone-mapping behavior when using custom materials.
- Supply a low-tier material or reduced shader path for expensive effects.
- Surface shader compilation errors during development; do not hide them behind a blank canvas.

## Scroll and animation

- Treat browser scroll as the primary clock unless a documented decision changes it.
- Convert global progress into local section progress with a shared range utility.
- Use named timeline labels rather than scattered numeric offsets.
- Keep camera motion in a dedicated rig/director.
- Let scenes own secondary motion such as wind, particles, and local reveals.
- Ensure reverse scrolling produces a valid state; do not rely only on one-time callbacks.
- Avoid state changes at razor-thin thresholds that flicker during small scroll reversals.
- Pause or isolate scroll only in explicit detail modes, then restore exact position and focus.
- Respect reduced motion by changing composition/interaction, not merely multiplying duration.

## Assets and rendering

- Export GLB/GLTF with clean transforms, meaningful names, and only required objects/materials.
- Inspect every model outside Blender before integration.
- Compress geometry and textures only after checking visible artifacts at final camera distance.
- Use KTX2/Basis for substantial textures when the pipeline is available.
- Use LODs for hero-to-background reuse.
- Use texture atlases where they reduce materials/draw calls without creating excessive empty pixels.
- Prefer a few shared lights and baked detail over many dynamic lights.
- Restrict dynamic shadows to a small justified set; fields normally use baked/faked grounding.
- Configure color space, tone mapping, and environment intensity consistently.
- Use original or properly licensed models, textures, fonts, HDRIs, and audio.

## Performance

- Measure with representative content and target DPR.
- Track draw calls, triangles, shader cost, texture memory, total transfer, decode time, and frame time.
- Use instancing for repeated geometry.
- Cap DPR and reduce it before removing narrative content.
- Progressively load later chapters.
- Avoid oversized render targets and full-resolution post-processing on weak tiers.
- Prevent object/material creation inside render loops.
- Dispose replaced geometries, materials, textures, and render targets, but do not dispose shared resources prematurely.
- Throttle or disable work for inactive distant scenes.
- Test repeated chapter jumps and overlays for retained resources/listeners.
- Prefer a consistent 30 fps low tier over unstable visual excess.

## Interaction and accessibility

- Put essential text, buttons, links, and dialogs in semantic HTML.
- Provide keyboard controls for drag, spin, hotspot, and slider interactions.
- Provide touch hit areas and avoid hover-only discovery.
- Manage focus on overlay open/close and restore the triggering control.
- Keep visible focus styles and adequate contrast.
- Make instructions input-aware without removing alternative methods.
- Provide a coherent no-WebGL editorial fallback.
- Do not disable browser zoom or globally prevent normal touch gestures.
- Avoid audio autoplay; require user initiation and provide mute.

## Testing and debugging

- Unit-test progress mapping, quality selection, and hash mapping.
- Browser-test full scroll, reverse scroll, chapter links, overlays, keyboard paths, mobile emulation, and reduced motion.
- Fail smoke tests on uncaught page errors and missing local assets.
- Add stable debug controls for global/local progress, camera, quality tier, and bounding helpers, then exclude them from production.
- Use seeded randomness and fixed viewport checkpoints for visual regression.
- Inspect the actual rendered result after visual changes.
- Test throttled loading, high-DPR screens, context loss, resize/orientation changes, and tab visibility changes.
- Run the production build, not only the development server.

