import test from 'node:test'
import assert from 'node:assert/strict'

import { SCENE_TIMELINE } from '../src/config/sceneTimeline.js'
import {
  addVirtualScrollDelta,
  advanceVirtualScroll,
  beginVirtualScrollInteraction,
  createVirtualScrollState,
  endVirtualScrollInteraction,
  jumpVirtualScrollToPosition,
  stepVirtualScrollScene,
  VIRTUAL_SCROLL,
} from '../src/experience/virtualScroll.js'
import { resolveSceneTimeline } from '../src/experience/sceneTimeline.js'

function createStateAt(position) {
  const state = createVirtualScrollState(SCENE_TIMELINE)
  state.current = position
  state.target = position
  return state
}

function settle(state, frameCount = 900, frameDelta = 1 / 60) {
  for (let frame = 0; frame < frameCount; frame += 1) {
    advanceVirtualScroll(state, frameDelta)
  }
  return state
}

test('direct input keeps its exact target after input goes idle', () => {
  const state = createStateAt(3)

  addVirtualScrollDelta(state, 0.4)
  settle(state)

  assert.equal(state.target, 3.4)
  assert.equal(state.current, 3.4)
  assert.equal(state.isSnapping, false)
})

test('a diagonal transition remains continuous while wheel input is active', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.1)

  addVirtualScrollDelta(state, 0.5)
  advanceVirtualScroll(
    state,
    VIRTUAL_SCROLL.transitionSettleDelaySeconds * 0.5,
  )

  assert.equal(state.target, sceneTwo.transitionStart + 0.4)
  assert.equal(
    resolveSceneTimeline(state.target, state.timeline).phase,
    'transition',
  )
  assert.equal(state.isSnapping, false)
})

test('idle input in the first half of a transition settles to its start', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.1)

  addVirtualScrollDelta(state, 0.4)
  settle(state)

  assert.equal(state.target, sceneTwo.transitionStart)
  assert.equal(state.current, sceneTwo.transitionStart)
  assert.equal(state.damping, VIRTUAL_SCROLL.transitionSettleDamping)
})

test('idle input in the second half of a transition settles to its end', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.1)

  addVirtualScrollDelta(state, 0.8)
  settle(state)

  assert.equal(state.target, sceneTwo.end)
  assert.equal(state.current, sceneTwo.end)
  assert.equal(state.damping, VIRTUAL_SCROLL.transitionSettleDamping)
})

test('an exact transition midpoint settles in the input direction', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const forward = createStateAt(sceneTwo.transitionStart - 0.1)
  const reverse = createStateAt(sceneTwo.end + 0.1)

  addVirtualScrollDelta(forward, 0.6)
  addVirtualScrollDelta(reverse, -0.6)
  advanceVirtualScroll(forward, VIRTUAL_SCROLL.transitionSettleDelaySeconds)
  advanceVirtualScroll(reverse, VIRTUAL_SCROLL.transitionSettleDelaySeconds)

  assert.equal(forward.target, sceneTwo.end)
  assert.equal(reverse.target, sceneTwo.transitionStart)
})

test('forward scene-edge crossings do not consume input', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.05)

  addVirtualScrollDelta(state, 0.084)

  assert.equal(state.target, sceneTwo.transitionStart + 0.034)
  assert.equal(state.isSnapping, false)
})

test('reverse scene-edge crossings do not consume input', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.start + 0.05)

  addVirtualScrollDelta(state, -0.084)

  assert.equal(state.target, sceneTwo.start - 0.034)
  assert.equal(state.isSnapping, false)
})

test('touch release preserves the continuous target', () => {
  const state = createStateAt(3)

  beginVirtualScrollInteraction(state)
  addVirtualScrollDelta(state, 0.35)
  advanceVirtualScroll(state, 1 / 60)
  endVirtualScrollInteraction(state)

  assert.equal(state.target, 3.35)
  assert.equal(state.isInteracting, false)
  assert.equal(state.isSnapping, false)
})

test('touch release settles a diagonal transition immediately', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.1)

  beginVirtualScrollInteraction(state)
  addVirtualScrollDelta(state, 0.8)
  endVirtualScrollInteraction(state)

  assert.equal(state.target, sceneTwo.end)
  assert.equal(state.isInteracting, false)
  assert.equal(state.isSnapping, true)
})

