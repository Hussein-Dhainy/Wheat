import test from 'node:test'
import assert from 'node:assert/strict'

import { SCENE_TIMELINE } from '../src/config/sceneTimeline.js'
import {
  applyIncomingSceneMotion,
  applyOutgoingSceneMotion,
} from '../src/experience/sceneMotion.js'

function createMotionState() {
  return {
    motionProgress: 0,
    transitionMotionOffset: 0,
  }
}

test('outgoing scene motion continues beyond its narrative endpoint', () => {
  const state = createMotionState()

  applyOutgoingSceneMotion(state, 'transition', 1, 0.5, 0.2)

  assert.equal(state.motionProgress, 1.1)
  assert.equal(state.transitionMotionOffset, 0.5)
})

test('incoming scene motion reaches zero exactly as its wipe completes', () => {
  const state = createMotionState()

  applyIncomingSceneMotion(state, 'transition', 0, 0.2)
  assert.equal(state.motionProgress, -0.2)
  assert.equal(state.transitionMotionOffset, -1)

  applyIncomingSceneMotion(state, 'transition', 0.5, 0.2)
  assert.equal(state.motionProgress, -0.1)
  assert.equal(state.transitionMotionOffset, -0.5)

  applyIncomingSceneMotion(state, 'transition', 1, 0.2)
  assert.equal(state.motionProgress, 0)
  assert.equal(state.transitionMotionOffset, 0)
})

test('transition motion retraces the same values when progress reverses', () => {
  const outgoing = createMotionState()
  const incoming = createMotionState()

  applyOutgoingSceneMotion(outgoing, 'transition', 1, 0.75, 0.2)
  applyIncomingSceneMotion(incoming, 'transition', 0.75, 0.2)
  const forwardValues = [outgoing.motionProgress, incoming.motionProgress]

  applyOutgoingSceneMotion(outgoing, 'transition', 1, 0.25, 0.2)
  applyIncomingSceneMotion(incoming, 'transition', 0.25, 0.2)

  assert.deepEqual(forwardValues, [1.15, -0.05])
  assert.deepEqual(
    [outgoing.motionProgress, incoming.motionProgress],
    [1.05, -0.15000000000000002],
  )
})

test('every scene declares reversible entry and exit motion distances', () => {
  SCENE_TIMELINE.scenes.forEach((scene) => {
    assert.ok(scene.transitionEntryDistance > 0)
    assert.ok(scene.transitionExitDistance > 0)
  })

  const result = SCENE_TIMELINE.scenes.at(-1)
  const landing = SCENE_TIMELINE.scenes[0]
  assert.equal(result.transitionExitDistance, 0.2)
  assert.equal(landing.transitionEntryDistance, 0.2)
})

test('ordinary scene content keeps motion and narrative progress identical', () => {
  const state = createMotionState()

  applyOutgoingSceneMotion(state, 'section', 0.42, 0, 0.2)

  assert.equal(state.motionProgress, 0.42)
  assert.equal(state.transitionMotionOffset, 0)
})
