import * as THREE from 'three'
import { GOLDEN_ANGLE_RADIANS, MINIMUM_FRAME_ROTATION } from './dnaConstants.js'
import { expandCrossingGroups, prepareCrossingEvents } from './dnaCrossingEvents.js'
import { calculateFiberBundleOffsets } from './dnaFiberPath.js'
import { createParallelTransportFrames } from './dnaFrames.js'
import { createFiberParticleGeometry, createRibbonGeometry } from './dnaGeometryBuilders.js'
import { cubicHermite, cubicHermiteDerivative, sampleTwoOctaveNoise } from './dnaMath.js'

export function createDNAGeometry({
  bundleRadius = 0.12,
  crossingEvents = [],
  crossingGroups = [],
  detailNoiseFrequency = 5,
  fiberTwists = 0,
  height = 8,
  maximumRibbonOpacity = 0.2,
  maximumRibbonWidth = 3,
  minimumRibbonOpacity = 0.2,
  minimumRibbonWidth = 3,
  movementAmplitude = 0.018,
  particlesPerFiber = 26,
  primaryNoiseFrequency = 2,
  pulseAmount = 0,
  pulseCount = 2,
  radius = 1.2,
  seed = 12345,
  segments = 100,
  strandCount = 2,
  turns = 1,
} = {}) {
  // The two opposing bundles must contain the same number of fibers.
  if (strandCount % 2 !== 0) strandCount += 1

  if (!Number.isFinite(fiberTwists)) {
    throw new RangeError('fiberTwists must be a finite number')
  }

  if (!(pulseAmount >= 0 && pulseAmount < 1)) {
    throw new RangeError('pulseAmount must be at least 0 and below 1')
  }

  if (!Number.isFinite(pulseCount) || pulseCount < 0) {
    throw new RangeError('pulseCount must be a non-negative finite number')
  }

  const pointsPerStrand = segments + 1
  const vertexCount = strandCount * pointsPerStrand
  const fibersPerCluster = strandCount / 2

  // All centerline points share one packed buffer. That data is expanded into
  // one indexed ribbon mesh and sampled by one particle geometry below.
  const positions = new Float32Array(vertexCount * 3)

  // The second cluster starts half a rotation from the first. Frames are built
  // only twice and reused by every fiber in their respective cluster.
  const clusterFrames = [0, 1].map((clusterIndex) => (
    createParallelTransportFrames({
      clusterPhase: clusterIndex * Math.PI,
      height,
      pointsPerStrand,
      radius,
      segments,
      turns,
    })
  ))

  const expandedCrossingEvents = [
    ...crossingEvents,
    ...expandCrossingGroups({ crossingGroups, fibersPerCluster }),
  ]
  const crossingEventsByStrand = prepareCrossingEvents({
    bundleRadius,
    clusterFrames,
    crossingEvents: expandedCrossingEvents,
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
  })

  for (let strandIndex = 0; strandIndex < strandCount; strandIndex += 1) {
    const clusterIndex = strandIndex % 2
    const fiberIndex = Math.floor(strandIndex / 2)
    const strandCrossingEvents = crossingEventsByStrand[strandIndex]

    // A square-root radius distributes fibers evenly by disk area. Advancing
    // by the golden angle prevents the fibers from forming visible rows.
    const normalizedFiberPosition = fibersPerCluster === 1
      ? 0
      : fiberIndex / (fibersPerCluster - 1)
    const fiberDistanceFromCenter = Math.sqrt(normalizedFiberPosition)
      * bundleRadius
    const bundleAngle = fiberIndex * GOLDEN_ANGLE_RADIANS

    // Separate regions of the same deterministic noise field give every fiber
    // an individual path and keep movement on the two bundle axes independent.
    const fiberNoiseOffset = strandIndex * 17.31 + clusterIndex * 101.7

    for (let pointIndex = 0; pointIndex <= segments; pointIndex += 1) {
      const vertexIndex = strandIndex * pointsPerStrand + pointIndex
      const positionOffset = vertexIndex * 3
      const frameOffset = pointIndex * 3

      const progress = pointIndex / segments
      let activeCrossingEvent = null
      let currentClusterIndex = clusterIndex

      for (const crossingEvent of strandCrossingEvents) {
        if (progress > crossingEvent.end) {
          currentClusterIndex = crossingEvent.targetClusterIndex
          continue
        }

        if (progress >= crossingEvent.start) {
          activeCrossingEvent = crossingEvent
          currentClusterIndex = crossingEvent.sourceClusterIndex
        }

        break
      }

      const clusterFrame = clusterFrames[currentClusterIndex]
      const endpointEnvelope = Math.sin(progress * Math.PI) ** 2
      const movementStrength = movementAmplitude * endpointEnvelope
      const {
        binormalAmount,
        normalAmount,
        pulseMultiplier,
      } = calculateFiberBundleOffsets({
        bundleAngle,
        fiberDistance: fiberDistanceFromCenter,
        fiberTwists,
        progress,
        pulseAmount,
        pulseCount,
      })
      const localBundleRadius = bundleRadius * pulseMultiplier

      const normalNoise = sampleTwoOctaveNoise({
        detailFrequency: detailNoiseFrequency,
        offset: fiberNoiseOffset,
        primaryFrequency: primaryNoiseFrequency,
        progress,
        seed,
      })
      const binormalNoise = sampleTwoOctaveNoise({
        detailFrequency: detailNoiseFrequency,
        offset: fiberNoiseOffset + 127.43,
        primaryFrequency: primaryNoiseFrequency,
        progress,
        seed: seed + 0x7f4a7c15,
      })

      let movingNormalAmount = normalAmount + normalNoise * movementStrength
      let movingBinormalAmount = binormalAmount
        + binormalNoise * movementStrength

      // Noise may push an outer fiber beyond the circular cross-section. Scale
      // both coordinates together to preserve direction while containing it.
      const movingDistanceFromCenter = Math.hypot(
        movingNormalAmount,
        movingBinormalAmount,
      )

      if (movingDistanceFromCenter > localBundleRadius) {
        const containmentScale = localBundleRadius / movingDistanceFromCenter
        movingNormalAmount *= containmentScale
        movingBinormalAmount *= containmentScale
      }

      // Reconstruct the woven 2D bundle position in 3D at this centerline frame.
      positions[positionOffset] = clusterFrame.centerPositions[frameOffset]
        + clusterFrame.normalDirections[frameOffset] * movingNormalAmount
        + clusterFrame.binormalDirections[frameOffset] * movingBinormalAmount
      positions[positionOffset + 1] = clusterFrame.centerPositions[
        frameOffset + 1
      ]
        + clusterFrame.normalDirections[frameOffset + 1] * movingNormalAmount
        + clusterFrame.binormalDirections[frameOffset + 1]
          * movingBinormalAmount
      positions[positionOffset + 2] = clusterFrame.centerPositions[
        frameOffset + 2
      ]
        + clusterFrame.normalDirections[frameOffset + 2] * movingNormalAmount
        + clusterFrame.binormalDirections[frameOffset + 2]
          * movingBinormalAmount

      // Replace only the crossing interval. Before it, this fiber follows its
      // source bundle; afterward, it continues along the destination bundle.
      if (activeCrossingEvent) {
        const crossingProgress = THREE.MathUtils.clamp(
          (progress - activeCrossingEvent.start)
            / (activeCrossingEvent.end - activeCrossingEvent.start),
          0,
          1,
        )

        positions[positionOffset] = cubicHermite(
          activeCrossingEvent.startPosition.x,
          activeCrossingEvent.startDirectionX,
          activeCrossingEvent.endPosition.x,
          activeCrossingEvent.endDirectionX,
          crossingProgress,
        )
        positions[positionOffset + 1] = cubicHermite(
          activeCrossingEvent.startPosition.y,
          activeCrossingEvent.startDirectionY,
          activeCrossingEvent.endPosition.y,
          activeCrossingEvent.endDirectionY,
          crossingProgress,
        )
        positions[positionOffset + 2] = cubicHermite(
          activeCrossingEvent.startPosition.z,
          activeCrossingEvent.startDirectionZ,
          activeCrossingEvent.endPosition.z,
          activeCrossingEvent.endDirectionZ,
          crossingProgress,
        )

        // Build a local frame around the crossing curve. Noise is applied at
        // full strength throughout the crossing, with no boundary envelope.
        let tangentX = cubicHermiteDerivative(
          activeCrossingEvent.startPosition.x,
          activeCrossingEvent.startDirectionX,
          activeCrossingEvent.endPosition.x,
          activeCrossingEvent.endDirectionX,
          crossingProgress,
        )
        let tangentY = cubicHermiteDerivative(
          activeCrossingEvent.startPosition.y,
          activeCrossingEvent.startDirectionY,
          activeCrossingEvent.endPosition.y,
          activeCrossingEvent.endDirectionY,
          crossingProgress,
        )
        let tangentZ = cubicHermiteDerivative(
          activeCrossingEvent.startPosition.z,
          activeCrossingEvent.startDirectionZ,
          activeCrossingEvent.endPosition.z,
          activeCrossingEvent.endDirectionZ,
          crossingProgress,
        )
        const tangentLength = Math.hypot(tangentX, tangentY, tangentZ)
        tangentX /= tangentLength
        tangentY /= tangentLength
        tangentZ /= tangentLength

        // Cross with world-up to obtain the first perpendicular direction.
        // Fall back to the world X axis if the curve becomes nearly vertical.
        let crossingNormalX = -tangentZ
        let crossingNormalY = 0
        let crossingNormalZ = tangentX
        let crossingNormalLength = Math.hypot(
          crossingNormalX,
          crossingNormalY,
          crossingNormalZ,
        )

        if (crossingNormalLength < MINIMUM_FRAME_ROTATION) {
          crossingNormalX = 0
          crossingNormalY = tangentZ
          crossingNormalZ = -tangentY
          crossingNormalLength = Math.hypot(
            crossingNormalX,
            crossingNormalY,
            crossingNormalZ,
          )
        }

        crossingNormalX /= crossingNormalLength
        crossingNormalY /= crossingNormalLength
        crossingNormalZ /= crossingNormalLength

        const crossingBinormalX = tangentY * crossingNormalZ
          - tangentZ * crossingNormalY
        const crossingBinormalY = tangentZ * crossingNormalX
          - tangentX * crossingNormalZ
        const crossingBinormalZ = tangentX * crossingNormalY
          - tangentY * crossingNormalX
        // The Hermite endpoints already include the bundle's noise. Add only
        // interior variation here, reaching full strength through the middle
        // while remaining continuous with both noisy bundle paths at the joins.
        const crossingInteriorEnvelope = Math.sin(
          crossingProgress * Math.PI,
        ) ** 2
        const crossingNoiseStrength = Math.min(
          movementAmplitude,
          bundleRadius,
        ) * endpointEnvelope * crossingInteriorEnvelope

        positions[positionOffset] += crossingNormalX
          * normalNoise
          * crossingNoiseStrength
          + crossingBinormalX
            * binormalNoise
            * crossingNoiseStrength
        positions[positionOffset + 1] += crossingNormalY
          * normalNoise
          * crossingNoiseStrength
          + crossingBinormalY
            * binormalNoise
            * crossingNoiseStrength
        positions[positionOffset + 2] += crossingNormalZ
          * normalNoise
          * crossingNoiseStrength
          + crossingBinormalZ
            * binormalNoise
            * crossingNoiseStrength
      }

    }
  }

  return {
    particleGeometry: createFiberParticleGeometry({
      crossingEventsByStrand,
      particlesPerFiber,
      positions,
      seed,
      segments,
      strandCount,
    }),
    ribbonGeometry: createRibbonGeometry({
      crossingEventsByStrand,
      maximumRibbonOpacity,
      maximumRibbonWidth,
      minimumRibbonOpacity,
      minimumRibbonWidth,
      positions,
      seed,
      segments,
      strandCount,
    }),
  }
}
