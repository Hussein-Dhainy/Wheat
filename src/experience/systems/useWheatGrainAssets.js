import { useLoader } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import {
  WHEAT_GRAIN_ASSET,
  prepareGrainGeometry,
  prepareGrainMaterial,
} from './wheatGrain.js'

// Every caller gets its own cloned geometry and material, so Scene 2 and
// Scene 5 can fade the grain independently even though the GLTF itself is
// parsed once and cached by useLoader.
export function useWheatGrainAssets() {
  const { scene } = useLoader(GLTFLoader, WHEAT_GRAIN_ASSET.modelUrl)
  const assets = useMemo(() => {
    const grainNode = scene.getObjectByName(WHEAT_GRAIN_ASSET.meshName)
    const materialNode = scene.getObjectByName(
      WHEAT_GRAIN_ASSET.materialSourceMeshName,
    ) ?? grainNode
    return {
      geometry: prepareGrainGeometry(grainNode, WHEAT_GRAIN_ASSET.meshName),
      material: prepareGrainMaterial(materialNode),
    }
  }, [scene])

  useEffect(() => () => {
    assets.geometry.dispose()
    assets.material.dispose()
  }, [assets])

  return assets
}

export function preloadWheatGrain() {
  useLoader.preload(GLTFLoader, WHEAT_GRAIN_ASSET.modelUrl)
}
