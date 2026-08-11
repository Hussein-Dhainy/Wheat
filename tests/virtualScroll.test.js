import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addVirtualScrollDelta,
  advanceVirtualScroll,
  beginVirtualScrollInteraction,
  createVirtualScrollState,
  endVirtualScrollInteraction,
  getNearestScenePosition,
  normalizeWheelDelta,
  stepVirtualScrollScene,
  VIRTUAL_SCROLL,
} from '../src/experience/virtualScroll.js'
import { compileSceneTimeline } from '../src/experience/sceneTimeline.js'

const IRREGULAR_TIMELINE = compileSceneTimeline([
  {
    id: 'a',
    timeline: {
      sections: [{ id: 'main', scrollLength: 1 }],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'b',
    timeline: {
      sections: [
        { id: 'b1', scrollLength: 2 },
        { id: 'b2', scrollLength: 1 },
      ],
      exitTransitionLength: 0.5,
    },
  },
  {
    id: 'c',
    timeline: {
      sections: [{ id: 'main', scrollLength: 0.5 }],
      exitTransitionLength: 1,
    },
  },
])

function simulateFrames(fps, seconds, target = 1) {
  const state = createVirtualScrollState()
  state.target = target

  for (let frame = 0; frame < fps * seconds; frame += 1) {
    advanceVirtualScroll(state, 1 / fps)
  }

  return state.current
}

test('wheel deltas normalize pixel, line, and page modes', () => {
  assert.equal(
    normalizeWheelDelta(100, 0, 900),
    Math.min(100, VIRTUAL_SCROLL.wheelPixelLimit) * VIRTUAL_SCROLL.wheelSensitivity,
  )
  assert.equal(
    normalizeWheelDelta(2, 1, 900),
    Math.min(32, VIRTUAL_SCROLL.wheelPixelLimit) * VIRTUAL_SCROLL.wheelSensitivity,
  )
  assert.equal(
    normalizeWheelDelta(1, 2, 900),
    VIRTUAL_SCROLL.wheelPixelLimit * VIRTUAL_SCROLL.wheelSensitivity,
  )
})

test('wheel normalization caps unusually large input bursts', () => {
  assert.equal(
    normalizeWheelDelta(10_000, 0, 900),
    VIRTUAL_SCROLL.wheelPixelLimit * VIRTUAL_SCROLL.wheelSensitivity,
  )
  assert.equal(
    normalizeWheelDelta(-10_000, 0, 900),
    -VIRTUAL_SCROLL.wheelPixelLimit * VIRTUAL_SCROLL.wheelSensitivity,
  )
})

test('damping is frame-rate independent', () => {
  const at30 = simulateFrames(30, 1)
  const at60 = simulateFrames(60, 1)
  const at120 = simulateFrames(120, 1)

  assert.ok(Math.abs(at30 - at60) < 1e-10)
  assert.ok(Math.abs(at60 - at120) < 1e-10)
})

test('damping approaches the target without overshooting', () => {
  const state = createVirtualScrollState()
  state.target = 1

  for (let frame = 0; frame < 120; frame += 1) {
    const previous = state.current
    advanceVirtualScroll(state, 1 / 60)
    assert.ok(state.current >= previous)
    assert.ok(state.current <= state.target)
  }
})

test('opposite input discards pending lag and reverses on the next frame', () => {
  const state = createVirtualScrollState()
  addVirtualScrollDelta(state, 0.8)
  advanceVirtualScroll(state, 1 / 60)
  const beforeReverse = state.current

  addVirtualScrollDelta(state, -0.1)
  assert.equal(state.target, beforeReverse - 0.1)
  advanceVirtualScroll(state, 1 / 60)

  assert.ok(state.current < beforeReverse)
  assert.equal(state.direction, -1)
})

test('magnetic snapping waits for wheel input to become idle', () => {
  const state = createVirtualScrollState()
  addVirtualScrollDelta(state, 0.7)

  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds - 0.01)
  assert.equal(state.target, 0.7)
  assert.equal(state.snapPending, true)

  advanceVirtualScroll(state, 0.01)
  assert.equal(state.target, 1)
  assert.equal(state.snapPending, false)
  assert.equal(state.isSnapping, true)
})

