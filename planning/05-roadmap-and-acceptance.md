# Roadmap and Acceptance Criteria

## Delivery strategy

Build a complete gray-box journey before polishing any single scene. The main risk is integration—scroll, camera, content, 3D transitions, and device behavior—not the isolated rendering of a beautiful grain.

## Estimated schedule

For one developer using existing course knowledge and creating mostly original assets:

| Phase | Expected effort | Outcome |
|---|---:|---|
| 0. Direction and storyboard | 3–5 days | Final copy outline, frames, quality target, asset ownership |
| 1. Technical foundation | 3–5 days | Working shell, canvas, scroll timeline, fallbacks, CI/test baseline |
| 2. Full gray-box journey | 1–2 weeks | All eight beats navigable with placeholder geometry |
| 3. Science chapter | 1–2 weeks | Genetics, candidate selection, lab refinement |
| 4. Testing chapter | 2–3 weeks | Growth, field, five-condition interaction, expanded trials |
| 5. Result and closing | 1–1.5 weeks | Grain inspector, result panels, credits/replay |
| 6. Art, performance, QA | 1.5–3 weeks | Final assets, mobile tiers, accessibility, browser fixes |

Likely total: **7–12 weeks** for a polished practice build. A smaller visual target or ready-made original assets can reduce this. Near-reference production fidelity can exceed this substantially.

## Milestone 0 — Creative brief and storyboard

### Deliverables

- Final wheat narrative and project name.
- One storyboard frame for each landing/section state.
- Transition notes between frames.
- Typography, colors, and UI direction.
- Desktop and mobile composition sketches.
- Confirmed asset source/creation path.
- Decision on audio and public/private release.

### Exit criteria

- Every section has a purpose, title, approximate copy length, dominant visual, input, and exit transition.
- No planned scientific number lacks a source or fictional-demo label.
- Asset ownership is clear.

## Milestone 1 — Foundation

### Deliverables

- Vite React app using JavaScript.
- R3F canvas and shared lighting/effects shell.
- Semantic scroll sections.
- Master progress/timeline configuration.
- Zustand state boundaries.
- Preloader, error boundary, reduced-motion path, and WebGL fallback.
- Basic test and production-build commands.

### Exit criteria

- Scrolling from start to end updates a debug camera/object deterministically.
- Chapter hash links seek to the correct labels.
- Canvas resizes correctly and survives route/hash changes.
- Reduced-motion and WebGL fallback show the complete story outline.
- Production build succeeds without console errors.

## Milestone 2 — Complete gray-box

### Deliverables

- Placeholder geometry for all sections.
- Camera framing and major transitions for the entire journey.
- Real section copy structure, even if wording remains provisional.
- Menu, chapter jumping, and closing/replay.
- Placeholder entry/exit for all three detail overlays.

### Exit criteria

- The entire narrative can be reviewed without developer controls.
- No black gaps, abrupt unplanned camera cuts, or overlapping content states.
- Forward and backward scrolling are both coherent.
- Desktop and mobile layouts are structurally correct.
- Story timing can be changed from central configuration.

## Milestone 3 — Science chapter

### Deliverables

- Hero grain and genetics network.
- Candidate-grain instancing and simulated selection.
- Lab/breeder scene.
- Genetic-library detail interaction.
- Chapter transitions and quality-tier variants.

### Exit criteria

- Landing through field handoff looks intentional in both directions.
- Candidate counts and effects stay within frame-time budget.
- Genetic detail interaction works with pointer, touch, and keyboard.
- Later chapters lazy-load without blocking current interaction.

## Milestone 4 — Testing chapter

### Deliverables

- Seed-to-root-to-stalk growth sequence.
- Instanced wheat plot/field.
- Wind, drought, disease, soil, and density modes.
- Expanded-trials aerial scene.
- Mobile/low-quality variants.

### Exit criteria

- Each test has a visually distinct, reversible response.
- Entering/exiting test mode preserves story position.
- No mode requires hover.
- Dense fields meet the target device frame rate.
- Repeated mode switching does not leak GPU resources or event listeners.

## Milestone 5 — Result and closing

### Deliverables

