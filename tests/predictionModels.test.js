import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from 'three'
import {
  createFieldAsset,
  createFieldLayouts,
  createNearFieldAsset,
  shareLODTextures,
} from '../src/experience/scenes/prediction/fieldAssets.js'
import {
  createPredictionShadowDescriptors,
  getPredictionShadowOpacity,
} from '../src/experience/scenes/prediction/predictionPlantShadows.js'
import {
  createBackdropRefreshState,
  shouldRefreshBackdrop,
} from '../src/experience/scenes/prediction/predictionBackdropPerformance.js'
import {
  installFieldWeatherMaterial,
  updateFieldWeatherUniforms,
} from '../src/experience/scenes/prediction/fieldWeatherMaterial.js'
import { PREDICTION_RENDER_CONFIG } from '../src/experience/scenes/prediction/predictionConfig.js'
import { updateDroughtMorphInfluences } from '../src/experience/scenes/prediction/plantConditionMotion.js'

const CONFIG = PREDICTION_RENDER_CONFIG

test('prediction uses dedicated hero and field model contracts', () => {
  assert.equal(CONFIG.models.hero.url, '/models/prediction/PredictionWheat.glb')
  assert.equal(CONFIG.models.hero.rootName, 'PredictionWheat')
  assert.equal(
    CONFIG.models.fieldFar.url,
    '/models/prediction/PredictionWheat_LOD1.glb',
  )
  assert.equal(CONFIG.models.fieldFar.meshName, 'PredictionWheat_LOD1')
  assert.equal(
    CONFIG.models.fieldNear.url,
    '/models/prediction/PredictionWheat_LOD2.glb',
  )
  assert.equal(CONFIG.models.fieldNear.rootName, 'PredictionWheat')
})

test('field layouts stay deterministic and honor the reduced LOD population', () => {
  const first = createFieldLayouts()
  const second = createFieldLayouts()

  assert.deepEqual(CONFIG.field.layers.map((layer) => layer.count), [110, 48, 14])
  assert.equal(first.length, CONFIG.field.layers.length)
  first.forEach((layouts, layerIndex) => {
    assert.equal(layouts.length, CONFIG.field.layers[layerIndex].count)
    assert.deepEqual(layouts[0].matrix.elements, second[layerIndex][0].matrix.elements)
    assert.equal(layouts[0].colorScale, second[layerIndex][0].colorScale)
  })
})

test('every field layer can populate the area behind the hero plant', () => {
  const layouts = createFieldLayouts()

  CONFIG.field.layers.forEach((layer, layerIndex) => {
    assert.equal(layer.heroClearingRadius, 0)
    assert.ok(
      layouts[layerIndex].some((layout) => Math.abs(layout.position.x) < 0.9),
    )
  })
})

test('projected shadows cover every field plant plus the hero', () => {
  const layouts = createFieldLayouts()
  const descriptors = createPredictionShadowDescriptors(layouts, CONFIG)
  const fieldCount = CONFIG.field.layers.reduce(
    (total, layer) => total + layer.count,
    0,
  )

  assert.equal(descriptors.length, fieldCount + 1)
  assert.equal(descriptors.at(-1).isHero, true)
  assert.ok(
    getPredictionShadowOpacity({ drought: 1 }, CONFIG.shadows)
      > getPredictionShadowOpacity({ drought: 0 }, CONFIG.shadows),
  )
})

test('the complete environment uses one lower-resolution half-rate blur pair', () => {
  assert.equal(CONFIG.backdrop.quality.high.refreshIntervalFrames, 2)
  assert.equal(CONFIG.backdrop.quality.medium.refreshIntervalFrames, 2)
  assert.equal(CONFIG.backdrop.quality.low.refreshIntervalFrames, 2)
  assert.equal(CONFIG.backdrop.quality.high.resolutionScale, 0.36)
  assert.ok(
    CONFIG.backdrop.quality.high.blurRadius
      > CONFIG.backdrop.quality.medium.blurRadius,
  )
  assert.ok(
    CONFIG.backdrop.quality.medium.blurRadius
      > CONFIG.backdrop.quality.low.blurRadius,
  )
  assert.ok(
    CONFIG.backdrop.quality.low.resolutionScale
      < CONFIG.backdrop.quality.high.resolutionScale,
  )

  CONFIG.field.layers.forEach((layer) => {
    assert.equal(layer.blurIterations, undefined)
    assert.equal(layer.blurRadius, undefined)
  })
})

