import test from 'node:test'
import assert from 'node:assert/strict'

import {
  deriveSceneTransition,
  getDiagonalBounds,
  mod,
} from '../src/experience/sceneMath.js'

const EPSILON = 1e-12

function assertClose(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `expected ${actual} to be close to ${expected}`,
  )
}

function smoothstep(edge0, edge1, value) {
  const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return amount * amount * (3 - 2 * amount)
}

function revealMask(bounds, x, y, softness) {
  const boundary = bounds.left + (bounds.right - bounds.left) * x
  return 1 - smoothstep(boundary - softness, boundary + softness, y)
}

test('mod returns a positive normalized remainder', () => {
  assert.equal(mod(0, 5), 0)
  assert.equal(mod(6, 5), 1)
  assert.equal(mod(-1, 5), 4)
  assert.equal(mod(-11, 5), 4)
})

test('mod rejects invalid scene counts', () => {
  for (const count of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.NaN]) {
    assert.throws(() => mod(1, count), RangeError)
  }
})

test('deriveSceneTransition advances through forward scene pairs', () => {
  assert.deepEqual(deriveSceneTransition(0, 5), {
    baseIndex: 0,
    currentIndex: 0,
    nextIndex: 1,
    progress: 0,
  })

  assert.deepEqual(deriveSceneTransition(1.25, 5), {
    baseIndex: 1,
    currentIndex: 1,
    nextIndex: 2,
    progress: 0.25,
  })

  assert.deepEqual(deriveSceneTransition(7.75, 5), {
    baseIndex: 7,
    currentIndex: 2,
    nextIndex: 3,
    progress: 0.75,
  })
})

test('deriveSceneTransition wraps Scene 5 forward to Scene 1', () => {
  assert.deepEqual(deriveSceneTransition(4.5, 5), {
    baseIndex: 4,
    currentIndex: 4,
    nextIndex: 0,
    progress: 0.5,
  })
})

test('deriveSceneTransition maps negative scroll to the wrapping pair', () => {
  assert.deepEqual(deriveSceneTransition(-0.2, 5), {
    baseIndex: -1,
    currentIndex: 4,
    nextIndex: 0,
    progress: 0.8,
  })
})

test('deriveSceneTransition remains continuous at exact integers', () => {
  const justBeforeZero = deriveSceneTransition(-Number.EPSILON, 5)
  const atZero = deriveSceneTransition(0, 5)
  const justBeforeOne = deriveSceneTransition(1 - Number.EPSILON, 5)
  const atOne = deriveSceneTransition(1, 5)

  assert.equal(justBeforeZero.currentIndex, 4)
  assert.equal(justBeforeZero.nextIndex, 0)
  assert.equal(justBeforeZero.progress, 1 - Number.EPSILON)
  assert.deepEqual(atZero, {
    baseIndex: 0,
    currentIndex: 0,
    nextIndex: 1,
    progress: 0,
  })

  assert.equal(justBeforeOne.currentIndex, 0)
  assert.equal(justBeforeOne.nextIndex, 1)
  assert.equal(justBeforeOne.progress, 1 - Number.EPSILON)
  assert.deepEqual(atOne, {
    baseIndex: 1,
    currentIndex: 1,
    nextIndex: 2,
    progress: 0,
  })
})

test('deriveSceneTransition handles huge positive and negative positions', () => {
  assert.deepEqual(deriveSceneTransition(1_000_000_000_000.75, 5), {
    baseIndex: 1_000_000_000_000,
    currentIndex: 0,
    nextIndex: 1,
    progress: 0.75,
  })

  assert.deepEqual(deriveSceneTransition(-1_000_000_000_000.25, 5), {
    baseIndex: -1_000_000_000_001,
    currentIndex: 4,
    nextIndex: 0,
    progress: 0.75,
  })

  assert.equal(
    deriveSceneTransition(Number.MAX_SAFE_INTEGER, 5).nextIndex,
    2,
  )
  assert.equal(
    deriveSceneTransition(Number.MIN_SAFE_INTEGER, 5).nextIndex,
    0,
  )
})

test('getDiagonalBounds clamps progress to its endpoint bounds', () => {
  assert.deepEqual(
    getDiagonalBounds(-2, 0.4, 0.05),
    getDiagonalBounds(0, 0.4, 0.05),
  )
  assert.deepEqual(
    getDiagonalBounds(3, 0.4, 0.05),
    getDiagonalBounds(1, 0.4, 0.05),
  )
})

test('getDiagonalBounds accepts a hard edge with zero softness', () => {
  assert.deepEqual(getDiagonalBounds(0, 0, 0), { left: 0, right: 0 })
  assert.deepEqual(getDiagonalBounds(1, 0, 0), { left: 1, right: 1 })
})

for (const slope of [0.4, -0.4]) {
  test(`getDiagonalBounds gives full-coverage endpoints for slope ${slope}`, () => {
    const softness = 0.05
    const start = getDiagonalBounds(0, slope, softness)
    const finish = getDiagonalBounds(1, slope, softness)

    assertClose(start.right - start.left, slope)
    assertClose(finish.right - finish.left, slope)
    assert.ok(Math.max(start.left, start.right) + softness <= EPSILON)
    assert.ok(Math.min(finish.left, finish.right) - softness >= 1 - EPSILON)

    for (const x of [0, 1]) {
      for (const y of [0, 1]) {
        assertClose(revealMask(start, x, y, softness), 0)
        assertClose(revealMask(finish, x, y, softness), 1)
      }
    }
  })
}

test('getDiagonalBounds rejects negative softness', () => {
  assert.throws(() => getDiagonalBounds(0.5, 0.4, -0.01), RangeError)
})
