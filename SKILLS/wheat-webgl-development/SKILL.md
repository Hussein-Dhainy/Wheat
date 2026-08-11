---
name: wheat-webgl-development
description: Design, implement, review, debug, or optimize the front-end-only Wheat WebGL website using React, JavaScript, Three.js, React Three Fiber, shaders, scroll choreography, and original 3D assets. Use for any task affecting the Wheat website's architecture, scenes, interactions, animation, assets, performance, accessibility, testing, or technical decisions. Require comparison of viable implementation approaches before material changes.
---

# Wheat WebGL Development

## Start with project context

Read the applicable source-of-truth documents before acting:

1. Read `planning/README.md` for scope and document routing.
2. Read `planning/01-reference-experience-map.md` for narrative or interaction work.
3. Read `planning/02-technical-architecture.md` for architecture, state, rendering, loading, testing, or deployment work.
4. Read `planning/03-assets-and-content-plan.md` for models, textures, shaders, copy, audio, or asset-pipeline work.
5. Read `planning/04-ai-implementation-brief.md` before implementation or review.
6. Read `planning/05-roadmap-and-acceptance.md` when selecting work or judging completion.

Treat the project as an original wheat-themed practice experience inspired by the structure of Pioneer — Corn. Revolutionized. Never copy its source code, assets, trademarks, claims, or production copy.

## Compare approaches before material changes

Do not immediately implement the first workable idea. For every material technical, visual, interaction, or asset decision:

1. Define the actual constraint and desired outcome.
2. Identify at least two viable approaches. Include a third when the trade space is genuinely different.
3. Check how each approach would integrate with the current architecture and existing code.
4. Compare visual result, complexity, performance, accessibility, browser/device support, asset requirements, maintenance, and reversibility.
5. Verify uncertain or version-sensitive assumptions using local code, installed package documentation, a minimal experiment, or current official documentation.
6. Select the smallest approach that meets the quality bar and explain the reason in the implementation note or handoff.
7. Prototype the riskiest unknown before committing to a large implementation.

Do not turn trivial edits into lengthy design exercises. Use a short mental comparison for reversible, low-risk work. Write down the comparison when it affects architecture, dependencies, GPU cost, user interaction, accessibility, asset production, or several sections.

Read [approach-evaluation.md](references/approach-evaluation.md) whenever choosing among rendering, animation, scroll, state, shader, asset, or interaction techniques.

## Follow the project defaults

- Use React with JavaScript and Vite.
- Use Three.js through React Three Fiber and Drei.
- Keep one persistent core `Canvas`.
- Use native document scroll as the initial source of truth.
- Use GSAP and ScrollTrigger for labelled story choreography.
- Keep meaningful text and controls in semantic HTML.
- Keep shared application state small; use Zustand only for cross-cutting state.
- Keep frame-by-frame values in refs, uniforms, or R3F state rather than React state.
- Build front-end only. Do not add APIs, server functions, databases, authentication, or real form submission.
- Make deterministic visuals by seeding randomness.
- Implement desktop, mobile, reduced-motion, lower-quality, and no-WebGL behavior deliberately.

These are defaults, not excuses to ignore a better solution. Propose a change only after evaluating alternatives and explaining why the existing default no longer satisfies the project.

## Implement in vertical slices

1. Inspect the repository and preserve unrelated work.
2. Locate the section, timeline range, content, asset, and acceptance criteria involved.
3. Establish semantic DOM content and accessible controls.
4. Implement the lowest-cost visual version using primitives or accepted placeholders.
5. Connect normalized local progress and verify forward and backward scrolling.
6. Add interaction with pointer, touch, and keyboard paths.
7. Add reduced-motion and quality-tier behavior.
8. Measure before adding expensive polish.
9. Run proportional tests, production build, browser checks, and visual inspection.
10. Report outcome, files changed, validation, tradeoffs, and remaining placeholders.

Do not polish one isolated scene before the complete gray-box journey works.

## Apply WebGL and React discipline

- Never call React state setters every frame.
- Avoid allocations inside `useFrame`; reuse vectors, matrices, colors, arrays, geometry, and materials.
- Use instancing for repeated wheat stalks, grains, particles, and markers.
- Use LODs, progressive loading, compressed GLB/KTX2 assets, and capped DPR.
- Prefer baked or shared lighting over many dynamic lights and shadows.
- Keep master camera choreography separate from local scene motion.
- Store timing ranges and labels in configuration, not scattered magic numbers.
- Clean up listeners, GSAP contexts, render targets, and temporary GPU resources.
- Add post-processing and shader complexity one measured effect at a time.
- Test WebGL context loss and repeated navigation for leaks.

Read [best-practices.md](references/best-practices.md) before implementing or reviewing React Three Fiber, shaders, scroll systems, asset loading, performance, or accessibility.

## Avoid these failure patterns

- Multiple canvases for narrative sections.
- Scroll position, GSAP time, and React state acting as competing clocks.
- Meaningful copy or navigation rendered only inside WebGL.
- Hover-only or drag-only interactions.
- Unseeded procedural layouts that make debugging inconsistent.
- Thousands of separate crop meshes or per-plant materials.
- Large textures used without camera-distance justification.
- Device detection as the sole quality heuristic.
- Fake preload progress disconnected from actual assets.
- Scroll locking without exact restoration and an obvious exit.
- Invented scientific statistics presented as facts.
- Premature abstraction, dependency additions, or shader cleverness without a demonstrated need.
- Copying course or reference-site code instead of applying learned principles.

## Use tools deliberately

Read [tools.md](references/tools.md) before adding dependencies, choosing an asset workflow, researching a technique, or planning validation. Check which tools and packages are actually installed; availability is not guaranteed.

Prefer:

- repository inspection before assumptions;
- official documentation for current APIs;
- small isolated experiments for shader/performance uncertainty;
- browser-level tests for scroll and input behavior;
- visual inspection for visual work;
- measurements for performance claims.

## Completion standard

Do not call work complete until the relevant criteria in `planning/05-roadmap-and-acceptance.md` pass. At minimum verify:

- forward and backward scroll behavior;
- supported viewport behavior;
- pointer, touch, and keyboard interaction where applicable;
- reduced-motion and low-quality behavior;
- no uncaught console errors or missing local assets;
- production build success;
- visual output, not only code structure;
- performance impact for WebGL-intensive changes.

