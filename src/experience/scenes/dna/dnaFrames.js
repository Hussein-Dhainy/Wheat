import * as THREE from 'three'
import { FULL_ROTATION_RADIANS, MINIMUM_FRAME_ROTATION } from './dnaConstants.js'

/**
 * Builds a rotation-minimizing coordinate frame along one helix centerline.
 *
 * Each frame contains:
 * - a center position on the helix;
 * - a normal direction across the bundle;
 * - a binormal direction perpendicular to both the path and normal.
 *
 * Carrying the previous frame forward prevents the bundle from introducing
 * an extra twist that would make its fibers braid around one another.
 */
export function createParallelTransportFrames({
  clusterPhase,
  height,
  pointsPerStrand,
  radius,
  segments,
  turns,
}) {
  const centerPositions = new Float32Array(pointsPerStrand * 3)
  const normalDirections = new Float32Array(pointsPerStrand * 3)
  const binormalDirections = new Float32Array(pointsPerStrand * 3)
  const angularSpeed = turns * FULL_ROTATION_RADIANS

  let previousTangentX = 0
  let previousTangentY = 0
  let previousTangentZ = 0

  // The initial normal points away from the DNA's central vertical axis.
  let normalX = Math.cos(clusterPhase)
  let normalY = 0
  let normalZ = Math.sin(clusterPhase)

  for (let pointIndex = 0; pointIndex <= segments; pointIndex += 1) {
    const progress = pointIndex / segments
    const centerAngle = progress * angularSpeed + clusterPhase
    const frameOffset = pointIndex * 3

    // Position of the invisible centerline running through this bundle.
    centerPositions[frameOffset] = Math.cos(centerAngle) * radius
    centerPositions[frameOffset + 1] = (progress - 0.5) * height
    centerPositions[frameOffset + 2] = Math.sin(centerAngle) * radius

    // The derivative of the centerline tells us the direction of travel.
    const tangentX = -radius * angularSpeed * Math.sin(centerAngle)
    const tangentY = height
    const tangentZ = radius * angularSpeed * Math.cos(centerAngle)
    const tangentLength = Math.hypot(tangentX, tangentY, tangentZ)
    const normalizedTangentX = tangentX / tangentLength
    const normalizedTangentY = tangentY / tangentLength
    const normalizedTangentZ = tangentZ / tangentLength

    if (pointIndex > 0) {
      // The cross product gives the axis that rotates the previous tangent
      // into the current tangent. Applying only this rotation minimizes twist.
      let rotationAxisX = previousTangentY * normalizedTangentZ
        - previousTangentZ * normalizedTangentY
      let rotationAxisY = previousTangentZ * normalizedTangentX
        - previousTangentX * normalizedTangentZ
      let rotationAxisZ = previousTangentX * normalizedTangentY
        - previousTangentY * normalizedTangentX
      const rotationAxisLength = Math.hypot(
        rotationAxisX,
        rotationAxisY,
        rotationAxisZ,
      )

      if (rotationAxisLength > MINIMUM_FRAME_ROTATION) {
        rotationAxisX /= rotationAxisLength
        rotationAxisY /= rotationAxisLength
        rotationAxisZ /= rotationAxisLength

        const rotationCosine = THREE.MathUtils.clamp(
          previousTangentX * normalizedTangentX
            + previousTangentY * normalizedTangentY
            + previousTangentZ * normalizedTangentZ,
          -1,
          1,
        )
        const rotationSine = rotationAxisLength
        const rotationAxisDotNormal = rotationAxisX * normalX
          + rotationAxisY * normalY
          + rotationAxisZ * normalZ
        const rotationAxisCrossNormalX = rotationAxisY * normalZ
          - rotationAxisZ * normalY
        const rotationAxisCrossNormalY = rotationAxisZ * normalX
          - rotationAxisX * normalZ
        const rotationAxisCrossNormalZ = rotationAxisX * normalY
          - rotationAxisY * normalX
        const oneMinusRotationCosine = 1 - rotationCosine

        // Rodrigues' rotation formula transports the normal around the axis.
        normalX = normalX * rotationCosine
          + rotationAxisCrossNormalX * rotationSine
          + rotationAxisX
            * rotationAxisDotNormal
            * oneMinusRotationCosine
        normalY = normalY * rotationCosine
          + rotationAxisCrossNormalY * rotationSine
          + rotationAxisY
            * rotationAxisDotNormal
            * oneMinusRotationCosine
        normalZ = normalZ * rotationCosine
          + rotationAxisCrossNormalZ * rotationSine
          + rotationAxisZ
            * rotationAxisDotNormal
            * oneMinusRotationCosine
      }
    }

    // Re-projecting the normal removes small floating-point errors accumulated
    // across many segments and keeps it perpendicular to the path tangent.
    const tangentDotNormal = normalizedTangentX * normalX
      + normalizedTangentY * normalY
      + normalizedTangentZ * normalZ

    normalX -= normalizedTangentX * tangentDotNormal
    normalY -= normalizedTangentY * tangentDotNormal
    normalZ -= normalizedTangentZ * tangentDotNormal

    const normalLength = Math.hypot(normalX, normalY, normalZ)
    normalX /= normalLength
    normalY /= normalLength
    normalZ /= normalLength

    // Tangent cross normal supplies the second axis of the bundle's circular
    // cross-section. Together, normal and binormal form its local 2D plane.
    let binormalX = normalizedTangentY * normalZ
      - normalizedTangentZ * normalY
    let binormalY = normalizedTangentZ * normalX
      - normalizedTangentX * normalZ
    let binormalZ = normalizedTangentX * normalY
      - normalizedTangentY * normalX
    const binormalLength = Math.hypot(
      binormalX,
      binormalY,
      binormalZ,
    )

    binormalX /= binormalLength
    binormalY /= binormalLength
    binormalZ /= binormalLength

    normalDirections[frameOffset] = normalX
    normalDirections[frameOffset + 1] = normalY
    normalDirections[frameOffset + 2] = normalZ
    binormalDirections[frameOffset] = binormalX
    binormalDirections[frameOffset + 1] = binormalY
    binormalDirections[frameOffset + 2] = binormalZ

    previousTangentX = normalizedTangentX
    previousTangentY = normalizedTangentY
    previousTangentZ = normalizedTangentZ
  }

  return {
    binormalDirections,
    centerPositions,
    normalDirections,
  }
}
