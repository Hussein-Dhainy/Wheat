import * as THREE from 'three'
import { calculateCrossingEmphasis } from './dnaFiberPath.js'
import { deterministicValue } from './dnaMath.js'

/**
 * Expands every centerline point into two shader-facing vertices. The vertex
 * shader separates those vertices in screen space, producing one continuous
 * camera-facing ribbon per fiber while keeping all fibers in one draw call.
 */
export function createRibbonGeometry({
  crossingEventsByStrand,
  maximumRibbonOpacity,
  maximumRibbonWidth,
  minimumRibbonOpacity,
  minimumRibbonWidth,
  positions,
  seed,
  segments,
  strandCount,
}) {
  const pointsPerStrand = segments + 1
  const ribbonVertexCount = strandCount * pointsPerStrand * 2
  const ribbonPositions = new Float32Array(ribbonVertexCount * 3)
  const previousPositions = new Float32Array(ribbonVertexCount * 3)
  const nextPositions = new Float32Array(ribbonVertexCount * 3)
  const sides = new Float32Array(ribbonVertexCount)
  const progressValues = new Float32Array(ribbonVertexCount)
  const crossingEmphasis = new Float32Array(ribbonVertexCount)
  const fiberProperties = new Float32Array(ribbonVertexCount * 4)
  const RibbonIndexArray = ribbonVertexCount > 65535
    ? Uint32Array
    : Uint16Array
  const ribbonIndices = new RibbonIndexArray(strandCount * segments * 6)
  let ribbonIndexOffset = 0

  for (let strandIndex = 0; strandIndex < strandCount; strandIndex += 1) {
    const brightness = 0.68
      + deterministicValue(strandIndex, seed + 17) * 0.52
    const opacity = minimumRibbonOpacity
      + deterministicValue(strandIndex, seed + 41)
        * (maximumRibbonOpacity - minimumRibbonOpacity)
    const colorMix = deterministicValue(strandIndex, seed + 79)
    const width = minimumRibbonWidth
      + deterministicValue(strandIndex, seed + 113)
        * (maximumRibbonWidth - minimumRibbonWidth)
    const strandCrossingEvents = crossingEventsByStrand[strandIndex]

    for (let pointIndex = 0; pointIndex <= segments; pointIndex += 1) {
      const centerlineVertexIndex = strandIndex * pointsPerStrand + pointIndex
      const centerlineOffset = centerlineVertexIndex * 3
      const previousPointIndex = Math.max(0, pointIndex - 1)
      const nextPointIndex = Math.min(segments, pointIndex + 1)
      const previousCenterlineOffset = (
        strandIndex * pointsPerStrand + previousPointIndex
      ) * 3
      const nextCenterlineOffset = (
        strandIndex * pointsPerStrand + nextPointIndex
      ) * 3

      for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
        const ribbonVertexIndex = centerlineVertexIndex * 2 + sideIndex
        const ribbonPositionOffset = ribbonVertexIndex * 3
        const propertyOffset = ribbonVertexIndex * 4

        for (let coordinateIndex = 0; coordinateIndex < 3; coordinateIndex += 1) {
          ribbonPositions[ribbonPositionOffset + coordinateIndex] = positions[
            centerlineOffset + coordinateIndex
          ]
          previousPositions[ribbonPositionOffset + coordinateIndex] = positions[
            previousCenterlineOffset + coordinateIndex
          ]
          nextPositions[ribbonPositionOffset + coordinateIndex] = positions[
            nextCenterlineOffset + coordinateIndex
          ]
        }

        sides[ribbonVertexIndex] = sideIndex === 0 ? -1 : 1
        progressValues[ribbonVertexIndex] = pointIndex / segments
        crossingEmphasis[ribbonVertexIndex] = calculateCrossingEmphasis(
          pointIndex / segments,
          strandCrossingEvents,
        )
        fiberProperties[propertyOffset] = brightness
        fiberProperties[propertyOffset + 1] = opacity
        fiberProperties[propertyOffset + 2] = colorMix
        fiberProperties[propertyOffset + 3] = width
      }

      if (pointIndex < segments) {
        const currentLeft = centerlineVertexIndex * 2
        const currentRight = currentLeft + 1
        const nextLeft = currentLeft + 2
        const nextRight = currentLeft + 3

        ribbonIndices[ribbonIndexOffset] = currentLeft
        ribbonIndices[ribbonIndexOffset + 1] = currentRight
        ribbonIndices[ribbonIndexOffset + 2] = nextLeft
        ribbonIndices[ribbonIndexOffset + 3] = currentRight
        ribbonIndices[ribbonIndexOffset + 4] = nextRight
        ribbonIndices[ribbonIndexOffset + 5] = nextLeft
        ribbonIndexOffset += 6
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(ribbonPositions, 3))
  geometry.setAttribute('aPrevious', new THREE.BufferAttribute(previousPositions, 3))
  geometry.setAttribute('aNext', new THREE.BufferAttribute(nextPositions, 3))
  geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1))
  geometry.setAttribute('aProgress', new THREE.BufferAttribute(progressValues, 1))
  geometry.setAttribute(
    'aCrossingEmphasis',
    new THREE.BufferAttribute(crossingEmphasis, 1),
  )
  geometry.setAttribute(
    'aFiberProperties',
    new THREE.BufferAttribute(fiberProperties, 4),
  )
  geometry.setIndex(new THREE.BufferAttribute(ribbonIndices, 1))
  geometry.computeBoundingSphere()

  return geometry
}