- Optimized high-detail grain.
- Drag/swipe/keyboard inspection.
- Three anchored result categories.
- Closing scene, credits, references, replay, and optional demo form treatment.

### Exit criteria

- Hotspot labels remain readable and on-screen at supported viewports.
- Rotation feels controlled and never traps scrolling unexpectedly.
- Result content is available without dragging.
- All buttons either work locally or navigate to an intentional valid destination.
- No form implies successful submission when no backend exists.

## Milestone 6 — Production hardening

### Deliverables

- Final model/texture optimization.
- Performance measurement report.
- Cross-browser and device test matrix.
- Accessibility review.
- Fallback still images and metadata.
- Static hosting configuration and deployment runbook.

### Exit criteria

- Automated tests and production build pass.
- No uncaught console errors or missing local assets during a complete journey.
- Representative mid-range desktop holds near 60 fps in normal scenes.
- Representative mid-range mobile holds near 30 fps on its intended tier.
- Keyboard-only user can navigate the full story and all interactive content.
- Reduced-motion version is coherent and complete.
- Initial and total download sizes are measured and documented.
- Page metadata, favicon, social image, credits, and licenses are present.

## Section-level definition of done

A section is done only when:

1. Its story purpose and copy are approved.
2. Entry, hold, and exit compositions work while scrolling both directions.
3. Final or accepted placeholder assets are integrated.
4. Desktop, mobile, reduced-motion, and low-quality behavior exist.
5. Keyboard/touch alternatives exist for interaction.
6. It stays within its draw-call, texture, and frame-time expectations.
7. It has a stable visual checkpoint for regression comparison.
8. It creates no console errors, failed requests, or resource growth after repetition.

## Priority tiers

### Must have

- Landing plus seven mapped narrative beats.
- Three chapter links and stable hashes.
- Continuous scroll-controlled camera/scene progression.
- Original wheat grain, stalk, soil, science, field, and result visuals.
- Environmental testing modes.
- Grain inspector.
- Responsive, accessible, reduced-motion, and no-WebGL paths.
- Static deployment.

### Should have

- Progressive loading by chapter.
- Manual quality selector.
- Subtle post-processing and environmental particles.
- Credits/reference overlay.
- Replay control.

### Could have

- Sound design.
- More realistic plant growth morphs.
- Dynamic performance adaptation after frame-time sampling.
- Shareable deep links to individual sub-sections.
- Screenshot/debug route for automated visual baselines.

### Out of scope

- Backend, CMS, CRM, accounts, or database.
- Real newsletter or territory-manager submission.
- Analytics/advertising trackers.
- E-commerce.
- Localization in the first release.
- Proprietary reference code/assets.
- Scientifically predictive simulation.

## Major risks and mitigations

| Risk | Early warning | Mitigation |
|---|---|---|
| Final assets arrive late | Gray-box timing depends on unknown proportions | Lock bounding boxes, scale, anchors, and camera distances during storyboard. |
| Scroll animation becomes brittle | Thresholds spread through components | One labelled master timeline and local normalized progress. |
| Wheat field is too expensive | Frame drops as instances enter view | Instancing, LODs, baked lighting, capped DPR, simplified mobile density. |
| Mobile interaction conflicts with scroll | Swipes rotate objects and page simultaneously | Explicit inspector mode, clear touch-action scope, accessible next/previous controls. |
| Loading time is excessive | Entry waits for result assets | Chapter-based progressive loading and compressed assets. |
| Visual polish hides inaccessible content | Copy exists only in canvas/hotspots | Semantic DOM copy and explicit controls from the first gray-box milestone. |
| One-to-one practice becomes asset copying | Reference files appear in repository | Enforce ownership checklist and create original substitutes. |
| Scope expands toward award-site fidelity | New effects added before journey works | Complete milestones in order and measure must-haves against the definition of done. |

## Recommended first implementation ticket

Create the foundation and one thin vertical slice:

- scaffold Vite + React JavaScript;
- add the fixed R3F canvas and semantic story track;
- add central progress mapping and debug labels;
- implement landing → Section 1 → Section 2 using primitive geometry;
- add reduced-motion and WebGL fallback shells;
- add one Playwright smoke test for scroll and hash navigation.

This ticket proves the architecture without committing to expensive final models.