test('the blurred backdrop refreshes immediately on entry then every other frame', () => {
  const state = createBackdropRefreshState()

  assert.equal(shouldRefreshBackdrop(state, false, 2), false)
  assert.equal(shouldRefreshBackdrop(state, true, 2), true)
  assert.equal(shouldRefreshBackdrop(state, true, 2), false)
  assert.equal(shouldRefreshBackdrop(state, true, 2), true)
  assert.equal(shouldRefreshBackdrop(state, false, 2), false)
  assert.equal(shouldRefreshBackdrop(state, true, 2), true)
})

test('the joined LOD mesh becomes one reusable instanced field asset', () => {
  const geometry = new BoxGeometry(1, 2, 1)
  const sourceMaterial = new MeshStandardMaterial({ color: '#81956f' })
  const sourceMesh = new Mesh(geometry, sourceMaterial)
  sourceMesh.name = CONFIG.models.fieldFar.meshName
  sourceMesh.position.set(0.1, 0.2, 0.3)
  const sourceScene = new Scene()
  sourceScene.add(sourceMesh)

  const asset = createFieldAsset(sourceScene)

  assert.equal(asset.parts[0].geometry, geometry)
  assert.notEqual(asset.parts[0].material, sourceMaterial)
  assert.equal(asset.motionMode, 'shader')
  assert.equal(asset.parts[0].name, CONFIG.models.fieldFar.meshName)
  assert.equal(asset.parts[0].localMatrix.elements[12], 0.1)
  assert.equal(asset.parts[0].localMatrix.elements[13], 0.2)
  assert.equal(asset.parts[0].localMatrix.elements[14], 0.3)
  assert.ok(asset.parts[0].weatherUniforms.uFieldHeight.value > 0)

  asset.parts[0].material.dispose()
  geometry.dispose()
  sourceMaterial.dispose()
})

test('the near LOD preserves separated parts and their authored pivots', () => {
  const root = new Group()
  root.name = CONFIG.models.fieldNear.rootName
  const material = new MeshStandardMaterial({ color: '#81956f' })
  const leafGeometry = new BoxGeometry(0.2, 1, 0.1)
  const stemGeometry = new BoxGeometry(0.1, 2, 0.1)
  const leaf = new Mesh(leafGeometry, material)
  leaf.name = 'Stemleaf1'
  leaf.morphTargetDictionary = {
    Drought_CarpetRoll: 1,
    Drought_Curl: 0,
  }
  leaf.morphTargetInfluences = [0, 1]
  leaf.position.set(0.1, 0.8, 0.2)
  const stem = new Mesh(stemGeometry, material)
  stem.name = 'Stem'
  root.add(leaf, stem)
  const sourceScene = new Scene()
  sourceScene.add(root)

  const asset = createNearFieldAsset(sourceScene)

  assert.equal(asset.motionMode, 'parts')
  assert.equal(asset.parts.length, 2)
  assert.equal(asset.parts[0].name, 'Stemleaf1')
  assert.equal(asset.parts[0].morphTargetCount, 2)
  assert.deepEqual(asset.parts[0].droughtMorphTargets, [
    { index: 1, name: 'Drought_CarpetRoll', weight: 1 },
    { index: 0, name: 'Drought_Curl', weight: 1 },
  ])
  assert.equal(
    asset.parts[0].diseaseColor.getHexString(),
    new Color(CONFIG.weather.disease.leafTint).getHexString(),
  )
  assert.equal(
    asset.parts[1].diseaseColor.getHexString(),
    new Color(CONFIG.weather.disease.structureTint).getHexString(),
  )
  assert.equal(asset.parts[0].localMatrix.elements[12], 0.1)
  assert.equal(asset.parts[0].localMatrix.elements[13], 0.8)
  assert.equal(asset.parts[0].localMatrix.elements[14], 0.2)

  asset.parts.forEach((part) => part.material.dispose())
  leafGeometry.dispose()
  stemGeometry.dispose()
  material.dispose()
})

test('near-field shape keys curl and roll only with drought progress', () => {
  const influences = [0.7, 0.9, 0.4]
  const targets = [
    { index: 0, weight: 1 },
    { index: 1, weight: 0.8 },
  ]

  updateDroughtMorphInfluences(influences, targets, 0, 0)
  assert.deepEqual(influences, [0, 0, 0])

  updateDroughtMorphInfluences(influences, targets, 1, 0)
  assert.deepEqual(influences, [1, 0.8, 0])

  updateDroughtMorphInfluences(influences, targets, 0, 0)
  assert.deepEqual(influences, [0, 0, 0])
})

