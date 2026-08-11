# Tools Available to the AI

## Contents

- Repository and editing tools
- Documentation and research
- Front-end and testing tools
- 3D asset tools
- Tool selection rules

Availability varies by environment. Check before relying on a command or application.

## Repository and editing tools

- **Repository search (`rg`, `rg --files`)** — inspect code, configuration, assets, and instructions before changing anything.
- **Shell/PowerShell** — run read-only inspection, package scripts, builds, tests, and diagnostics.
- **Patch-based editing** — create precise, reviewable changes while preserving unrelated work.
- **Git read-only commands** — inspect status and diffs when the folder is a repository. Do not assume Git has been initialized.

## Documentation and research

- **Local package source/types/docs** — use first to determine how the installed version behaves.
- **Official web documentation** — use for current Three.js, React Three Fiber, Drei, GSAP, Vite, browser, and WebGL APIs when local evidence is insufficient.
- **Reference-site inspection** — use only to understand public behavior and structure; never extract proprietary assets/code for reuse.
- **Small technical prototypes** — use to compare approaches whose performance or compatibility is uncertain.

For technical web research, prefer official documentation and primary sources. Verify version-sensitive claims before changing dependencies or APIs.

## Front-end and testing tools

- **Node.js package scripts** — development server, production build, linting, tests, and asset utilities after the project is scaffolded.
- **Vite** — application build and local development.
- **Vitest and React Testing Library** — logic, state, semantic UI, and accessibility-oriented component tests.
- **Playwright** — browser scroll/input/deep-link smoke tests and visual checkpoints.
- **Browser developer tools** — console, network waterfall, device emulation, Performance panel, Memory panel, and WebGL inspection.
- **Three.js renderer info/performance monitors** — draw calls, triangles, textures, programs, and frame-time observation.

Do not add a library merely because it is listed here. Inspect current dependencies, compare alternatives, and justify additions.

## 3D asset tools

- **Blender** — model, UV, rig, bake, animate, and export original assets when installed and when GUI use is authorized.
- **glTF Transform** — inspect, prune, deduplicate, compress, and optimize GLB/GLTF assets when installed.
- **gltfjsx** — inspect/convert GLTF scene structure into reusable R3F components when that improves ownership; avoid generating huge opaque components without cleanup.
- **KTX2/Basis tooling** — compress suitable textures and test target-browser decode support.
- **Independent GLTF viewers** — verify exports outside the application.
- **Image inspection/generation tools** — inspect local visual assets or create original concept/texture material when the task calls for it and usage rights are clear.

## Tool selection rules

1. Inspect before installing.
2. Prefer an existing project tool when it satisfies the requirement.
3. Compare at least one alternative for material dependency or workflow additions.
4. Prefer deterministic scripts for repeated asset transformations.
5. Test generated/optimized assets visually and measure size/runtime impact.
6. Do not claim a tool is available until a version or executable check succeeds.
7. Request authorization for downloads, installations, GUI launches, or external deployment when required.
8. Do not use tools to copy reference-site or course assets/source into the project.

