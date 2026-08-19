import test from 'node:test'
import assert from 'node:assert/strict'

import { RESULT_CONTENT } from '../src/config/resultContent.js'
import { SCENE_TIMELINE } from '../src/config/sceneTimeline.js'
import { RESULT_SCENE_CONFIG } from '../src/experience/scenes/result/resultConfig.js'
import {
  getNearestResultViewRotation,
  getResultOrbitMarkerAngle,
  snapResultView,
} from '../src/experience/scenes/result/resultInspection.js'

test('Scene 5 uses one continuous result journey before returning to landing', () => {
  const resultScene = SCENE_TIMELINE.scenes.find((scene) => scene.id === 'result')

  assert.equal(resultScene.contentLength, 2)
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

test('the result uses the Hunyon wheat seed model', () => {
  assert.equal(
    RESULT_SCENE_CONFIG.modelUrl,
    '/models/result/HunyonWheatSeed.glb',
  )
  assert.equal(RESULT_SCENE_CONFIG.meshName, 'node_0')
  assert.equal(RESULT_SCENE_CONFIG.materialSourceMeshName, 'node_0')
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
