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

    camera.position.x = MathUtils.damp(
      camera.position.x,
      Math.sin(yaw) * pitchRadius,
      LANDING_INTRO.cameraTransitionSpeed,
      delta,
    )
    camera.position.y = MathUtils.damp(
      camera.position.y,
      Math.sin(pitch) * radius,
      LANDING_INTRO.cameraTransitionSpeed,
      delta,
    )
    camera.position.z = MathUtils.damp(
      camera.position.z,
      Math.cos(yaw) * pitchRadius,
      LANDING_INTRO.cameraTransitionSpeed,
      delta,
    )
    camera.lookAt(CAMERA_TARGET)
  })

  return null
}
