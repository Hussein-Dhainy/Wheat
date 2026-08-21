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
  leadingHoldLength: 0.75,
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

An optional `leadingHoldLength` adds fully visible scroll padding before a
scene's normal anchor without creating a narrative section or another portal.
Both ends are semantic snap positions, and the first scene starts at its normal
anchor after the hold. This lets reverse scrolling traverse scene-local camera
choreography before reaching the previous scene's diagonal transition.

The registry is compiled into one periodic list of section and transition
segments. This was selected over scaling input sensitivity per scene, which
would make mapping depend on input history, and over registering subsections as
scenes, which would add unwanted diagonal wipes and duplicate portal resources.

### Continuous motion through transitions

Narrative `progress` remains clamped from 0 to 1 so a diagonal wipe cannot
prematurely trigger content stages or interactions. Each active scene also
receives `motionProgress` and `transitionMotionOffset`. During a wipe, the
outgoing scene continues beyond 1 while the incoming scene advances from a
small negative value to 0. The same values run backward when input reverses.

Per-scene `transitionMotion.entryDistance` and `exitDistance` values live in
the timeline configuration. Cameras and decorative spatial systems consume
`motionProgress`; narrative thresholds continue consuming `progress`. HTML
overlay layers use the normalized transition offset for a matching restrained
vertical continuation without introducing another animation clock.

### Continuous scene input with transition settling

Wheel and touch input add directly to one unbounded target position. The
displayed position follows that target with frame-rate-independent damping. A
user may stop at any point in scene content, and reverse input retraces the same
positions without first releasing a detent.

Scene edges do not consume input and there are no directional resistance values,
or scene-local snap ranges. This keeps notched wheels, high-resolution trackpads,
and touch drags on the same continuous path. The diagonal wipe itself is a
pass-through region: after wheel input pauses there, a short frame-clock delay
settles with a faster damping rate to the closest fully visible endpoint. Touch
performs the same settle on release. The midpoint follows the input direction so
an exact tie remains predictable. Beginning a new touch gesture adopts the exact
displayed frame as its target so delayed catch-up from a previous gesture cannot
move underneath the finger.

Keyboard and menu navigation retain deliberate destinations. Arrow, Page, and
Space keys advance in smaller increments through scenes configured with
`freeScroll: true`, then complete only the nearby diagonal transition. Scenes
without long internal content use semantic scene stops. Menu jumps still animate
to the selected scene start. Any wheel or touch input cancels an in-progress
keyboard or menu settle from the currently displayed frame.

Reduced motion uses the same continuous direct-input positions and transition
endpoints but applies them without interpolation. A velocity-and-friction model
may replace target damping later if testing shows that physical flick momentum
is worth the additional tuning; it is not required for transition-only settling.

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
