import * as THREE from 'three'

function smoothInterpolation(progress) {
  return progress * progress * progress
    * (progress * (progress * 6 - 15) + 10)
}

/**
 * Returns a deterministic gradient between -1 and 1 for one integer point.
 * Hashing the coordinate with the seed gives every fiber repeatable noise
 * without storing a lookup table or relying on Math.random().
 */
export function createGradient(integerCoordinate, seed) {
  let hash = Math.imul(integerCoordinate, 0x27d4eb2d) ^ seed
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13

  return ((hash >>> 0) / 4294967295) * 2 - 1
}

/**
 * Samples smooth one-dimensional gradient noise. Each lattice point supplies
 * a slope, and quintic interpolation joins neighboring slopes without corners.
 */
function sampleGradientNoise(position, seed) {
  const leftCoordinate = Math.floor(position)
  const rightCoordinate = leftCoordinate + 1
  const localProgress = position - leftCoordinate
  const interpolation = smoothInterpolation(localProgress)
  const leftValue = createGradient(leftCoordinate, seed) * localProgress
  const rightValue = createGradient(rightCoordinate, seed)
    * (localProgress - 1)

  return THREE.MathUtils.lerp(leftValue, rightValue, interpolation) * 2
}

/**
 * Combines broad movement with smaller detail so paths feel organic without
 * becoming jagged. The weights sum to one, keeping amplitude predictable.
 */
export function sampleTwoOctaveNoise({
  detailFrequency,
  offset,
  primaryFrequency,
  progress,
  seed,
}) {
  const primaryMovement = sampleGradientNoise(
    progress * primaryFrequency + offset,
    seed,
  )
  const detailMovement = sampleGradientNoise(
    progress * detailFrequency + offset + 53.17,
    seed + 0x9e3779b9,
  )

  return primaryMovement * 0.75 + detailMovement * 0.25
}

export function deterministicValue(integer, seed) {
  return (createGradient(integer, seed) + 1) * 0.5
}

/**
 * Evaluates one coordinate of a cubic Hermite curve. Including the direction
 * at both ends prevents the crossing from forming a sharp corner.
 */
export function cubicHermite(
  startPosition,
  startDirection,
  endPosition,
  endDirection,
  progress,
) {
  const progressSquared = progress * progress
  const progressCubed = progressSquared * progress
  const startPositionWeight = 2 * progressCubed - 3 * progressSquared + 1
  const startDirectionWeight = progressCubed - 2 * progressSquared + progress
  const endPositionWeight = -2 * progressCubed + 3 * progressSquared
  const endDirectionWeight = progressCubed - progressSquared

  return startPosition * startPositionWeight
    + startDirection * startDirectionWeight
    + endPosition * endPositionWeight
    + endDirection * endDirectionWeight
}

/** Returns one coordinate of the Hermite curve's direction. */
export function cubicHermiteDerivative(
  startPosition,
  startDirection,
  endPosition,
  endDirection,
  progress,
) {
  const progressSquared = progress * progress
  const startPositionWeight = 6 * progressSquared - 6 * progress
  const startDirectionWeight = 3 * progressSquared - 4 * progress + 1
  const endPositionWeight = -6 * progressSquared + 6 * progress
  const endDirectionWeight = 3 * progressSquared - 2 * progress

  return startPosition * startPositionWeight
    + startDirection * startDirectionWeight
    + endPosition * endPositionWeight
    + endDirection * endDirectionWeight
}
