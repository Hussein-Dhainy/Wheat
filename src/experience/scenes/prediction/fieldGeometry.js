import {
  Color,
  LinearFilter,
  Matrix4,
  Mesh,
  NoBlending,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  MathUtils,
} from 'three'
import fieldBlurFragmentShader from './fieldBlurFragment.glsl?raw'
import fieldBlurVertexShader from './fieldBlurVertex.glsl?raw'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const FIELD = CONFIG.field
const FULL_CIRCLE = Math.PI * 2

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createLayerLayouts(layer, layerIndex) {
  const random = seededRandom(FIELD.seed + layerIndex * 7919)
  const layouts = FIELD.variantNames.map(() => [])
  const plant = new Object3D()

  for (let index = 0; index < layer.count; index += 1) {
    const depthProgress = Math.pow(
      (index + random()) / layer.count,
      0.72,
    )
    const depth = MathUtils.lerp(...layer.depthRange, depthProgress)
    const horizontalRange = MathUtils.lerp(
      ...layer.horizontalRange,
      depthProgress,
    )
    let x = MathUtils.lerp(-horizontalRange, horizontalRange, random())

    if (
      layer.heroClearingRadius > 0
      && depth < layer.depthRange[0] + 2.8
      && Math.abs(x) < layer.heroClearingRadius
    ) {
      const side = x < 0 ? -1 : 1
      x = side * MathUtils.lerp(
        layer.heroClearingRadius,
        layer.heroClearingRadius + 0.65,
        random(),
      )
    }

    const depthScale = MathUtils.lerp(...layer.scaleRange, depthProgress)
    const scale = depthScale * MathUtils.lerp(0.86, 1.14, random())
    plant.position.set(x, 0, -depth)
    plant.rotation.set(
      MathUtils.lerp(-FIELD.leanRange, FIELD.leanRange, random()),
      random() * FULL_CIRCLE,
      MathUtils.lerp(-FIELD.leanRange, FIELD.leanRange, random()),
    )
    plant.scale.setScalar(scale)
    plant.updateMatrix()

    const variantIndex = Math.floor(random() * FIELD.variantNames.length)
    layouts[variantIndex].push({
      amplitude: MathUtils.lerp(0.78, 1.18, random()),
      matrix: plant.matrix.clone(),
      phase: random() * FULL_CIRCLE,
      position: plant.position.clone(),
      quaternion: plant.quaternion.clone(),
      scale: plant.scale.clone(),
    })
  }

  return layouts
}

export function createFieldLayouts() {
  return FIELD.layers.map(createLayerLayouts)
}

export function createFieldAssets(sourceScene) {
  return FIELD.variantNames.map((variantName, variantIndex) => {
    const root = sourceScene.getObjectByName(variantName)
    if (!root) {
      throw new Error(`Prediction model is missing field variant: ${variantName}`)
    }

    root.updateMatrixWorld(true)
    const inverseRootMatrix = root.matrixWorld.clone().invert()
    const sourceMaterial = root.children.find((child) => child.isMesh)?.material
    if (!sourceMaterial) {
      throw new Error(`Prediction field variant has no mesh material: ${variantName}`)
    }

    const material = sourceMaterial.clone()
    material.color.multiply(new Color(FIELD.variantTints[variantIndex]))
    material.metalness = 0
    material.roughness = 1

    return {
      baseColor: material.color.clone(),
      diseaseColor: new Color(
        CONFIG.weather.disease.fieldTints[variantIndex],
      ),
      material,
      parts: root.children
        .filter((child) => child.isMesh && child.geometry)
        .map((child) => ({
          geometry: child.geometry,
          localMatrix: new Matrix4().multiplyMatrices(
            inverseRootMatrix,
            child.matrixWorld,
          ),
          name: child.name,
        })),
    }
  })
}

export function createRenderTarget(depthBuffer) {
  const target = new WebGLRenderTarget(1, 1, {
    depthBuffer,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    stencilBuffer: false,
  })
  target.texture.generateMipmaps = false
  return target
}

export function createBlurPass(sourceTexture, blurRadius) {
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2)
  camera.position.z = 1
  const geometry = new PlaneGeometry(2, 2)
  const material = new ShaderMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: fieldBlurFragmentShader,
    toneMapped: false,
    transparent: true,
    uniforms: {
      uBlurRadius: { value: blurRadius },
      uDirection: { value: new Vector2(1, 0) },
      uFieldTexture: { value: sourceTexture },
      uTexelSize: { value: new Vector2(1, 1) },
    },
    vertexShader: fieldBlurVertexShader,
  })
  scene.add(new Mesh(geometry, material))
  return { camera, geometry, material, scene }
}