test('field weather shader anchors deformation to plant height', () => {
  const geometry = new BoxGeometry(1, 2, 1)
  const material = new MeshStandardMaterial()
  const uniforms = installFieldWeatherMaterial(
    material,
    geometry,
    CONFIG.weather,
  )
  const shader = {
    fragmentShader: '#include <common>\n#include <map_fragment>',
    uniforms: {},
    vertexShader: '#include <common>\n#include <begin_vertex>',
  }

  material.onBeforeCompile(shader)
  updateFieldWeatherUniforms(uniforms, {
    disease: 0.4,
    drought: 0.7,
    gust: 0.5,
    strength: 1,
    time: 2,
  }, true)

  assert.match(shader.vertexShader, /predictionBendWeight/)
  assert.match(shader.vertexShader, /instanceMatrix\[3\]\.xz/)
  assert.match(shader.vertexShader, /uFieldDrought/)
  assert.match(shader.vertexShader, /predictionConditionWave/)
  assert.match(shader.vertexShader, /predictionConditionTotal/)
  assert.match(shader.vertexShader, /predictionDiseaseMix/)
  assert.match(shader.vertexShader, /predictionConditionTransition/)
  assert.match(shader.vertexShader, /predictionTransitionShake/)
  assert.match(shader.vertexShader, /predictionTransitionDelay/)
  assert.match(shader.vertexShader, /predictionAmbientSway/)
  assert.match(shader.vertexShader, /uFieldAmbientSway/)
  assert.match(shader.vertexShader, /USE_INSTANCING_COLOR/)
  assert.match(shader.vertexShader, /instanceColor\.rg/)
  assert.match(
    shader.vertexShader,
    /predictionPhase = predictionStableMotionSeed/,
  )
  assert.match(shader.fragmentShader, /predictionDiseaseSpot/)
  assert.match(shader.fragmentShader, /predictionDroughtStrength/)
  assert.match(shader.fragmentShader, /uFieldDroughtColor/)
  assert.equal(
    uniforms.uFieldDroughtColor.value.getHexString(),
    new Color(CONFIG.weather.drought.fieldWashTint).getHexString(),
  )
  assert.equal(
    uniforms.uFieldDroughtWash.value,
    CONFIG.weather.drought.fieldWashStrength,
  )
  assert.match(shader.fragmentShader, /uFieldDiseaseBleachColor/)
  assert.match(shader.fragmentShader, /uFieldDiseaseLesionColor/)
  assert.equal(shader.uniforms.uFieldWindStrength, uniforms.uFieldWindStrength)
  assert.equal(uniforms.uFieldDrought.value, 0.7)
  assert.equal(uniforms.uFieldDisease.value, 0.4)
  assert.equal(uniforms.uFieldMotionScale.value, 0.22)
  assert.equal(uniforms.uFieldWindStrength.value, 0.22)

  geometry.dispose()
  material.dispose()
})

test('near-field materials reuse the far model’s identical maps', () => {
  const sharedImage = { height: 512, width: 512 }
  const farTexture = { image: sharedImage, name: 'far' }
  const nearTexture = { image: sharedImage, name: 'near' }
  const farAsset = {
    parts: [{ material: { map: farTexture, normalMap: farTexture } }],
  }
  const nearAsset = {
    parts: [
      { material: { map: nearTexture, normalMap: nearTexture } },
      { material: { map: nearTexture, normalMap: nearTexture } },
    ],
  }

  shareLODTextures(farAsset, nearAsset)

  nearAsset.parts.forEach((part) => {
    assert.equal(part.material.map, farTexture)
    assert.equal(part.material.normalMap, farTexture)
    assert.equal(part.material.needsUpdate, true)
  })
})

test('a near map of a different size is left alone rather than swapped', () => {
  const farTexture = { image: { height: 512, width: 512 }, name: 'far' }
  const nearTexture = { image: { height: 2048, width: 2048 }, name: 'near' }
  const farAsset = { parts: [{ material: { map: farTexture } }] }
  const nearAsset = { parts: [{ material: { map: nearTexture } }] }

  shareLODTextures(farAsset, nearAsset)

  assert.equal(nearAsset.parts[0].material.map, nearTexture)
})

test('sharing maps tolerates a material that lacks a given slot', () => {
  const farTexture = { image: { height: 512, width: 512 }, name: 'far' }
  const farAsset = { parts: [{ material: { map: farTexture } }] }
  const nearAsset = { parts: [{ material: {} }] }

  assert.doesNotThrow(() => shareLODTextures(farAsset, nearAsset))
  assert.equal(nearAsset.parts[0].material.map, undefined)
})
