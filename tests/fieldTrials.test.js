import test from 'node:test'
import assert from 'node:assert/strict'

import { SCENE_TIMELINE } from '../src/config/sceneTimeline.js'
import { FIELD_TRIALS_CONFIG } from '../src/experience/scenes/field/fieldTrialsConfig.js'
import { createFieldTintData } from '../src/experience/scenes/field/fieldTintLayout.js'
import { assetUrl } from '../src/config/assetBase.js'

test('Scene 4 provides one virtual unit of continuous field travel', () => {
  const fieldScene = SCENE_TIMELINE.scenes.find((scene) => scene.id === 'field')

  assert.equal(fieldScene.contentLength, 1)
  assert.equal(fieldScene.freeScroll, true)
  assert.equal(fieldScene.sections[0].id, 'aerial-field')
})

test('field tint assignment is deterministic and individually overridable', () => {
  const input = {
    gridSize: [4, 3],
    overrides: { '2,1': 1 },
    palette: ['#102030', '#abcdef'],
    seed: 42,
  }
  const first = createFieldTintData(input)
  const second = createFieldTintData(input)
  const overriddenPlot = 1 * input.gridSize[0] + 2

  assert.deepEqual(first.data, second.data)
  assert.deepEqual(first.paletteIndices, second.paletteIndices)
  assert.equal(first.paletteIndices[overriddenPlot], 1)
  assert.deepEqual(
    [...first.data.slice(overriddenPlot * 4, overriddenPlot * 4 + 4)],
    [0xab, 0xcd, 0xef, 255],
  )
})

test('the field uses enough geometry overscan to hide the plane boundary', () => {
  assert.equal(
    FIELD_TRIALS_CONFIG.textureUrl,
    assetUrl('field/VariedWheatField.png'),
  )
  assert.ok(FIELD_TRIALS_CONFIG.planeSize >= 40)
  assert.ok(FIELD_TRIALS_CONFIG.gridSize[0] >= 16)
  assert.ok(FIELD_TRIALS_CONFIG.gridSize[1] >= 16)
})

test('Scene 4 keeps its bottom screen shadow independently configurable', () => {
  const shadow = FIELD_TRIALS_CONFIG.screenShadow

  assert.ok(shadow.bottomOpacity > 0)
  assert.ok(shadow.bottomOpacity < 1)
  assert.ok(shadow.cloudOpacity > 0)
  assert.ok(shadow.cloudOpacity < 1)
  assert.ok(shadow.driftAmount > 0)
  assert.ok(shadow.driftSpeed > 0)
  assert.ok(shadow.fadeStart < shadow.fadeEnd)
  assert.equal(shadow.clearSceneProgress, 0.5)
  assert.ok(shadow.transitionProgressShare > 0)
  assert.ok(shadow.transitionProgressShare < 1)
})
