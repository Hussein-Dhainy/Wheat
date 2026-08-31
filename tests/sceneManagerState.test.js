import test from 'node:test'
import assert from 'node:assert/strict'

import {
  COMPOSITOR_RENDER_SCALE,
  createOverlayUpdateSignature,
  createWarmupTracker,
  getCompositorRenderTargetSize,
} from '../src/experience/sceneManagerPerformance.js'

function createTransition(overrides = {}) {
  return {
    currentIndex: 2,
    cycleIndex: 0,
    leadingHoldProgress: 1,
    nextIndex: 3,
    phase: 'section',
    progress: 0,
    sceneProgress: 0.25,
    sectionId: 'prediction-tests',
    sectionIndex: 0,
    sectionProgress: 0.25,
    ...overrides,
  }
}

test('overlay signature ignores motion below visible DOM precision', () => {
  const transition = createTransition()
  const first = createOverlayUpdateSignature(
    { current: 2.25, target: 2.25 },
    transition,
  )
  const subPixelChange = createOverlayUpdateSignature(
    { current: 2.250001, target: 2.25 },
    createTransition({ sceneProgress: 0.250001 }),
  )

  assert.equal(first, subPixelChange)
})

test('overlay signature changes with user-visible timeline state', () => {
  const first = createOverlayUpdateSignature(
    { current: 2.25, target: 2.25 },
    createTransition(),
  )
  const next = createOverlayUpdateSignature(
    { current: 2.3, target: 2.4 },
    createTransition({ sceneProgress: 0.3, sectionProgress: 0.3 }),
  )

  assert.notEqual(first, next)
})

test('compositor render targets use the configured conservative scale', () => {
  assert.equal(COMPOSITOR_RENDER_SCALE, 0.85)
  assert.deepEqual(
    getCompositorRenderTargetSize(2880, 1620),
    { width: 2448, height: 1377 },
  )
  assert.deepEqual(
    getCompositorRenderTargetSize(0, 0),
    { width: 1, height: 1 },
  )
})

test('preloader warm-up waits for main scenes and the private prediction backdrop', () => {
  let completionCount = 0
  const tracker = createWarmupTracker(
    ['main-scenes', 'prediction-backdrop'],
    () => { completionCount += 1 },
  )

  assert.equal(tracker.markComplete('main-scenes'), false)
  assert.equal(completionCount, 0)
  assert.equal(tracker.markComplete('main-scenes'), false)
  assert.equal(tracker.markComplete('prediction-backdrop'), true)
  assert.equal(completionCount, 1)
  assert.equal(tracker.markComplete('prediction-backdrop'), false)
  assert.equal(completionCount, 1)
})