/** Creates deterministic glowing points sampled directly from fiber paths. */
export function createFiberParticleGeometry({
  crossingEventsByStrand,
  particlesPerFiber,
  positions,
  seed,
  segments,
  strandCount,
}) {
  const pointsPerStrand = segments + 1
  const particleCount = strandCount * particlesPerFiber
  const particlePositions = new Float32Array(particleCount * 3)
  const particleSizes = new Float32Array(particleCount)
  const particleBrightness = new Float32Array(particleCount)
  const particleColorMix = new Float32Array(particleCount)
  const particleEmphasis = new Float32Array(particleCount)
  const particleProgress = new Float32Array(particleCount)

  for (let strandIndex = 0; strandIndex < strandCount; strandIndex += 1) {
    const strandCrossingEvents = crossingEventsByStrand[strandIndex]

    for (
      let particleOnFiber = 0;
      particleOnFiber < particlesPerFiber;
      particleOnFiber += 1
    ) {
      const particleIndex = strandIndex * particlesPerFiber + particleOnFiber
      const randomIndex = strandIndex * particlesPerFiber + particleOnFiber
      const distributionChoice = deterministicValue(randomIndex, seed + 181)
      let progress = deterministicValue(randomIndex, seed + 191)

      // Selected fibers place some particles around crossing centers. The rest
      // remain irregularly distributed along the full path, creating natural
      // bright clusters and quieter stretches instead of an even dotted line.
      if (strandCrossingEvents.length > 0 && distributionChoice < 0.46) {
        const eventIndex = Math.min(
          strandCrossingEvents.length - 1,
          Math.floor(
            deterministicValue(randomIndex, seed + 197)
              * strandCrossingEvents.length,
          ),
        )
        const event = strandCrossingEvents[eventIndex]
        const center = (event.start + event.end) * 0.5
        const halfDuration = (event.end - event.start) * 0.5
        const signedOffset = deterministicValue(randomIndex, seed + 211) * 2 - 1
        progress = center + signedOffset * halfDuration * 0.72
      }

      progress = THREE.MathUtils.clamp(progress, 0, 1)
      const emphasis = calculateCrossingEmphasis(
        progress,
        strandCrossingEvents,
      )
      const exactPointIndex = progress * segments
      const firstPointIndex = Math.floor(exactPointIndex)
      const secondPointIndex = Math.min(firstPointIndex + 1, segments)
      const interpolation = exactPointIndex - firstPointIndex
      const firstOffset = (
        strandIndex * pointsPerStrand + firstPointIndex
      ) * 3
      const secondOffset = (
        strandIndex * pointsPerStrand + secondPointIndex
      ) * 3
      const particlePositionOffset = particleIndex * 3

      for (let coordinateIndex = 0; coordinateIndex < 3; coordinateIndex += 1) {
        particlePositions[particlePositionOffset + coordinateIndex] = (
          THREE.MathUtils.lerp(
            positions[firstOffset + coordinateIndex],
            positions[secondOffset + coordinateIndex],
            interpolation,
          )
        )
      }

      particleSizes[particleIndex] = 1.9
        + deterministicValue(randomIndex, seed + 223) * 5.8
        + emphasis * 2.2
      particleBrightness[particleIndex] = 0.5
        + deterministicValue(randomIndex, seed + 251) * 1.05
        + emphasis * 0.75
      particleColorMix[particleIndex] = deterministicValue(
        randomIndex,
        seed + 283,
      )
      particleEmphasis[particleIndex] = emphasis
      particleProgress[particleIndex] = progress
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(particleSizes, 1))
  geometry.setAttribute(
    'aBrightness',
    new THREE.BufferAttribute(particleBrightness, 1),
  )
  geometry.setAttribute('aColorMix', new THREE.BufferAttribute(particleColorMix, 1))
  geometry.setAttribute('aProgress', new THREE.BufferAttribute(particleProgress, 1))
  geometry.setAttribute(
    'aEmphasis',
    new THREE.BufferAttribute(particleEmphasis, 1),
  )
  geometry.computeBoundingSphere()

  return geometry
}
