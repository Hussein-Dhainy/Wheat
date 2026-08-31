import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, Vector3 } from 'three'

const CAMERA_TARGET = new Vector3(0, 0, 0)

// Edit these values to tune the cursor-driven parallax.
const DNA_CAMERA = {
  dampSpeed: 2,
  horizontalRange: 3.5,
  verticalRange: 1,
}

export function DNACameraRig({
  pointerRef,
  reducedMotion,
  sceneStateRef,
}) {
  const { camera } = useThree()
  const basePosition = useRef(null)

  useFrame((_, delta) => {
    if (sceneStateRef && !sceneStateRef.current.isActive) return
    if (!basePosition.current) basePosition.current = camera.position.clone()

    const base = basePosition.current
    const pointer = pointerRef?.current
    const motionScale = reducedMotion ? 0 : 1
    const targetX = base.x + (pointer?.ndcX ?? 0)
      * DNA_CAMERA.horizontalRange
      * motionScale
    const targetY = base.y + (pointer?.ndcY ?? 0)
      * DNA_CAMERA.verticalRange
      * motionScale

    camera.position.x = reducedMotion
      ? targetX
      : MathUtils.damp(
          camera.position.x,
          targetX,
          DNA_CAMERA.dampSpeed,
          delta,
        )
    camera.position.y = reducedMotion
      ? targetY
      : MathUtils.damp(
          camera.position.y,
          targetY,
          DNA_CAMERA.dampSpeed,
          delta,
        )
    camera.position.z = base.z
    camera.lookAt(CAMERA_TARGET)
  })

  return null
}
