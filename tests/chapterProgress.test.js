import assert from 'node:assert/strict'
import test from 'node:test'
import { SCENE_TIMELINE } from '../src/config/sceneTimeline.js'
import { resolveChapterProgress } from '../src/ui/ChapterProgress/chapterProgress.js'

test('chapter progress stays hidden on the landing scene', () => {
  assert.deepEqual(
    resolveChapterProgress(SCENE_TIMELINE.initialPosition, SCENE_TIMELINE),
    { activeIndex: -1, progress: 0, visible: false },
  )
})

test('chapter progress follows chapter ranges rather than individual scenes', () => {
  const genetics = SCENE_TIMELINE.scenes.find(({ id }) => id === 'genetics')
  const prediction = SCENE_TIMELINE.scenes.find(({ id }) => id === 'prediction')
  const field = SCENE_TIMELINE.scenes.find(({ id }) => id === 'field')
  const result = SCENE_TIMELINE.scenes.find(({ id }) => id === 'result')

  assert.equal(
    resolveChapterProgress(genetics.start, SCENE_TIMELINE).activeIndex,
    0,
  )
  assert.equal(
    resolveChapterProgress(prediction.start, SCENE_TIMELINE).activeIndex,
    1,
  )
  assert.equal(
    resolveChapterProgress(field.start, SCENE_TIMELINE).activeIndex,
    1,
  )
  assert.equal(
    resolveChapterProgress(result.start, SCENE_TIMELINE).activeIndex,
    2,
  )
})

test('chapter highlight changes halfway through the incoming transition', () => {
  const prediction = SCENE_TIMELINE.scenes.find(({ id }) => id === 'prediction')
  const transition = SCENE_TIMELINE.segments.find((segment) => (
    segment.type === 'transition' && segment.nextIndex === prediction.index
  ))
  const boundary = transition.start + transition.length * 0.5
  const before = resolveChapterProgress(boundary - 0.001, SCENE_TIMELINE)
  const after = resolveChapterProgress(boundary + 0.001, SCENE_TIMELINE)

  assert.equal(before.activeIndex, 0)
  assert.ok(before.progress > 0.99)
  assert.equal(after.activeIndex, 1)
  assert.ok(after.progress < 0.01)
})

test('chapter progress increases continuously and wraps back to landing', () => {
  const prediction = SCENE_TIMELINE.scenes.find(({ id }) => id === 'prediction')
  const result = SCENE_TIMELINE.scenes.find(({ id }) => id === 'result')
  const predictionBoundary = prediction.start - prediction.exitTransitionLength * 0.5
  const resultBoundary = result.start - result.exitTransitionLength * 0.5
  const midpoint = (predictionBoundary + resultBoundary) / 2
  const state = resolveChapterProgress(midpoint, SCENE_TIMELINE)

  assert.equal(state.activeIndex, 1)
  assert.equal(state.progress, 0.5)
  assert.equal(
    resolveChapterProgress(SCENE_TIMELINE.cycleLength, SCENE_TIMELINE).visible,
    false,
  )
})
