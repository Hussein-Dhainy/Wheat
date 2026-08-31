import { Color, DoubleSide, Vector2, Vector3 } from 'three'

// Scene 2's genetics detail and Scene 5's result both present the same wheat
// grain. This module owns that shared contract — the model, its mesh names,
// its material tuning, and its rest rotation — so neither scene has to reach
// into the other's config to render it.
//
// Deliberately free of React and loader imports so scene configs (and their
// tests) can read the contract without pulling in the renderer. The loading
// side lives in useWheatGrainAssets.js.
export const WHEAT_GRAIN_ASSET = {
  modelUrl: '/models/result/ResultSeedOptimized.glb',
  meshName: 'node_0',
  materialSourceMeshName: 'node_0',
  // The rest pose both scenes rotate away from. Scene 5 uses it directly;
  // Scene 2's detail reveal spins around it.
  baseRotation: [-0.05, -0.42, 0],
  material: {
    colorTint: '#f4f0e6',
    emissive: '#554414',
    emissiveIntensity: 0.12,
    // The source GLB carries an unusually strong specular extension and a
    // combined metallic/roughness map. Override both so the grain reads as a
    // dry organic surface rather than polished or metallic material.
    metalness: 0,
    roughness: 1,
    specularIntensity: 0.15,
    clearcoat: 0,
    sheen: 0,
    normalScale: 1,
  },
}

export function prepareGrainGeometry(node, name) {
  if (!node?.isMesh || !node.geometry) {
    throw new Error(`Wheat grain model is missing required mesh: ${name}`)
  }

  const geometry = node.geometry.clone()
  geometry.computeBoundingBox()
  const size = new Vector3()
  geometry.boundingBox.getSize(size)
  geometry.center()
  const normalization = 1 / Math.max(size.x, size.y, size.z, 0.0001)
  geometry.scale(normalization, normalization, normalization)
  geometry.computeBoundingSphere()
  return geometry
}

export function prepareGrainMaterial(node) {
  const source = node?.material
  if (!source?.isMeshStandardMaterial) {
    throw new Error('Wheat grain requires a MeshStandardMaterial')
  }

  const tuning = WHEAT_GRAIN_ASSET.material
  const material = source.clone()
  material.color.multiply(new Color(tuning.colorTint))
  material.emissive.set(tuning.emissive)
  material.emissiveIntensity = tuning.emissiveIntensity
  material.metalness = tuning.metalness
  material.metalnessMap = null
  material.roughness = tuning.roughness
  material.roughnessMap = null
  material.normalScale = new Vector2(tuning.normalScale, tuning.normalScale)
  if ('specularIntensity' in material) {
    material.specularIntensity = tuning.specularIntensity
  }
  if ('clearcoat' in material) material.clearcoat = tuning.clearcoat
  if ('sheen' in material) material.sheen = tuning.sheen
  material.side = DoubleSide
  material.transparent = true
  material.needsUpdate = true
  return material
}
