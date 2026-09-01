import { useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureGLTFLoader } from './gltfAssetLoader.js'
import {
  WHEAT_GRAIN_ASSET,
  prepareGrainGeometry,
  prepareGrainMaterial,
} from './wheatGrain.js'

// Every caller gets its own cloned geometry and material, so Scene 2 and
// Scene 5 can fade the grain independently even though the GLTF itself is
// parsed once and cached by useLoader.
export function useWheatGrainAssets() {
  const { gl } = useThree()
  const { scene } = useLoader(
    GLTFLoader,
    WHEAT_GRAIN_ASSET.modelUrl,
    configureGLTFLoader(gl),
  )
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

// Intentionally not a useLoader.preload: KTX2 transcoding has to be told which
// compressed format the renderer supports, and no renderer exists at module
// evaluation time. Every scene mounts immediately behind the preloader overlay,
// so the in-component useLoader above begins the same fetch within a frame of
// where a module-level preload would have.
export function preloadWheatGrain() {}
