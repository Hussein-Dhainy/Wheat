import * as THREE from 'three'
import { FULL_ROTATION_RADIANS } from './dnaConstants.js'
import { sampleTwoOctaveNoise } from './dnaMath.js'

/**
 * Samples a fiber at any normalized position along a bundle. Frame data is
 * stored only at segment points, so values between them are interpolated.
 */
export function sampleFiberPosition({
  binormalAmount,
  clusterFrame,
  normalAmount,
  progress,
  segments,
}) {
  const exactPointIndex = THREE.MathUtils.clamp(progress, 0, 1) * segments
  const firstPointIndex = Math.floor(exactPointIndex)
  const secondPointIndex = Math.min(firstPointIndex + 1, segments)
  const interpolation = exactPointIndex - firstPointIndex
  const firstOffset = firstPointIndex * 3
  const secondOffset = secondPointIndex * 3
  const position = { x: 0, y: 0, z: 0 }
  const coordinateNames = ['x', 'y', 'z']

  for (let coordinateIndex = 0; coordinateIndex < 3; coordinateIndex += 1) {
    const center = THREE.MathUtils.lerp(
      clusterFrame.centerPositions[firstOffset + coordinateIndex],
      clusterFrame.centerPositions[secondOffset + coordinateIndex],
      interpolation,
    )
    const normal = THREE.MathUtils.lerp(
      clusterFrame.normalDirections[firstOffset + coordinateIndex],
      clusterFrame.normalDirections[secondOffset + coordinateIndex],
      interpolation,
    )
    const binormal = THREE.MathUtils.lerp(
      clusterFrame.binormalDirections[firstOffset + coordinateIndex],
      clusterFrame.binormalDirections[secondOffset + coordinateIndex],
      interpolation,
    )

    position[coordinateNames[coordinateIndex]] = center
      + normal * normalAmount
      + binormal * binormalAmount
  }

  return position
}

/**
 * Returns a fiber's changing 2D position inside its circular bundle.
 * Rotation creates the internal twist; the pulse multiplier creates static
 * alternating narrow and wide regions along the DNA height.
 */
export function calculateFiberBundleOffsets({
  bundleAngle,
  fiberDistance,
  fiberTwists,
  progress,
  pulseAmount,
  pulseCount,
}) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1)
  const twistedAngle = bundleAngle
    + clampedProgress * fiberTwists * FULL_ROTATION_RADIANS
  const pulseMultiplier = 1 + Math.sin(
    clampedProgress * pulseCount * FULL_ROTATION_RADIANS,
  ) * pulseAmount
  const pulsedDistance = fiberDistance * pulseMultiplier

  return {
    binormalAmount: Math.sin(twistedAngle) * pulsedDistance,
    normalAmount: Math.cos(twistedAngle) * pulsedDistance,
    pulseMultiplier,
  }
}

/**
 * Samples the same contained, noisy bundle path used by the main point loop.
 * Crossing endpoints use this helper so they meet the visible bundle exactly.
 */
export function sampleNoisyFiberPosition({
  bundleAngle,
  bundleRadius,
  clusterFrame,
  detailNoiseFrequency,
  fiberDistance,
  fiberNoiseOffset,
  fiberTwists,
  movementAmplitude,
  primaryNoiseFrequency,
  progress,
  pulseAmount,
  pulseCount,
  seed,
  segments,
}) {
  const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1)
  const {
    binormalAmount,
    normalAmount,
    pulseMultiplier,
  } = calculateFiberBundleOffsets({
    bundleAngle,
    fiberDistance,
    fiberTwists,
    progress: clampedProgress,
    pulseAmount,
    pulseCount,
  })
  const localBundleRadius = bundleRadius * pulseMultiplier
  const endpointEnvelope = Math.sin(clampedProgress * Math.PI) ** 2
  const movementStrength = movementAmplitude * endpointEnvelope
  const normalNoise = sampleTwoOctaveNoise({
    detailFrequency: detailNoiseFrequency,
    offset: fiberNoiseOffset,
    primaryFrequency: primaryNoiseFrequency,
    progress: clampedProgress,
    seed,
  })
  const binormalNoise = sampleTwoOctaveNoise({
    detailFrequency: detailNoiseFrequency,
    offset: fiberNoiseOffset + 127.43,
    primaryFrequency: primaryNoiseFrequency,
    progress: clampedProgress,
    seed: seed + 0x7f4a7c15,
  })
  let movingNormalAmount = normalAmount + normalNoise * movementStrength
  let movingBinormalAmount = binormalAmount + binormalNoise * movementStrength
  const movingDistanceFromCenter = Math.hypot(
    movingNormalAmount,
    movingBinormalAmount,
  )

  if (movingDistanceFromCenter > localBundleRadius) {
    const containmentScale = localBundleRadius / movingDistanceFromCenter
    movingNormalAmount *= containmentScale
    movingBinormalAmount *= containmentScale
  }

  return sampleFiberPosition({
    binormalAmount: movingBinormalAmount,
    clusterFrame,
    normalAmount: movingNormalAmount,
    progress: clampedProgress,
    segments,
  })
}

export function calculateCrossingEmphasis(progress, crossingEvents) {
  let emphasis = 0

  for (const event of crossingEvents) {
    if (progress < event.start || progress > event.end) continue

    const crossingProgress = (progress - event.start) / (event.end - event.start)
    emphasis = Math.max(emphasis, Math.sin(crossingProgress * Math.PI) ** 6)
  }

  return emphasis
}
