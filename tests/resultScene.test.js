import test from 'node:test'
import assert from 'node:assert/strict'
import { MeshPhysicalMaterial } from 'three'

import { RESULT_CONTENT } from '../src/config/resultContent.js'
import { SCENE_TIMELINE } from '../src/config/sceneTimeline.js'
import { RESULT_SCENE_CONFIG } from '../src/experience/scenes/result/resultConfig.js'
import {
  createNetworkData,
  smootherRange,
} from '../src/experience/scenes/result/resultGeometry.js'
import { prepareGrainMaterial } from '../src/experience/systems/wheatGrain.js'
import {
  getNearestResultViewRotation,
  getResultOrbitMarkerAngle,
  snapResultView,
} from '../src/experience/scenes/result/resultInspection.js'

test('Scene 5 uses one continuous result journey before returning to landing', () => {
  const resultScene = SCENE_TIMELINE.scenes.find((scene) => scene.id === 'result')

  assert.equal(resultScene.contentLength, 1)
  assert.equal(resultScene.freeScroll, true)
  assert.deepEqual(resultScene.sections.map((section) => section.id), ['result-journey'])
  assert.equal(resultScene.exitTransitionLength, 1)
})

test('closing controls have unique labels and remain content-driven', () => {
  assert.equal(RESULT_CONTENT.closing.actions.length, 5)
  assert.equal(
    new Set(RESULT_CONTENT.closing.actions.map((action) => action.id)).size,
    RESULT_CONTENT.closing.actions.length,
  )
  assert.ok(RESULT_CONTENT.result.actionLabel.length > 0)
  assert.ok(RESULT_CONTENT.closing.actions.every((action) => (
    action.eyebrow.length > 0
    && action.title.length > 0
    && action.body.length > 0
  )))
})

test('the result uses the optimized wheat seed model', () => {
  assert.equal(
    RESULT_SCENE_CONFIG.modelUrl,
    '/models/result/ResultSeedOptimized.glb',
  )
  assert.equal(RESULT_SCENE_CONFIG.meshName, 'node_0')
  assert.equal(RESULT_SCENE_CONFIG.materialSourceMeshName, 'node_0')
})

test('the result grain overrides imported shine with a matte organic material', () => {
  const source = new MeshPhysicalMaterial({
    clearcoat: 1,
    metalness: 0.8,
    roughness: 0.2,
    sheen: 1,
    specularIntensity: 1,
  })
  source.metalnessMap = {}
  source.roughnessMap = {}

  const material = prepareGrainMaterial({ material: source })

  assert.equal(RESULT_SCENE_CONFIG.material.colorTint, '#f4f0e6')
  assert.equal(material.metalness, 0)
  assert.equal(material.metalnessMap, null)
  assert.equal(material.roughness, 1)
  assert.equal(material.roughnessMap, null)
  assert.equal(material.specularIntensity, 0.15)
  assert.equal(material.clearcoat, 0)
  assert.equal(material.sheen, 0)
  assert.equal(material.normalScale.x, 1)
  assert.equal(material.normalScale.y, 1)

  material.dispose()
  source.dispose()
})

test('the result grain has a restrained ambient fill', () => {
  const fill = RESULT_SCENE_CONFIG.lighting.ambientFill

  assert.equal(fill.color, '#fff8ec')
  assert.equal(fill.intensity, 0.35)
})

test('grain inspection exposes three content-driven views', () => {
  assert.equal(RESULT_CONTENT.inspection.views.length, 3)
  assert.equal(
    new Set(RESULT_CONTENT.inspection.views.map((view) => view.id)).size,
    3,
  )
  assert.ok(RESULT_CONTENT.inspection.views.every((view) => (
    view.title.length > 0 && view.body.length > 0
  )))
})

test('grain inspection uses a deliberately slow visual transition', () => {
  assert.equal(RESULT_SCENE_CONFIG.inspection.transitionDamping, 1.4)
  assert.ok(RESULT_SCENE_CONFIG.inspection.grainZoom > 1)
  assert.ok(RESULT_SCENE_CONFIG.inspection.grainZoom <= 1.1)
})

test('grain rotation snaps to the closest of three repeatable views', () => {
  const step = RESULT_SCENE_CONFIG.inspection.viewStep
  const snapped = snapResultView(step * 1.42, step, 3)

  assert.equal(snapped.index, 1)
  assert.equal(snapped.rotation, step)
  assert.equal(getNearestResultViewRotation(step * 2, 0, step, 3), step * 3)
})

test('each snapped orbit marker resolves to the camera-facing phase', () => {
  const step = RESULT_SCENE_CONFIG.inspection.viewStep

  for (let viewIndex = 0; viewIndex < 3; viewIndex += 1) {
    const markerAngle = getResultOrbitMarkerAngle(viewIndex, step)
    assert.ok(Math.abs(markerAngle - viewIndex * step - Math.PI / 2) < 1e-10)
  }
})

test('the result network is a deterministic forest of overlapping constellations', () => {
  const network = createNetworkData()
  const repeatedNetwork = createNetworkData()

  assert.equal(network.constellationCount, RESULT_SCENE_CONFIG.network.clusterCount)
  assert.equal(
    network.connectionCount,
    network.nodeCount - network.constellationCount,
    'each constellation should be a separate tree with no cross-connections',
  )
  assert.ok(network.connectorPositions.length / 3 > network.nodeCount * 4)
  assert.deepEqual(network.pointPositions, repeatedNetwork.pointPositions)
  assert.deepEqual(network.connectorPositions, repeatedNetwork.connectorPositions)
})

test('connector opacity waves are stronger than the large-node pulse', () => {
  const network = RESULT_SCENE_CONFIG.network

  assert.ok(network.pulseSpeed > 0)
  assert.ok(network.connectorPulseStrength > network.nodePulseStrength)
  assert.ok(network.connectorPulseStrength <= 1)
  assert.ok(network.nodePulseStrength >= 0)
})

test('the closing background palette resolves from scene progress', () => {
  const range = RESULT_SCENE_CONFIG.atmosphere.closingBackgroundRange

  assert.equal(smootherRange(range[0], range), 0)
  assert.equal(smootherRange(range[1], range), 1)
  assert.ok(smootherRange((range[0] + range[1]) / 2, range) > 0)
})
