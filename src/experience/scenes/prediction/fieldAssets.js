import {
  Color,
  MathUtils,
  Matrix4,
  Object3D,
} from 'three'
import { installFieldWeatherMaterial } from './fieldWeatherMaterial.js'
import { isPlantLeaf } from './plantConditionMotion.js'
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
  const motionRandom = seededRandom(FIELD.seed + layerIndex * 104729 + 31337)
  const layouts = []
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

    layouts.push({
      amplitude: MathUtils.lerp(0.82, 1.18, motionRandom()),
      colorScale: MathUtils.lerp(
        1 - FIELD.tintVariation,
        1 + FIELD.tintVariation,
        random(),
      ),
      matrix: plant.matrix.clone(),
      phase: motionRandom() * FULL_CIRCLE,
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

function createFieldMaterial(sourceMaterial) {
  const material = sourceMaterial.clone()
  material.color.multiply(new Color(FIELD.tint))
  material.metalness = 0
  material.roughness = 1
  return material
}

function createFieldPartState(
  material,
  part,
  motionMode,
  diseaseColor,
  diseaseDetail,
) {
  const weatherUniforms = installFieldWeatherMaterial(
    material,
    part.geometry,
    CONFIG.weather,
    {
      deformVertices: motionMode === 'shader',
      diseaseDetail,
    },
  )

  return {
    baseColor: material.color.clone(),
    diseaseColor: new Color(diseaseColor),
    droughtColor: new Color(CONFIG.weather.drought.fieldTint),
    ...part,
    material,
    soilColor: new Color(CONFIG.weather.soil.fieldTint),
    weatherUniforms,
  }
}

function createDroughtMorphTargets(part) {
  const dictionary = part.morphTargetDictionary
  if (!dictionary) return []

  return Object.entries(CONFIG.weather.drought.nearLeafMorphTargets)
    .flatMap(([name, weight]) => {
      const index = dictionary[name]
      return Number.isInteger(index) ? [{ index, name, weight }] : []
    })
}

export function createFieldAsset(sourceScene) {
  const contract = CONFIG.models.fieldFar
  const sourceMesh = sourceScene.getObjectByName(contract.meshName)
  if (!sourceMesh?.isMesh || !sourceMesh.geometry) {
    throw new Error(
      `Prediction field model is missing mesh: ${contract.meshName}`,
    )
  }

  const sourceMaterial = Array.isArray(sourceMesh.material)
    ? sourceMesh.material[0]
    : sourceMesh.material
  if (!sourceMaterial) {
    throw new Error(
      `Prediction field mesh has no material: ${contract.meshName}`,
    )
  }

  sourceMesh.updateMatrixWorld(true)
  const material = createFieldMaterial(sourceMaterial)
  const part = createFieldPartState(
    material,
    {
      geometry: sourceMesh.geometry,
      localMatrix: new Matrix4().copy(sourceMesh.matrixWorld),
      name: sourceMesh.name,
    },
    'shader',
    CONFIG.weather.disease.fieldTint,
    CONFIG.weather.disease.farDetail,
  )

  return { motionMode: 'shader', parts: [part] }
}

export function createNearFieldAsset(sourceScene) {
  const contract = CONFIG.models.fieldNear
  const root = sourceScene.getObjectByName(contract.rootName)
  if (!root) {
    throw new Error(
      `Prediction near-field model is missing group: ${contract.rootName}`,
    )
  }

  root.updateMatrixWorld(true)
  const inverseRootMatrix = root.matrixWorld.clone().invert()
  const sourceParts = []
  root.traverse((object) => {
    if (object.isMesh && object.geometry) sourceParts.push(object)
  })
  if (!sourceParts.some((part) => part.material)) {
    throw new Error(
      `Prediction near-field group has no mesh material: ${contract.rootName}`,
    )
  }

  const parts = sourceParts.map((part) => {
    const sourceMaterial = Array.isArray(part.material)
      ? part.material[0]
      : part.material
    if (!sourceMaterial) {
      throw new Error(
        `Prediction near-field part has no material: ${part.name}`,
      )
    }
    const material = createFieldMaterial(sourceMaterial)
    const leaf = isPlantLeaf(part.name)
    const morphTargetCount = part.morphTargetInfluences?.length ?? 0

    return createFieldPartState(
      material,
      {
        droughtMorphTargets: leaf ? createDroughtMorphTargets(part) : [],
        geometry: part.geometry,
        localMatrix: new Matrix4().multiplyMatrices(
          inverseRootMatrix,
          part.matrixWorld,
        ),
        morphTargetCount,
        name: part.name,
      },
      'parts',
      leaf
        ? CONFIG.weather.disease.leafTint
        : CONFIG.weather.disease.structureTint,
      leaf
        ? CONFIG.weather.disease.nearLeafDetail
        : CONFIG.weather.disease.nearStructureDetail,
    )
  })

  return { motionMode: 'parts', parts }
}
