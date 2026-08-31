import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import {
  preloadWheatGrain,
  useWheatGrainAssets,
} from '../../systems/useWheatGrainAssets.js'
import { DNA_RENDER_CONFIG } from './dnaConfig.js'

const CONFIG = DNA_RENDER_CONFIG.detail

// Converts a top-left viewport fraction into a camera-relative world position.
// Keeping the grain in camera space lets the DNA camera retain its pointer
// parallax while the grain stays centred inside the HTML detail rings.
function resolveAnchoredPosition(anchor, camera, aspect, target) {
  const distance = Math.abs(camera.position.z - CONFIG.grain.depth)
  const height = 2 * distance * Math.tan(MathUtils.degToRad(camera.fov * 0.5))
  return target.set(
    (anchor[0] * 2 - 1) * height * aspect * 0.5,
    (1 - anchor[1] * 2) * height * 0.5,
    -distance,
  ).applyQuaternion(camera.quaternion).add(camera.position)
}

export default function DNAGeneticsDetail({
  geneticsDetailOpen,
  reducedMotion,
  sceneStateRef,
}) {
  const { camera, size } = useThree()
  const anchoredPosition = useRef(new Vector3())
  const assets = useWheatGrainAssets()
  const activeTime = useRef(0)
  const detailMix = useRef(0)
  const grainReference = useRef()

  useFrame((_, deltaTime) => {
    if (!grainReference.current) return

    // Scene 2 can be scrolled away from while the detail is still open. Reset
    // here as well as in DNAHelix so the grain never re-enters mid-reveal.
    if (!sceneStateRef?.current?.isActive) {
      activeTime.current = 0
      detailMix.current = 0
      grainReference.current.visible = false
      assets.material.opacity = 0
      return
    }

    const target = geneticsDetailOpen ? 1 : 0
    detailMix.current = reducedMotion
      ? target
      : MathUtils.damp(
          detailMix.current,
          target,
          CONFIG.transitionDamping,
          deltaTime,
        )
    const mix = detailMix.current
    const opacity = MathUtils.smoothstep(mix, 0.3, 0.62)
    const reveal = MathUtils.smootherstep(
      mix,
      CONFIG.grainRevealRange[0],
      CONFIG.grainRevealRange[1],
    )
    const mobile = size.width < 760
    const position = resolveAnchoredPosition(
      mobile ? CONFIG.grain.mobileAnchor : CONFIG.grain.desktopAnchor,
      camera,
      size.width / size.height,
      anchoredPosition.current,
    )
    const fullScale = mobile
      ? CONFIG.grain.mobileScale
      : CONFIG.grain.desktopScale

    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      deltaTime,
      geneticsDetailOpen && !reducedMotion,
    )

    grainReference.current.visible = mix > 0.002
    grainReference.current.position.copy(position)
    grainReference.current.scale.setScalar(
      MathUtils.lerp(fullScale * 0.012, fullScale, reveal),
    )
    grainReference.current.rotation.set(
      CONFIG.grain.rotation[0],
      CONFIG.grain.rotation[1]
        + activeTime.current * CONFIG.grain.rotationSpeed,
      CONFIG.grain.rotation[2],
    )
    assets.material.opacity = opacity
  })

  return (
    <mesh
      ref={grainReference}
      geometry={assets.geometry}
      material={assets.material}
      frustumCulled={false}
      visible={false}
    />
  )
}

preloadWheatGrain()
