import assert from 'node:assert/strict'
import test from 'node:test'
import { DNA_RENDER_CONFIG } from '../src/experience/scenes/dna/dnaConfig.js'
import { RESULT_SCENE_CONFIG } from '../src/experience/scenes/result/resultConfig.js'
import { WHEAT_GRAIN_ASSET } from '../src/experience/systems/wheatGrain.js'

// Scene 2's camera sits at z = 6 (SceneRegistry). SceneRegistry itself pulls
// in JSX and shaders, so the distance is restated here rather than imported.
const GENETICS_CAMERA_DISTANCE = 6

test('the genetics detail sends the DNA past the camera as the grain grows in', () => {
  const { detail } = DNA_RENDER_CONFIG

  // Travelling further than the camera carries the helix behind the viewer
  // instead of parking it, enlarged, in the middle of the frame.
  assert.ok(detail.dnaTravel[2] > GENETICS_CAMERA_DISTANCE)
  assert.ok(detail.dnaScale > 1)
  assert.ok(detail.dnaFadeRange[0] < detail.dnaFadeRange[1])
  assert.ok(detail.grainRevealRange[0] < detail.grainRevealRange[1])
  // The helix has to finish fading before the grain finishes arriving, or the
  // two read as overlapping subjects rather than one handing off to the other.
  assert.ok(detail.dnaFadeRange[1] <= detail.grainRevealRange[1])
  // The genetics grain is a supporting element, so it stays smaller than the
  // hero grain Scene 5 builds its whole frame around.
  assert.ok(detail.grain.desktopScale < RESULT_SCENE_CONFIG.grain.desktopScale)
  assert.ok(detail.grain.mobileScale <= detail.grain.desktopScale)
})

test('the detail grain is placed by viewport anchor, not a fixed offset', () => {
  const { grain } = DNA_RENDER_CONFIG.detail

  for (const anchor of [grain.desktopAnchor, grain.mobileAnchor]) {
    assert.equal(anchor.length, 2)
    assert.ok(anchor.every((value) => value > 0 && value < 1))
  }

  // Desktop stacks the grain beside the copy on the left; mobile stacks it
  // below, horizontally centred. Both mirror .geneticsDetailRings.
  assert.ok(grain.desktopAnchor[0] < 0.5)
  assert.equal(grain.mobileAnchor[0], 0.5)
  assert.ok(grain.mobileAnchor[1] > grain.desktopAnchor[1])
  assert.ok(grain.depth > 0)
})

test('Scenes 2 and 5 draw their grain from one shared asset contract', () => {
  assert.equal(RESULT_SCENE_CONFIG.modelUrl, WHEAT_GRAIN_ASSET.modelUrl)
  assert.equal(RESULT_SCENE_CONFIG.meshName, WHEAT_GRAIN_ASSET.meshName)
  assert.equal(
    RESULT_SCENE_CONFIG.materialSourceMeshName,
    WHEAT_GRAIN_ASSET.materialSourceMeshName,
  )
  assert.equal(RESULT_SCENE_CONFIG.material, WHEAT_GRAIN_ASSET.material)
  // Both scenes must rotate away from the same rest pose, not two literals
  // that happen to match today.
  assert.equal(
    RESULT_SCENE_CONFIG.grain.baseRotation,
    WHEAT_GRAIN_ASSET.baseRotation,
  )
  assert.equal(
    DNA_RENDER_CONFIG.detail.grain.rotation,
    WHEAT_GRAIN_ASSET.baseRotation,
  )
})
