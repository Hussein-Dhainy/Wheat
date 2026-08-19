import test from 'node:test'
import assert from 'node:assert/strict'

import { SCENE_TIMELINE } from '../src/config/sceneTimeline.js'
import {
  addVirtualScrollDelta,
  advanceVirtualScroll,
  beginVirtualScrollInteraction,
  createVirtualScrollState,
  endVirtualScrollInteraction,
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

test('Scene 2 does not settle when its target remains inside the scene', () => {
  const state = createStateAt(3)
  addVirtualScrollDelta(state, 0.4)

  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(state.target, 3.4)
  assert.equal(state.snapPending, false)
})

test('Scene 2 settles forward entry on the fully visible seed carousel', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const carouselSnap = sceneTwo.freeScrollSnapRanges.find(
    (range) => range.id === 'seed-carousel-arrival',
  )
  const state = createStateAt(
    sceneTwo.start + sceneTwo.contentLength * 0.79,
  )

  addVirtualScrollDelta(state, sceneTwo.contentLength * 0.02)
  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(
    state.target,
    sceneTwo.start + sceneTwo.contentLength * carouselSnap.targetProgress,
  )
  assert.equal(state.isSnapping, true)
  assert.equal(state.snapPending, false)
})

test('Scene 2 carousel snap does not resist upward scrolling out', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const start = sceneTwo.start + sceneTwo.contentLength * 0.9
  const state = createStateAt(start)

  addVirtualScrollDelta(state, -sceneTwo.contentLength * 0.05)
  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(state.target, start - sceneTwo.contentLength * 0.05)
})

test('Scene 2 requires additional pressure after a forward boundary crossing', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const forward = createStateAt(sceneTwo.transitionStart - 0.05)
  addVirtualScrollDelta(forward, 0.084)
  advanceVirtualScroll(forward, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(forward.target, sceneTwo.transitionStart)
  assert.equal(forward.current < sceneTwo.transitionStart, true)

  addVirtualScrollDelta(forward, sceneTwo.forwardExitResistance - 0.01)
  assert.equal(forward.target, sceneTwo.transitionStart)

  addVirtualScrollDelta(forward, 0.01)
  assert.equal(forward.target, sceneTwo.end)
})

test('Scene 2 reverse crossing first settles on the fully visible DNA', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const reverse = createStateAt(sceneTwo.start + 0.05)
  addVirtualScrollDelta(reverse, -0.084)
  advanceVirtualScroll(reverse, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(reverse.target, sceneTwo.start)
  assert.equal(reverse.boundaryResistanceBoundary, sceneTwo.start)
})

test('one additional upward push releases the Scene 2 reverse detent', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const previousScene = SCENE_TIMELINE.scenes[0]
  const reverse = createStateAt(sceneTwo.start + 0.05)
  addVirtualScrollDelta(reverse, -0.084)

  addVirtualScrollDelta(reverse, -sceneTwo.reverseEntryResistance)

  assert.equal(reverse.target, previousScene.transitionStart)
  assert.equal(reverse.boundaryResistanceBoundary, null)
})

test('Scene 2 resistance cannot settle on a partially visible diagonal', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.05)
  addVirtualScrollDelta(state, 0.084)

  for (let frame = 0; frame < 600; frame += 1) {
    advanceVirtualScroll(state, 1 / 60)
  }

  const position = resolveSceneTimeline(state.current, state.timeline)
  assert.equal(state.current, sceneTwo.transitionStart)
  assert.equal(position.currentIndex, sceneTwo.index)
  assert.equal(position.progress, 0)
})

test('touch release holds at the Scene 2 detent until another push', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.03)
  beginVirtualScrollInteraction(state)
  addVirtualScrollDelta(state, 0.06)
  advanceVirtualScroll(state, 1 / 60)

  endVirtualScrollInteraction(state)

  assert.equal(state.target, sceneTwo.transitionStart)
  assert.equal(state.snapPending, false)

  beginVirtualScrollInteraction(state)
  addVirtualScrollDelta(state, sceneTwo.forwardExitResistance)
  endVirtualScrollInteraction(state)

  assert.equal(state.target, sceneTwo.end)
})

test('entering Scene 2 from Scene 1 still settles to the scene boundary', () => {
  const state = createStateAt(1.6)
  addVirtualScrollDelta(state, 0.3)

  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(state.target, 1.75)
})

test('same-direction wheel input carries through the Scene 1 to 2 boundary', () => {
  const state = createStateAt(1.3)
  state.target = 1.75
  state.isSnapping = true

  addVirtualScrollDelta(state, 0.56)

  assert.ok(state.target > SCENE_TIMELINE.scenes[1].start)
  assert.equal(state.target, 1.86)
  assert.equal(state.isSnapping, false)
  assert.equal(state.snapPending, true)
})

