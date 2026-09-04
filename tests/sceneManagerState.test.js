import test from 'node:test'
import assert from 'node:assert/strict'

import {
  COMPOSITOR_RENDER_SCALE,
  createOverlayUpdateSignature,
  createWarmupTracker,
  getCompositorRenderTargetSize,
  renderSceneForWarmup,
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

test('scene warm-up renders off-camera objects and restores their culling', () => {
  const mesh = { frustumCulled: true, isMesh: true }
  const points = { frustumCulled: true, isPoints: true }
  const group = { frustumCulled: true }
  const scene = {
    traverse(callback) {
      ;[mesh, points, group].forEach(callback)
    },
  }
  const camera = {}
  const renderTarget = {}
  let observedDuringRender
  const renderer = {
    render(renderedScene, renderedCamera) {
      assert.equal(renderedScene, scene)
      assert.equal(renderedCamera, camera)
      observedDuringRender = [mesh.frustumCulled, points.frustumCulled]
    },
    setRenderTarget(target) {
      assert.equal(target, renderTarget)
    },
  }

  renderSceneForWarmup(renderer, scene, camera, renderTarget)

  assert.deepEqual(observedDuringRender, [false, false])
  assert.equal(mesh.frustumCulled, true)
  assert.equal(points.frustumCulled, true)
  assert.equal(group.frustumCulled, true)
})

test('scene warm-up restores culling when rendering throws', () => {
  const mesh = { frustumCulled: true, isMesh: true }
  const scene = { traverse: (callback) => callback(mesh) }
  const renderer = {
    render() { throw new Error('warm-up failed') },
    setRenderTarget() {},
  }

  assert.throws(
    () => renderSceneForWarmup(renderer, scene, {}, {}),
    /warm-up failed/,
  )
  assert.equal(mesh.frustumCulled, true)
})