test('direct reversal discards only the unrendered target backlog', () => {
  const state = createStateAt(3)
  state.target = 3.4

  addVirtualScrollDelta(state, -0.2)

  assert.equal(state.target, 2.8)
  assert.equal(state.inputDirection, -1)
})

test('direct input cancels a keyboard or menu settle from the visible frame', () => {
  const state = createStateAt(3)
  state.target = 3.5
  state.isSnapping = true

  addVirtualScrollDelta(state, 0.2)

  assert.equal(state.target, 3.2)
  assert.equal(state.isSnapping, false)
})

test('reduced motion preserves continuous positions without interpolation', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.05)
  state.reducedMotion = true

  addVirtualScrollDelta(state, 0.084)
  advanceVirtualScroll(state, 1 / 60)

  assert.equal(state.target, sceneTwo.transitionStart + 0.034)
  assert.equal(state.current, state.target)
})

test('keyboard input remains incremental inside long scenes', () => {
  const forward = createStateAt(3)
  const reverse = createStateAt(3)

  stepVirtualScrollScene(forward, 1)
  stepVirtualScrollScene(reverse, -1)

  assert.equal(forward.target, 3 + VIRTUAL_SCROLL.freeScrollKeyboardStep)
  assert.equal(reverse.target, 3 - VIRTUAL_SCROLL.freeScrollKeyboardStep)
  assert.equal(forward.isSnapping, true)
  assert.equal(reverse.isSnapping, true)
})

test('keyboard input completes only the nearby transition at scene edges', () => {
  const sceneOne = SCENE_TIMELINE.scenes[0]
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const forward = createStateAt(sceneTwo.transitionStart - 0.3)
  const reverse = createStateAt(sceneTwo.start + 0.3)

  stepVirtualScrollScene(forward, 1)
  stepVirtualScrollScene(reverse, -1)

  assert.equal(forward.target, sceneTwo.end)
  assert.equal(reverse.target, sceneOne.transitionStart)
})

test('keyboard input resolves an active transition in either direction', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const transitionPosition = sceneTwo.transitionStart + 0.4
  const forward = createStateAt(transitionPosition)
  const reverse = createStateAt(transitionPosition)

  stepVirtualScrollScene(forward, 1)
  stepVirtualScrollScene(reverse, -1)

  assert.equal(forward.target, sceneTwo.end)
  assert.equal(reverse.target, sceneTwo.transitionStart)
})

test('keyboard input uses semantic stops in non-free-scroll scenes', () => {
  const landing = SCENE_TIMELINE.scenes[0]
  const forward = createStateAt(landing.start)
  const reverse = createStateAt(landing.start)

  stepVirtualScrollScene(forward, 1)
  stepVirtualScrollScene(reverse, -1)

  assert.equal(forward.target, SCENE_TIMELINE.scenes[1].start)
  assert.equal(reverse.target, landing.leadingHoldStart)
})

test('menu jumps retain their deliberate semantic settle', () => {
  const state = createStateAt(SCENE_TIMELINE.scenes[0].start)
  const target = SCENE_TIMELINE.scenes[3].start

  jumpVirtualScrollToPosition(state, target)

  assert.equal(state.target, target)
  assert.equal(state.isSnapping, true)
  assert.ok(state.damping < VIRTUAL_SCROLL.damping)
})

test('menu jumps complete exact scene boundaries without a long transition tail', () => {
  const state = createStateAt(SCENE_TIMELINE.scenes[0].start)
  const target = SCENE_TIMELINE.scenes[1].start

  jumpVirtualScrollToPosition(state, target)
  settle(state, 180)

  assert.equal(state.current, target)
  assert.equal(state.isSnapping, false)
  assert.equal(resolveSceneTimeline(state.current, state.timeline).phase, 'section')
})

test('direct input reaches most of its target within one second', () => {
  const state = createStateAt(3)

  addVirtualScrollDelta(state, 1)
  settle(state, 60)

  assert.ok(state.current > 3.98)
})

test('continuous damping is frame-rate independent', () => {
  const atSixtyFps = createStateAt(3)
  const atThirtyFps = createStateAt(3)
  atSixtyFps.target = 4
  atThirtyFps.target = 4

  settle(atSixtyFps, 60, 1 / 60)
  settle(atThirtyFps, 30, 1 / 30)

  assert.ok(Math.abs(atSixtyFps.current - atThirtyFps.current) < 1e-10)
})
