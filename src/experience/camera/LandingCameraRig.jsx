import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { LANDING_INTRO } from '../../config/landingIntro.js'

const CAMERA_TARGET = new Vector3(0, 0, 0)

// Edit these values to tune the cursor-driven camera orbit.
const LANDING_CAMERA = {
  horizontalOrbit: -0.2,
  verticalOrbit: -0.2,
}

export function LandingCameraRig({
  entered,
  pointerRef,
  reducedMotion,
  sceneStateRef,
}) {
  const { camera } = useThree()

  useFrame((_, delta) => {
    if (sceneStateRef && !sceneStateRef.current.isActive) return

    const pointer = pointerRef.current
    const motionScale = reducedMotion || !entered ? 0 : 1
    const radius = entered || reducedMotion
      ? LANDING_INTRO.cameraSettledRadius
      : LANDING_INTRO.cameraInitialRadius
    const yaw = pointer.ndcX * LANDING_CAMERA.horizontalOrbit * motionScale
    const pitch = pointer.ndcY * LANDING_CAMERA.verticalOrbit * motionScale
    const pitchRadius = Math.cos(pitch) * radius
    const leadingHoldProgress = sceneStateRef?.current.leadingHoldProgress ?? 1
    const transitionMotionOffset = reducedMotion
      ? 0
      : sceneStateRef?.current.transitionMotionOffset ?? 0
    const leadingHoldOffset = (
      1 - MathUtils.smootherstep(leadingHoldProgress, 0, 1)
    ) * LANDING_INTRO.leadingHoldCameraOffsetY
    const transitionOffsetY = -transitionMotionOffset
      * LANDING_INTRO.transitionMotionOffsetY
    const targetX = Math.sin(yaw) * pitchRadius
    const targetY = Math.sin(pitch) * radius
      + leadingHoldOffset
      + transitionOffsetY
    const targetZ = Math.cos(yaw) * pitchRadius

    camera.position.x = reducedMotion
      ? targetX
      : MathUtils.damp(
          camera.position.x,
          targetX,
          LANDING_INTRO.cameraTransitionSpeed,
          delta,
        )
    camera.position.y = reducedMotion
      ? targetY
      : MathUtils.damp(
          camera.position.y,
          targetY,
          LANDING_INTRO.cameraTransitionSpeed,
          delta,
        )
    camera.position.z = reducedMotion
      ? targetZ
      : MathUtils.damp(
          camera.position.z,
          targetZ,
          LANDING_INTRO.cameraTransitionSpeed,
          delta,
        )
    CAMERA_TARGET.y = leadingHoldOffset + transitionOffsetY
    camera.lookAt(CAMERA_TARGET)
  })

  return null
}
