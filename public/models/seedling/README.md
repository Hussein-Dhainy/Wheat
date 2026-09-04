# Wheat seedling web asset

Use `/models/seedling/WheatSeedlingGrowth-web.glb` in the website. The file contains the pot, soil, seed, unified coleoptile/leaf shoot, wheat root system, materials, textures, and a single animation clip named `Scene`.

The exported `Scene` clip lasts 4.25 seconds across frames 1-102 at 24 fps. In Three.js or React Three Fiber, load the GLB, create an `AnimationMixer`, and play `gltf.animations[0]` or the clip named `Scene`.

`asset.json` records the stable public URL and the intended leaf node for the later pointer-bending interaction. Editable and raw export intermediates live under `exports/seedling`; the `-web.glb` file is the deployable asset.

The interactive shoot node is `Wheat_Shoot_Unified`. It contains the tubular coleoptile and first true leaf as one continuous mesh with progressive growth morph targets.

The same GLB also contains two static background pot sets using the
`BG_Pot_*_LOD`, `BG_Soil_*_LOD`, and `BG_Shoot_*_LOD` nodes. Their meshes are
simplified and animation-free.
