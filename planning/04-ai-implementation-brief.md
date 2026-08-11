# AI Implementation Brief

## Instruction to any AI coding agent

Read this file and all preceding planning files before implementing a feature. Then inspect the current repository, existing decisions, and working tree. Do not assume a blank project after development begins.

## Mission

Build an original wheat-themed, front-end-only educational WebGL experience that practices the structure and interaction language of Pioneer — Corn. Revolutionized. Match narrative structure and technical challenge, not proprietary implementation or branded content.

## Non-negotiable constraints

1. Use React and JavaScript, not TypeScript, unless the project owner explicitly changes that decision.
2. Use Three.js through React Three Fiber.
3. Keep one persistent canvas for the core journey.
4. Use native document scroll as the initial source of truth unless an explicit,
   recorded user decision supersedes it. The current five-scene exception is in
   `planning/06-infinite-diagonal-transitions.md`.
5. Use GSAP/ScrollTrigger for labelled scroll choreography.
6. Keep story content as semantic HTML, not canvas-rendered text.
7. No backend, API route, database, authentication, serverless function, or real form submission.
8. Do not copy or download reference assets, source code, data claims, trademarks, or marketing copy.
9. Every spatial interaction needs a keyboard/touch-accessible alternative.
10. Respect reduced-motion and offer a non-WebGL fallback.
11. Do not sacrifice stable performance for a decorative effect.
12. Do not rewrite unrelated user changes or perform destructive Git operations.

## Required reading order

1. `planning/README.md`
2. `planning/01-reference-experience-map.md`
3. `planning/02-technical-architecture.md`
4. `planning/03-assets-and-content-plan.md`
5. `planning/05-roadmap-and-acceptance.md`
6. Any future root `AGENTS.md`, project README, design tokens, and decision log

## Before implementing a section

An AI should be able to answer:

- What narrative beat does this section communicate?
- What enters and leaves the camera frame?
- What is controlled by scroll, pointer, touch, and keyboard?
- What is the section's global progress range?
- Which assets are critical versus progressive?
- What is the reduced-motion behavior?
- What is the low-quality behavior?
- What HTML content carries the same meaning without WebGL?
- How does the section begin and hand off to the next one?
- How will completion be visually and automatically tested?

If an answer is absent and materially affects design, record a proposed decision before writing a large implementation.

## Implementation protocol

1. Inspect existing code and pending changes.
2. Identify the smallest vertical slice that demonstrates the requested behavior.
3. Update content/configuration before hard-coding values inside components.
4. Add the DOM story state and accessibility path.
5. Add the lowest-cost 3D implementation.
6. Add motion and interaction.
7. Add quality-tier and reduced-motion behavior.
8. Verify with tests, production build, browser console, and a visual checkpoint.
9. Record material architecture or art-direction decisions.

## Scene component contract

Every narrative scene should approximately follow this interface:

```jsx
<SceneName
  progress={localProgress}
  quality={qualityTier}
  reducedMotion={reducedMotion}
  active={isWithinPreloadRange}
/>
```

Rules:

- `progress` is normalized from 0 to 1.
- Rendering the same inputs should yield the same composition.
- Randomness is seeded.
- Do not call React state setters from `useFrame`.
- Load assets through centralized loader hooks/components.
- Materials/geometries shared between instances must be reused.
- Effects and listeners must clean up on unmount or dependency change.
- Scene-specific constants belong beside that scene with descriptive names.

## Animation rules

- The master timeline owns chapter-level camera and group choreography.
- Scenes own local deformation and secondary motion.
- Idle motion must not fight scroll motion.
- Use damping/interpolation for pointer influence.
- Avoid unexplained “magic” progress thresholds scattered across render loops.
- Timeline labels and ranges are configuration.
- Interactive overlays use a separate, finite state machine-like mode; they do not silently mutate story progress.

## Performance rules for generated code

- Prefer instancing for fields, repeated grains, markers, and particles.
- Avoid creating vectors, colors, arrays, or materials inside `useFrame`.
- Cap DPR.
- Avoid real-time shadows for thousands of plants.
- Prefer baked lighting/ambient occlusion for background assets.
- Lazy-load later chapters.
- Dispose GPU resources when truly temporary.
- Add post-processing effects one at a time and measure their cost.
- Treat mobile as a designed quality tier, not a scaled-down desktop screenshot.

## UI and accessibility rules

- Use actual `<button>` and `<a>` elements.
- Maintain visible focus states.
- Menu/detail overlays trap focus, support Escape, and restore focus.
- Pointer-only instructions such as “drag” must be supplemented with controls.
- Hash navigation updates without breaking back/forward navigation.
- The canvas cannot be the only source of meaning.
- Never disable browser zoom.
- Avoid scroll-jacking that makes normal wheel/touch/keyboard behavior unpredictable.

## Content/data rules

- Mark provisional content clearly in source configuration.
- Never invent scientific performance statistics and present them as fact.
- Keep references adjacent to claims in the closing/reference view.
- Do not retain Pioneer product names or calls to action in shipped copy.
- The visual one-to-one map is allowed; branding and content duplication are not.

## Definition of a good AI handoff

After each implementation task, report:

- outcome and user-visible behavior;
- files changed;
- tests/build/browser checks run and results;
- performance implications;
- placeholder assets or known limitations;
- the next smallest useful step.

Do not report a scene as complete if it only works at one viewport, lacks a fallback, or has not been visually checked.

## Questions an AI must not silently decide

- Changing JavaScript to TypeScript.
- Adding a backend or third-party data collection.
- Using proprietary/reference assets.
- Purchasing an asset or service.
- Publishing/deploying the site externally.
- Replacing native scroll with a custom scroll engine.
- Removing sections from the one-to-one practice map.
- Presenting fictional statistics as factual claims.

## Safe assumptions

Unless superseded by a documented decision:

- use placeholder geometry before final assets;
- choose accessible behavior over exact visual timing;
- choose the lower GPU cost when two treatments look similar;
- keep audio optional and muted before user initiation;
- implement desktop and mobile together at the structural level, then tune visuals separately;
- make all demos fully functional without network access after dependencies/assets are installed.
