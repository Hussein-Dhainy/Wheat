function assertFiniteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`)
  }
}

function assertSceneCount(count) {
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new RangeError('count must be a positive safe integer')
  }
}

export function mod(value, count) {
  assertFiniteNumber(value, 'value')
  assertSceneCount(count)

  return ((value % count) + count) % count
}

export function deriveSceneTransition(scroll, sceneCount) {
  assertFiniteNumber(scroll, 'scroll')
  assertSceneCount(sceneCount)

  const baseIndex = Math.floor(scroll)
  const currentIndex = mod(baseIndex, sceneCount)
  const nextIndex = mod(currentIndex + 1, sceneCount)
  const progress = scroll - baseIndex

  return {
    baseIndex,
    currentIndex,
    nextIndex,
    progress,
  }
}

export function getDiagonalBounds(progress, slope, softness) {
  assertFiniteNumber(progress, 'progress')
  assertFiniteNumber(slope, 'slope')
  assertFiniteNumber(softness, 'softness')

  if (softness < 0) {
    throw new RangeError('softness must be nonnegative')
  }

  const clampedProgress = Math.min(1, Math.max(0, progress))
  // Keep the complete feathered edge outside the viewport at both endpoints.
  const startLeft = -softness - Math.max(0, slope)
  const travel = 1 + Math.abs(slope) + softness * 2
  const left = startLeft + travel * clampedProgress

  return {
    left,
    right: left + slope,
  }
}
