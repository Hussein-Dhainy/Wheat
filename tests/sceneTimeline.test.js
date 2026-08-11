import test from 'node:test'
import assert from 'node:assert/strict'

import {
  compileSceneTimeline,
  getAdjacentSnapPosition,
  getNearestSnapPosition,
  resolveSceneTimeline,
} from '../src/experience/sceneTimeline.js'

const EPSILON = 1e-10

const REGISTRY_FIXTURE = [
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
]

const TIMELINE = compileSceneTimeline(REGISTRY_FIXTURE)

function assertClose(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `expected ${actual} to be close to ${expected}`,
  )
}

function assertResolved(position, expected) {
  const result = resolveSceneTimeline(position, TIMELINE)
  Object.entries(expected).forEach(([key, value]) => {
    if (typeof value === 'number' && !Number.isInteger(value)) {
      assertClose(result[key], value)
    } else {
      assert.equal(result[key], value, `${key} at position ${position}`)
    }
  })
}

test('compileSceneTimeline creates contiguous variable-length segments', () => {
  assert.equal(TIMELINE.cycleLength, 7)
  assert.deepEqual(TIMELINE.snapOffsets, [0, 2, 4, 5.5])
  assert.deepEqual(
    TIMELINE.segments.map((segment) => ({
      end: segment.end,
      start: segment.start,
      type: segment.type,
    })),
    [
      { end: 1, start: 0, type: 'section' },
      { end: 2, start: 1, type: 'transition' },
      { end: 4, start: 2, type: 'section' },
      { end: 5, start: 4, type: 'section' },
      { end: 5.5, start: 5, type: 'transition' },
      { end: 6, start: 5.5, type: 'section' },
      { end: 7, start: 6, type: 'transition' },
    ],
  )

  TIMELINE.segments.forEach((segment, index) => {
    if (index > 0) assert.equal(segment.start, TIMELINE.segments[index - 1].end)
    assert.ok(segment.end > segment.start)
  })
})

test('compileSceneTimeline does not mutate configuration and freezes output', () => {
  const registry = structuredClone(REGISTRY_FIXTURE)
  const before = structuredClone(registry)
  const timeline = compileSceneTimeline(registry)

  assert.deepEqual(registry, before)
  assert.equal(Object.isFrozen(timeline), true)
  assert.equal(Object.isFrozen(timeline.segments), true)
})

test('default configuration preserves one immediate transition per scene', () => {
  const timeline = compileSceneTimeline([{ id: 'a' }, { id: 'b' }])

  assert.equal(timeline.cycleLength, 2)
  assert.deepEqual(timeline.snapOffsets, [0, 1])
  assert.deepEqual(timeline.segments.map((segment) => segment.type), [
    'transition',
    'transition',
  ])
})

test('resolveSceneTimeline maps sections and major transitions', () => {
  assertResolved(0, {
    currentIndex: 0,
    phase: 'section',
    sectionId: 'main',
    sectionProgress: 0,
  })
  assertResolved(0.5, { phase: 'section', sectionProgress: 0.5 })
  assertResolved(1, {
    currentIndex: 0,
    nextIndex: 1,
    phase: 'transition',
    progress: 0,
  })
  assertResolved(1.5, { phase: 'transition', progress: 0.5 })
  assertResolved(2, {
    currentIndex: 1,
    phase: 'section',
    sectionId: 'b1',
    sectionProgress: 0,
  })
  assertResolved(3, {
    sceneProgress: 1 / 3,
    sectionId: 'b1',
    sectionProgress: 0.5,
  })
  assertResolved(4, {
    sectionId: 'b2',
    sectionIndex: 1,
    sectionProgress: 0,
  })
  assertResolved(4.75, { sectionId: 'b2', sectionProgress: 0.75 })
  assertResolved(5.25, { phase: 'transition', progress: 0.5 })
  assertResolved(5.5, { currentIndex: 2, phase: 'section', progress: 0 })
  assertResolved(6.5, {
    currentIndex: 2,
    nextIndex: 0,
    phase: 'transition',
    progress: 0.5,
  })
  assertResolved(7, { currentIndex: 0, cycleIndex: 1, cyclePosition: 0 })
})

