# Asset and Content Plan

## Ownership rule

Create or license every asset used in the project. Do not download or redistribute the reference site's models, textures, fonts, logos, sounds, marketing copy, or data. Public asset names were inspected only to understand the types of scenes in the original experience.

Short reference headings may be retained in internal planning for comparison. The shipped experience must use original wheat-specific wording.

## Art direction decision

The proposed baseline is **stylized realism**:

- recognizable, botanically plausible wheat;
- realistic PBR materials on the hero grain and foreground stalk;
- simplified distant geometry;
- cinematic emerald, teal, soil-brown, and harvest-gold palette;
- abstract science/data scenes rather than literal laboratory accuracy;
- restrained bloom and depth effects.

This is more achievable for a practice project than uniform photorealism and still exercises the relevant Three.js techniques.

## Required 3D assets

| ID | Asset | Variants/animation | Use | Priority |
|---|---|---|---|---|
| M01 | Hero wheat grain | LOD0/LOD1/LOD2 | Landing and final inspector | Critical |
| M02 | Low-poly grain | 1 lightweight mesh | Instanced candidate fields | Critical |
| M03 | Wheat seedling | Emergence/growth blend or staged meshes | Field transition | Critical |
| M04 | Mature wheat stalk | Rigged or shader-ready; 2–4 silhouette variants | Hero plant and field instances | Critical |
| M05 | Root system | Simplified branching mesh | Soil cutaway test | High |
| M06 | Soil cross-section | Surface and sliced form | Planting and soil mode | High |
| M07 | Lab vessel/chamber | Static with moving subparts | Breeding section | Medium |
| M08 | Abstract DNA/data structure | Procedural preferred | Genetics scene | Critical |
| M09 | Field tiles/terrain | 2–3 layouts | Expanded trials | High |
| M10 | Disease overlays | Texture/mask assets, not necessarily geometry | Disease test | High |

## Texture/material inventory

- Grain: base color, normal, roughness, and optional ambient occlusion.
- Wheat leaves/stems/heads: atlas textures where practical; alpha-tested edges only if geometry is too expensive.
- Soil: tileable base color, normal, roughness; dry-state blend texture.
- Root: simple material with color/roughness variation.
- Disease: mask/lesion pattern owned by a custom shader or overlay texture.
- Noise: small seamless blue-noise/perlin-like textures for shader variation.
- Environment: original/licensed HDRI or a procedural/studio-light rig.
- UI: original SVG icons for menu, sound, close, drag, scroll, and test modes.

## Procedural systems

| System | Approach | Reuse |
|---|---|---|
| Dust/pollen | Instanced points with depth-based size and slow curl noise | Landing, field, result |
| Genetic network | Points plus line segments with seeded layout | Sections 1–2 |
| Candidate stream | Instanced grains with per-instance position/phase/status | Sections 1–3 |
| Wind field | Shared vertex shader uniforms plus per-instance phase | Section 4 and background field |
| Trial plots | Instanced stalk placement from deterministic layouts | Sections 4–5 |
| Hotspot anchors | Named empties exported in GLTF or fixed model-space vectors | Sections 1, 4, 6 |

Use deterministic random seeds so visuals and screenshot tests are reproducible.

## Suggested Blender deliverable standard

- Real-world-ish scale and consistent coordinate system.
- Origin and forward/up axes documented.
- Clean transforms applied before export.
- Meaningful object/material names.
- No unused cameras/lights/material slots in exported GLB.
- Hotspot anchors named `hotspot_*`.
- Separate LOD meshes named `*_LOD0`, `*_LOD1`, `*_LOD2`.
- Animation clips named by action, such as `grow`, `bend`, or `emerge`.
- Textures packed or copied into the controlled asset pipeline.
- Each export inspected in an independent GLTF viewer before integration.

## Content schema

Keep all editable story content separate from scene code:

```js
{
  id: 'field-tests',
  chapter: 'testing',
  eyebrow: 'Chapter 2',
  title: 'Proven beyond the lab',
  body: '...',
  detailAction: {
    label: 'Experience the tests',
    overlay: 'stress-tests'
  },
  sourceNotes: []
}
```

Each section needs:

- internal ID;
- chapter ID;
- eyebrow/step label;
- title under roughly 10 words;
- body under roughly 60 words for the primary scroll state;
- optional detail action;
- alt/editorial description for the WebGL fallback;
- claim status (`fictional-demo`, `sourced`, or `non-quantitative`);
- source notes when any factual quantitative claim is displayed.

## Copy plan

| Beat | Working wheat message | Claim risk |
|---|---|---|
| Landing | A grain's journey from genetic diversity to proven field performance. | Low |
| Genetic foundation | Diverse wheat lines create possibilities for future varieties. | Medium; keep general or source it. |
| Prediction | Digital evaluation narrows the candidate pool before field work. | Medium; avoid unsupported numbers. |
| Breeder refinement | Controlled selection focuses the strongest candidates. | Medium. |
| Stress testing | Wind, drought, disease, soil, and density expose different strengths. | Medium. |
| Expanded trials | Repeated trials across environments test consistency. | Medium. |
| Result | Only the strongest fictional candidate completes this demo journey. | Low if clearly fictionalized. |
| Closing | Credits, learning notes, references, replay. | Low. |

## Audio plan

Audio is optional and must not block MVP completion.

If included:

- one ambient music loop;
- one low-frequency transition layer;
- subtle wind/field ambience;
- short UI cues;
- explicit mute control, off by default until user interaction;
- compressed web formats and lazy loading;
- reduced-motion does not automatically imply mute, but preference is remembered locally.

Do not build spatial audio until the visual story is stable.

## Asset production sequence

1. Gray-box hero grain, one stalk, soil plane, and field instancing.
2. Validate the complete scroll journey with placeholders.
3. Finalize hero grain and stalk topology/materials.
4. Build procedural genetics and candidate systems.
5. Build lab/soil supporting assets.
6. Produce environmental-test variants and masks.
7. Optimize, compress, and create LODs.
8. Add final UI SVGs, poster frames, and fallback stills.

## Asset acceptance checklist

- Visual ownership/license recorded.
- Correct scale, origin, naming, and axes.
- No unexpected mesh/material count.
- Geometry and textures fit the section budget.
- LOD or instanced variant supplied where required.
- Works under the project's actual lighting.
- No visible seams at intended camera distance.
- Compression does not create unacceptable artifacts.
- Fallback image and editorial description exist for important scenes.