test('repeated forward wheel input reaches Scene 2 without waiting to settle', () => {
  const state = createStateAt(SCENE_TIMELINE.scenes[0].start)

  for (let event = 0; event < 4; event += 1) {
    addVirtualScrollDelta(state, 0.56)
    for (let frame = 0; frame < 6; frame += 1) {
      advanceVirtualScroll(state, 1 / 60)
    }
  }

  assert.ok(state.current > SCENE_TIMELINE.scenes[1].start)
  assert.ok(state.target > SCENE_TIMELINE.scenes[1].start)
})

test('keyboard input moves incrementally within Scene 2', () => {
  const forward = createStateAt(3)
  stepVirtualScrollScene(forward, 1)

  const reverse = createStateAt(3)
  stepVirtualScrollScene(reverse, -1)

  assert.equal(forward.target, 3 + VIRTUAL_SCROLL.freeScrollKeyboardStep)
  assert.equal(reverse.target, 3 - VIRTUAL_SCROLL.freeScrollKeyboardStep)
})

test('keyboard input respects both Scene 2 boundary detents', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const previousScene = SCENE_TIMELINE.scenes[0]
  const forward = createStateAt(sceneTwo.transitionStart - 0.3)
  stepVirtualScrollScene(forward, 1)
  assert.equal(forward.target, sceneTwo.transitionStart)
  stepVirtualScrollScene(forward, 1)

  const reverse = createStateAt(sceneTwo.start + 0.3)
  stepVirtualScrollScene(reverse, -1)

  assert.equal(forward.target, sceneTwo.end)
  assert.equal(reverse.target, sceneTwo.start)
  stepVirtualScrollScene(reverse, -1)
  assert.equal(reverse.target, previousScene.transitionStart)
})

test('reduced motion keeps the Scene 2 detent without a partial frame', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.05)
  state.reducedMotion = true
  addVirtualScrollDelta(state, 0.084)

  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(state.target, sceneTwo.transitionStart)
  assert.equal(state.current, sceneTwo.transitionStart)

  addVirtualScrollDelta(state, sceneTwo.forwardExitResistance)
  advanceVirtualScroll(state, 1 / 60)

  assert.equal(state.target, sceneTwo.end)
  assert.equal(state.current, sceneTwo.end)
})

test('reversing while Scene 2 resistance is armed cancels it immediately', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart - 0.02)
  addVirtualScrollDelta(state, 0.03)

  assert.equal(state.target, sceneTwo.transitionStart)
  assert.equal(state.boundaryResistanceBoundary, sceneTwo.transitionStart)

  addVirtualScrollDelta(state, -0.04)

  assert.equal(state.boundaryResistanceBoundary, null)
  assert.ok(state.target < sceneTwo.transitionStart)
})

test('magnetic settling remains enabled outside Scene 2', () => {
  const state = createStateAt(6.2)
  addVirtualScrollDelta(state, 0.2)

  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(state.target, 6.75)
})

test('one reverse wheel event settles from the Scene 3 anchor to Scene 2', () => {
  const sceneThreeStart = SCENE_TIMELINE.scenes[2].start
  const sceneTwoTransitionStart = SCENE_TIMELINE.scenes[1].transitionStart
  const state = createStateAt(sceneThreeStart)

  addVirtualScrollDelta(state, -0.56)
  advanceVirtualScroll(state, VIRTUAL_SCROLL.snapDelaySeconds)

  assert.equal(state.target, sceneTwoTransitionStart)
  assert.equal(state.isSnapping, true)
  assert.equal(state.snapPending, false)
})

test('one reverse wheel event returns from visible Scene 3 to Scene 2', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const visibleSceneThreePosition = sceneTwo.transitionStart
    + sceneTwo.exitTransitionLength * 0.6
  const state = createStateAt(visibleSceneThreePosition)

  addVirtualScrollDelta(state, -0.56)

  assert.equal(state.target, sceneTwo.transitionStart)
  assert.equal(state.isSnapping, true)
  assert.equal(state.snapPending, false)
})

test('reversing an in-progress Scene 2 to 3 transition commits backward', () => {
  const sceneTwo = SCENE_TIMELINE.scenes[1]
  const state = createStateAt(sceneTwo.transitionStart + 0.6)
  state.target = sceneTwo.end
  state.isSnapping = true

  addVirtualScrollDelta(state, -0.56)

  assert.equal(state.target, sceneTwo.transitionStart)
  assert.equal(state.isSnapping, true)
  assert.equal(state.snapPending, false)
})