test('resolveSceneTimeline maps negative positions through the prior cycle', () => {
  assertResolved(-0.25, {
    currentIndex: 2,
    cycleIndex: -1,
    phase: 'transition',
    progress: 0.75,
  })
  assertResolved(-1, { currentIndex: 2, phase: 'transition', progress: 0 })
  assertResolved(-1.25, {
    currentIndex: 2,
    phase: 'section',
    sectionProgress: 0.5,
  })
  assertResolved(-2, { currentIndex: 1, phase: 'transition', progress: 0 })
  assertResolved(-3, { currentIndex: 1, sectionId: 'b2', sectionProgress: 0 })
  assertResolved(-7, { currentIndex: 0, cycleIndex: -1, cyclePosition: 0 })
})

test('timeline resolution is periodic across positive and negative cycles', () => {
  const reference = resolveSceneTimeline(4.25, TIMELINE)

  for (const cycle of [-3, -1, 1, 3]) {
    const result = resolveSceneTimeline(4.25 + cycle * TIMELINE.cycleLength, TIMELINE)
    assert.equal(result.currentIndex, reference.currentIndex)
    assert.equal(result.sectionId, reference.sectionId)
    assertClose(result.sectionProgress, reference.sectionProgress)
    assert.equal(result.cycleIndex, reference.cycleIndex + cycle)
  }
})

test('nearest periodic snap respects irregular gaps and directional ties', () => {
  assert.equal(getNearestSnapPosition(0, 1, TIMELINE), 0)
  assert.equal(getNearestSnapPosition(1, 1, TIMELINE), 2)
  assert.equal(getNearestSnapPosition(1, -1, TIMELINE), 0)
  assert.equal(getNearestSnapPosition(3, 1, TIMELINE), 4)
  assert.equal(getNearestSnapPosition(3, -1, TIMELINE), 2)
  assert.equal(getNearestSnapPosition(4.8, 1, TIMELINE), 5.5)
  assert.equal(getNearestSnapPosition(4.75, 1, TIMELINE), 5.5)
  assert.equal(getNearestSnapPosition(4.75, -1, TIMELINE), 4)
  assert.equal(getNearestSnapPosition(6.25, 1, TIMELINE), 7)
  assert.equal(getNearestSnapPosition(6.25, -1, TIMELINE), 5.5)
  assert.equal(getNearestSnapPosition(-0.75, 1, TIMELINE), 0)
  assert.equal(getNearestSnapPosition(-0.75, -1, TIMELINE), -1.5)
})

test('adjacent periodic snap steps through semantic section starts', () => {
  assert.equal(getAdjacentSnapPosition(0, 1, TIMELINE), 2)
  assert.equal(getAdjacentSnapPosition(0, -1, TIMELINE), -1.5)
  assert.equal(getAdjacentSnapPosition(3, 1, TIMELINE), 4)
  assert.equal(getAdjacentSnapPosition(3, -1, TIMELINE), 2)
  assert.equal(getAdjacentSnapPosition(5.5, 1, TIMELINE), 7)
  assert.equal(getAdjacentSnapPosition(5.5, -1, TIMELINE), 4)
})

test('compileSceneTimeline rejects ambiguous or invalid configuration', () => {
  assert.throws(() => compileSceneTimeline([{ id: 'only' }]), RangeError)
  assert.throws(
    () => compileSceneTimeline([{ id: 'same' }, { id: 'same' }]),
    RangeError,
  )
  assert.throws(
    () => compileSceneTimeline([
      { id: 'a', timeline: { exitTransitionLength: 0 } },
      { id: 'b' },
    ]),
    RangeError,
  )
  assert.throws(
    () => compileSceneTimeline([
      {
        id: 'a',
        timeline: {
          sections: [
            { id: 'same', scrollLength: 1 },
            { id: 'same', scrollLength: 1 },
          ],
        },
      },
      { id: 'b' },
    ]),
    RangeError,
  )

  for (const scrollLength of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => compileSceneTimeline([
        {
          id: 'a',
          timeline: { sections: [{ id: 'bad', scrollLength }] },
        },
        { id: 'b' },
      ]),
    )
  }
})
