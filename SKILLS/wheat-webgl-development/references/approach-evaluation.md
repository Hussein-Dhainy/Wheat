# Approach Evaluation

## Contents

- Decision workflow
- Comparison dimensions
- Common project choices
- Experiment protocol
- Decision record template

## Decision workflow

For a material choice, state the outcome in one sentence and list the constraints that actually matter. Generate viable approaches from different families rather than cosmetic variations of one idea.

Examples:

- CPU animation versus vertex-shader animation versus skeletal animation.
- Native scroll plus ScrollTrigger versus Drei `ScrollControls` versus a smooth-scroll engine.
- Instanced geometry versus merged geometry versus impostors/billboards.
- GLTF animation versus GSAP object transforms versus shader-driven deformation.
- Drei `Html` anchors versus DOM overlays projected manually versus canvas sprites.
- Zustand shared state versus local React state versus imperative refs.

Discard an option only for a concrete reason. Do not reject an unfamiliar method solely because it is unfamiliar; investigate whether it fits.

## Comparison dimensions

Use the dimensions relevant to the decision:

| Dimension | Question |
|---|---|
| Experience | Does it produce the intended look and feel? |
| Architecture | Does it preserve one canvas, one scroll clock, and clear ownership? |
| Performance | What are the CPU, GPU, memory, draw-call, and loading costs? |
| Accessibility | Can the same outcome work with keyboard, touch, and reduced motion? |
| Responsiveness | Can it adapt composition and quality across viewport/device classes? |
| Assets | Does it require new models, rigs, textures, baking, or licenses? |
| Complexity | How much custom code, debugging, and specialist knowledge does it add? |
| Maintenance | Will another AI/developer understand and safely change it? |
| Support | Does it work in the target browsers and current dependency versions? |
| Testing | Can it be validated deterministically and visually? |
| Reversibility | Can the project change direction without a rewrite? |

## Common project choices

### Repeated wheat plants

- Start with `InstancedMesh` plus shader deformation.
- Consider merged static geometry only for non-moving distant clusters.
- Consider impostors only after measuring that instancing cannot meet mobile budgets.
- Avoid separate React components/materials for every plant.

### Plant movement

- Prefer vertex-shader wind for large fields.
- Use a rig or morph targets for one hero stalk when art-directed motion is essential.
- Use CPU object transforms only for a small number of foreground objects.
- Test whether one shader can cover both hero and field before maintaining two systems.

### Scroll choreography

- Default to native scroll plus GSAP/ScrollTrigger.
- Consider Drei `ScrollControls` when the experience lives entirely inside a controlled canvas and document semantics/history are not compromised.
- Consider smooth-scroll only when a measured experience requirement justifies its input, accessibility, and restoration complexity.

### 3D labels and hotspots

- Prefer semantic DOM projected from model-space anchors.
- Use Drei `Html` for a few convenient anchors after checking occlusion and layout behavior.
- Use manual projection when labels must participate in the site's normal overlay/focus architecture.
- Avoid canvas text for essential content.

### Scene transitions

- Prefer continuous shared-world camera/group transitions when asset scale permits.
- Use deliberate visual wipes/fades when hiding asset swaps or major coordinate changes.
- Avoid mounting a new canvas for each scene.

### State

- Use local React state for slow UI state owned by one component.
- Use Zustand for cross-cutting modes and preferences.
- Use refs/uniforms for high-frequency animation values.
- Avoid mirroring the same value across all three.

### Shader versus standard material

- Start with standard/physical materials and `onBeforeCompile` or Drei helpers when only a small extension is needed.
- Use `ShaderMaterial` when the visual logic is genuinely custom and benefits from full control.
- Keep a simple material fallback for low tiers when the shader is expensive.
- Validate color management, lighting expectations, and shader compilation on target browsers.

## Experiment protocol

When uncertainty affects architecture or performance:

1. Build the smallest isolated comparison with representative asset counts.
2. Hold camera, viewport, DPR, and quality settings constant.
3. Measure frame time, draw calls, triangles, texture memory where available, and load size.
4. Test at least one representative desktop and mobile quality tier.
5. Inspect the visual result at the final intended camera distance.
6. Record the winner and why; delete or clearly isolate abandoned prototype code.

Do not use a toy count that hides the real cost, such as testing ten plants when the scene needs thousands.

## Decision record template

Use this compact form in a task note, code comment near configuration, or future decision log:

```text
Decision: <outcome>
Constraints: <important constraints>
Options checked: <A>, <B>, [<C>]
Selected: <choice>
Reason: <quality/cost/integration explanation>
Rejected for now: <why the alternatives do not fit>
Revisit when: <measurable trigger, if any>
Validation: <docs, prototype, measurements, tests>
```
