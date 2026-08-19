import { GOLDEN_ANGLE_RADIANS } from './dnaConstants.js'
import { sampleNoisyFiberPosition } from './dnaFiberPath.js'

/**
 * Expands a balanced, bundle-level description into the strand events used by
 * the curve generator. Selected fiber positions span the whole bundle radius
 * instead of taking only the innermost fibers.
 */
export function expandCrossingGroups({ crossingGroups, fibersPerCluster }) {
  if (!Array.isArray(crossingGroups)) {
    throw new TypeError('crossingGroups must be an array')
  }

  const expandedEvents = []

  for (const group of crossingGroups) {
    const {
      fractionPerCluster,
      movements,
      timingSpread = 0,
    } = group

    if (!(fractionPerCluster > 0 && fractionPerCluster <= 1)) {
      throw new RangeError(
        'A crossing group fractionPerCluster must be above 0 and at most 1',
      )
    }

    if (!Array.isArray(movements) || movements.length === 0) {
      throw new TypeError('A crossing group must contain movement entries')
    }

    if (!Number.isFinite(timingSpread) || timingSpread < 0) {
      throw new RangeError('A crossing group timingSpread cannot be negative')
    }

    const selectedFiberCount = Math.max(
      1,
      Math.round(fibersPerCluster * fractionPerCluster),
    )

    for (
      let selectionIndex = 0;
      selectionIndex < selectedFiberCount;
      selectionIndex += 1
    ) {
      const fiberIndex = selectedFiberCount === 1
        ? Math.floor((fibersPerCluster - 1) / 2)
        : Math.round(
          selectionIndex
            * (fibersPerCluster - 1)
            / (selectedFiberCount - 1),
        )
      const timingOffset = selectedFiberCount === 1
        ? 0
        : (
          selectionIndex / (selectedFiberCount - 1) - 0.5
        ) * 2 * timingSpread

      // Even and odd strand indices are the matching fibers in opposing
      // clusters. Giving both the same movements keeps bundle counts balanced.
      for (let clusterIndex = 0; clusterIndex < 2; clusterIndex += 1) {
        const strandIndex = fiberIndex * 2 + clusterIndex

        for (const movement of movements) {
          expandedEvents.push({
            ...movement,
            end: movement.end + timingOffset,
            start: movement.start + timingOffset,
            strandIndex,
          })
        }
      }
    }
  }

  return expandedEvents
}

/**
 * Converts editable crossing descriptions into curve data used by the point
 * loop. Events are grouped by strand, sorted vertically, and each completed
 * event automatically flips that strand to the opposing bundle.
 */
export function prepareCrossingEvents({
  bundleRadius,
  clusterFrames,
  crossingEvents,
  detailNoiseFrequency,
  fiberTwists,
  fibersPerCluster,
  movementAmplitude,
  primaryNoiseFrequency,
  pulseAmount,
  pulseCount,
  seed,
  segments,
  strandCount,
}) {
  if (!Array.isArray(crossingEvents)) {
    throw new TypeError('crossingEvents must be an array')
  }

  const eventsByStrand = Array.from(
    { length: strandCount },
    () => [],
  )

  for (const event of crossingEvents) {
    const {
      end,
      smoothness = 1,
      start,
      strandIndex,
    } = event

    if (!Number.isInteger(strandIndex) || strandIndex < 0
      || strandIndex >= strandCount) {
      throw new RangeError('A crossing strandIndex is outside strandCount')
    }

    if (!(start >= 0 && end <= 1 && start < end)) {
      throw new RangeError('A crossing must satisfy 0 <= start < end <= 1')
    }

    if (!Number.isFinite(smoothness) || smoothness <= 0) {
      throw new RangeError('A crossing smoothness must be greater than zero')
    }

    eventsByStrand[strandIndex].push({
      end,
      smoothness,
      start,
      strandIndex,
    })
  }

  const directionSampleDistance = 1 / segments

  for (let strandIndex = 0; strandIndex < strandCount; strandIndex += 1) {
    const strandEvents = eventsByStrand[strandIndex]
    strandEvents.sort((first, second) => first.start - second.start)

    const fiberIndex = Math.floor(strandIndex / 2)
    const normalizedFiberPosition = fibersPerCluster === 1
      ? 0
      : fiberIndex / (fibersPerCluster - 1)
    const fiberDistance = Math.sqrt(normalizedFiberPosition) * bundleRadius
    const bundleAngle = fiberIndex * GOLDEN_ANGLE_RADIANS
    const initialClusterIndex = strandIndex % 2
    const fiberNoiseOffset = strandIndex * 17.31
      + initialClusterIndex * 101.7
    let sourceClusterIndex = strandIndex % 2
    let previousEnd = -Infinity

    for (let eventIndex = 0; eventIndex < strandEvents.length; eventIndex += 1) {
      const event = strandEvents[eventIndex]

      if (event.start < previousEnd) {
        throw new RangeError('Crossing events on one strand cannot overlap')
      }

      const targetClusterIndex = 1 - sourceClusterIndex
      const positionOptions = {
        bundleAngle,
        bundleRadius,
        detailNoiseFrequency,
        fiberDistance,
        fiberNoiseOffset,
        fiberTwists,
        movementAmplitude,
        primaryNoiseFrequency,
        pulseAmount,
        pulseCount,
        seed,
        segments,
      }
      const startPosition = sampleNoisyFiberPosition({
        ...positionOptions,
        clusterFrame: clusterFrames[sourceClusterIndex],
        progress: event.start,
      })
      const beforeStartPosition = sampleNoisyFiberPosition({
        ...positionOptions,
        clusterFrame: clusterFrames[sourceClusterIndex],
        progress: event.start - directionSampleDistance,
      })
      const endPosition = sampleNoisyFiberPosition({
        ...positionOptions,
        clusterFrame: clusterFrames[targetClusterIndex],
        progress: event.end,
      })
      const afterEndPosition = sampleNoisyFiberPosition({
        ...positionOptions,
        clusterFrame: clusterFrames[targetClusterIndex],
        progress: event.end + directionSampleDistance,
      })
      const directionScale = (event.end - event.start)
        * event.smoothness
        / directionSampleDistance

      strandEvents[eventIndex] = {
        ...event,
        endDirectionX: (afterEndPosition.x - endPosition.x) * directionScale,
        endDirectionY: (afterEndPosition.y - endPosition.y) * directionScale,
        endDirectionZ: (afterEndPosition.z - endPosition.z) * directionScale,
        endPosition,
        sourceClusterIndex,
        startDirectionX: (
          startPosition.x - beforeStartPosition.x
        ) * directionScale,
        startDirectionY: (
          startPosition.y - beforeStartPosition.y
        ) * directionScale,
        startDirectionZ: (
          startPosition.z - beforeStartPosition.z
        ) * directionScale,
        startPosition,
        targetClusterIndex,
      }

      previousEnd = event.end
      sourceClusterIndex = targetClusterIndex
    }
  }

  return eventsByStrand
}