test('new wheel input resets the idle timer', () => {
  const state = createVirtualScrollState()
  addVirtualScrollDelta(state, 0.3)
  advanceVirtualScroll(state, 0.1)
  addVirtualScrollDelta(state, 0.1)
  advanceVirtualScroll(state, 0.05)

  assert.equal(state.target, 0.4)
  assert.equal(state.snapPending, true)
  assert.equal(state.idleSeconds, 0.05)
})

test('nearest-scene ties follow the latest input direction', () => {
  assert.equal(getNearestScenePosition(0.49, 1), 0)
  assert.equal(getNearestScenePosition(0.51, -1), 1)
  assert.equal(getNearestScenePosition(0.5, 1), 1)
  assert.equal(getNearestScenePosition(0.5, -1), 0)
  assert.equal(getNearestScenePosition(-0.5, -1), -1)
})

test('touch input does not snap while held and snaps on release', () => {
  const state = createVirtualScrollState()
  beginVirtualScrollInteraction(state)
  addVirtualScrollDelta(state, 0.7)
  advanceVirtualScroll(state, 1)

  assert.equal(state.target, 0.7)
  assert.equal(state.snapPending, true)

  endVirtualScrollInteraction(state)
  assert.equal(state.target, 1)
  assert.equal(state.snapPending, false)
  assert.equal(state.isSnapping, true)
})

test('direct input cancels an in-progress magnetic snap', () => {
  const state = createVirtualScrollState()
  addVirtualScrollDelta(state, 0.7)
  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)
  const beforeInput = state.current

  addVirtualScrollDelta(state, -0.1)
  assert.equal(state.target, beforeInput - 0.1)
  assert.equal(state.isSnapping, false)
  assert.equal(state.snapPending, true)
})

test('keyboard input steps exactly one scene and can queue another step', () => {
  const state = createVirtualScrollState()
  stepVirtualScrollScene(state, 1)
  assert.equal(state.target, 1)

  stepVirtualScrollScene(state, 1)
  assert.equal(state.target, 2)

  stepVirtualScrollScene(state, -1)
  assert.equal(state.target, 1)
})

test('timeline-aware magnetic snapping uses irregular semantic stops', () => {
  const state = createVirtualScrollState(IRREGULAR_TIMELINE)
  addVirtualScrollDelta(state, 4.8)
  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(state.target, 5.5)
})

test('timeline-aware keyboard stepping follows adjacent section starts', () => {
  const state = createVirtualScrollState(IRREGULAR_TIMELINE)
  stepVirtualScrollScene(state, 1)
  assert.equal(state.target, 2)

  stepVirtualScrollScene(state, 1)
  assert.equal(state.target, 4)

  stepVirtualScrollScene(state, 1)
  assert.equal(state.target, 5.5)

  stepVirtualScrollScene(state, -1)
  assert.equal(state.target, 4)
})

test('queued timeline stepping anchors on the active snap target', () => {
  const forward = createVirtualScrollState(IRREGULAR_TIMELINE)
  forward.current = 2.2
  forward.target = 4
  forward.isSnapping = true
  stepVirtualScrollScene(forward, 1)
  assert.equal(forward.target, 5.5)

  const reverse = createVirtualScrollState(IRREGULAR_TIMELINE)
  reverse.current = 2.2
  reverse.target = 4
  reverse.isSnapping = true
  stepVirtualScrollScene(reverse, -1)
  assert.equal(reverse.target, 2)
})

test('magnetic snapping remains unbounded in the reverse direction', () => {
  const state = createVirtualScrollState()
  addVirtualScrollDelta(state, -0.7)
  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(state.target, -1)
})

test('reduced motion removes inertial settling', () => {
  const state = createVirtualScrollState()
  state.reducedMotion = true
  state.target = 0.75

  advanceVirtualScroll(state, 1 / 60)
  assert.equal(state.current, 0.75)
})

test('reduced motion applies the magnetic settle without inertia', () => {
  const state = createVirtualScrollState()
  state.reducedMotion = true
  addVirtualScrollDelta(state, 0.7)

  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)
  assert.equal(state.target, 1)
  assert.equal(state.current, 1)
  assert.equal(state.isSnapping, false)
})
