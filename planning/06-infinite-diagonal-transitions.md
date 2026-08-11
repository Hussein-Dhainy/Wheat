# Infinite Diagonal Transition Decision

## Decision

The current experience is a five-scene, viewport-fixed loop driven by one
unbounded virtual scene position. This is an explicit user-approved exception
to the project's native-document-scroll default.

Scene 1 remains the existing landing experience. Scenes 2–5 are registered
placeholders until their final content is implemented. The registry count, not
hard-coded transition pairs, owns wrapping in both directions.

## Constraints

- Preserve the existing Canvas and Scene 1 appearance with minimal refactoring.
- Keep scroll position, scene selection, and transition progress derived from
  one continuous mutable value; do not set React state every frame.
- Render only the two participating scenes and keep scene-local animation
  separate from screen-space compositing.
- Keep meaningful copy as semantic HTML with touch, wheel, keyboard,
  reduced-motion, and no-WebGL paths.
- Do not fake infinity by duplicating scenes in a tall document.

## Options checked

1. **Persistent portal scenes plus two render targets and a fullscreen shader.**
   This isolates scene fog, backgrounds, cameras, and lighting while retaining
   stable scene identity.
2. **Visibility-switched groups in the root scene.** This avoids portals, but
   scene-level fog/background/camera ownership leaks and would require a larger
   Landing Scene refactor.
3. **CSS-only diagonal layers.** This is inexpensive for HTML, but cannot
   composite independent WebGL scenes and does not meet the requested render
   pipeline.

## Selected implementation

Use one persistent R3F portal and camera per registry entry, two reusable native
Three.js `WebGLRenderTarget`s, and one fullscreen diagonal `ShaderMaterial`.
Native targets were selected over Drei's `useFBO` because Drei is not installed
and this feature does not otherwise need that dependency.

The HTML overlay remains semantic and mirrors the same diagonal boundary with
`clip-path`. Only the dominant overlay participates in focus and pointer input.
Inactive portal scenes remain mounted for stable resources but return early
from frame animation and are not rendered.

### Variable-length scene timelines

Each registry scene owns an optional sequence of internal timeline sections:

```js
timeline: {
  sections: [
    { id: 'overview', scrollLength: 1 },
    { id: 'detail', scrollLength: 1.5 },
  ],
  exitTransitionLength: 1,
}
```

Lengths are virtual input distance rather than seconds. Internal sections keep
their major portal scene fully visible and expose normalized scene, section,
and section-progress values through the scene-state ref. The separate exit
segment alone drives the diagonal compositor, so changing content length never
stretches the wipe.

The registry is compiled into one periodic list of section and transition
segments. This was selected over scaling input sensitivity per scene, which
would make mapping depend on input history, and over registering subsections as
scenes, which would add unwanted diagonal wipes and duplicate portal resources.

### Magnetic idle snapping

Wheel and touch input update the unbounded virtual position continuously. After
140 ms without wheel input, the target settles to the nearest semantic scene or
section start; touch holds suppress that idle timer and request the same settle
on release. Arrow, Page, and Space keys advance exactly one semantic stop, even
when configured lengths are fractional. Any new direct input cancels an
in-progress settle, so direction reversal stays immediate. Reduced motion keeps
direct input but applies both movement and the final settle without inertial
interpolation.

The frame-clock idle accumulator was selected over a browser timeout or CSS
scroll snapping. It keeps one timing source, is deterministic in unit tests,
requires no timer cleanup, and works with the viewport-fixed virtual controller.

## Revisit when

- final narrative planning restores more than five scenes;
- native history/deep-link/document-scroll behavior becomes required inside
  this viewport-fixed experience;
- measured FBO memory or fill rate misses the 60 fps desktop / 30 fps mobile
  targets; or
- later spatial interactions require portal-aware raycasting.

## Validation contract

- Unit-test negative modulo, integer seams, Scene 5→1, large positions,
  diagonal endpoint coverage, frame-rate-independent damping, and reversal.
- Browser-check Scene 1 at zero, both directions at the Scene 1/5 seam,
  desktop/mobile resizing, reduced motion, console/network errors, and fixed
  `window.scrollY`.
- Run the production build after shader or render-loop changes.
