import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Box3, Color, MathUtils, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { advanceActiveSceneTime } from '../activeSceneTime.js'
import { LandingCameraRig } from '../camera/LandingCameraRig.jsx'
import { BackgroundParticles } from '../systems/BackgroundParticles.jsx'

const WHEAT_MODEL_URL = '/models/wheat.glb'
const WHEAT_MODEL_HEIGHT = 8.4

// Edit these values to tune the wheat texture's color response.
const WHEAT_MATERIAL = {
  tint: new Color('#f2b632'),
  tintAmount: 0.28,
  roughnessScale: 0.82,
}

// Edit these values to tune the landing scene's cinematic lighting.
const LANDING_LIGHTING = {
  ambient: {
    color: '#ffffff',
    intensity: 0.00,
  },
  key: {
    color: '#fff0b8',
    position: [4.5, 6, 3.5],
    intensity: 145,
    distance: 16,
    angle: 0.42,
    penumbra: 0.76,
    decay: 2,
  },
  keyTarget: [0, 2.1, 0],
  rim: {
    color: '#d7192d',
    position: [-4.5, 2.8, -4],
    intensity: 50,
    distance: 14,
    angle: 0.38,
    penumbra: 0.84,
    decay: 2,
  },
  rimTarget: [0, 1.65, 0],
}

// Edit these values to tune the wheat model's placement and motion.
const WHEAT_TRANSFORM = {
  desktopPosition: [0, 0, 0],
  compactPosition: [0, -0.9, 0],
  rotation: [-0.55, 0, -0.08],
  positionTransitionSpeed: 3.5,
  rotationTransitionSpeed: 3,
  idlePositionAmount: 0.055,
  idleRotationAmount: 0.025,
}

function LandingLights() {
  const keyLight = useRef()
  const keyTarget = useRef()
  const rimLight = useRef()
  const rimTarget = useRef()

  useLayoutEffect(() => {
    keyLight.current.target = keyTarget.current
    rimLight.current.target = rimTarget.current
  }, [])

  return (
    <>
      <object3D ref={keyTarget} position={LANDING_LIGHTING.keyTarget} />
      <object3D ref={rimTarget} position={LANDING_LIGHTING.rimTarget} />
      <ambientLight {...LANDING_LIGHTING.ambient} />
      <spotLight ref={keyLight} {...LANDING_LIGHTING.key} />
      <spotLight ref={rimLight} {...LANDING_LIGHTING.rim} />
    </>
  )
}

function WheatPlant({ reducedMotion, sceneStateRef }) {
  const activeTime = useRef(0)
  const wheat = useRef()
  const { size } = useThree()
  const { scene } = useLoader(GLTFLoader, WHEAT_MODEL_URL)
  const { model, ownedMaterials } = useMemo(() => {
    const clonedModel = cloneSkeleton(scene)
    const materialClones = new Map()

    const enhanceMaterial = (sourceMaterial) => {
      if (materialClones.has(sourceMaterial)) {
        return materialClones.get(sourceMaterial)
      }

      const material = sourceMaterial.clone()

      if (material.color) {
        material.color.lerp(WHEAT_MATERIAL.tint, WHEAT_MATERIAL.tintAmount)
      }

      if (typeof material.roughness === 'number') {
        material.roughness = MathUtils.clamp(
          material.roughness * WHEAT_MATERIAL.roughnessScale,
          0,
          1,
        )
      }

      materialClones.set(sourceMaterial, material)
      return material
    }

    clonedModel.traverse((child) => {
      if (!child.isMesh) return

      child.material = Array.isArray(child.material)
        ? child.material.map(enhanceMaterial)
        : enhanceMaterial(child.material)
    })

    return {
      model: clonedModel,
      ownedMaterials: [...materialClones.values()],
    }
  }, [scene])

  useEffect(
    () => () => ownedMaterials.forEach((material) => material.dispose()),
    [ownedMaterials],
  )

  const modelLayout = useMemo(() => {
    const bounds = new Box3().setFromObject(model)
    const center = bounds.getCenter(new Vector3())
    const modelSize = bounds.getSize(new Vector3())

    return {
      position: [-center.x, -center.y, -center.z],
      scale: WHEAT_MODEL_HEIGHT / modelSize.y,
    }
  }, [model])

  useFrame((_, delta) => {
    if (sceneStateRef && !sceneStateRef.current.isActive) return

    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      delta,
      !reducedMotion,
    )

    const compact = size.width < 760
    const basePosition = compact
      ? WHEAT_TRANSFORM.compactPosition
      : WHEAT_TRANSFORM.desktopPosition
    const idle = reducedMotion ? 0 : Math.sin(activeTime.current * 0.55)

    wheat.current.position.x = MathUtils.damp(
      wheat.current.position.x,
      basePosition[0],
      WHEAT_TRANSFORM.positionTransitionSpeed,
      delta,
    )
    wheat.current.position.y = MathUtils.damp(
      wheat.current.position.y,
      basePosition[1]
        + idle * WHEAT_TRANSFORM.idlePositionAmount,
      WHEAT_TRANSFORM.positionTransitionSpeed,
      delta,
    )
    wheat.current.rotation.x = MathUtils.damp(
      wheat.current.rotation.x,
      WHEAT_TRANSFORM.rotation[0]
        + idle * WHEAT_TRANSFORM.idleRotationAmount,
      WHEAT_TRANSFORM.rotationTransitionSpeed,
      delta,
    )
    wheat.current.rotation.y = MathUtils.damp(
      wheat.current.rotation.y,
      WHEAT_TRANSFORM.rotation[1],
      WHEAT_TRANSFORM.rotationTransitionSpeed,
      delta,
    )
  })

  return (
    <group
      ref={wheat}
      position={WHEAT_TRANSFORM.desktopPosition}
      rotation={WHEAT_TRANSFORM.rotation}
    >
      <group position={modelLayout.position} scale={modelLayout.scale}>
        <primitive object={model} />
      </group>
    </group>
  )
}

export function LandingScene({
  entered,
  pointerRef,
  reducedMotion,
  sceneStateRef,
}) {
  return (
    <>
      <fog attach="fog" args={['#2a0c03', 8, 16]} />

      <LandingCameraRig
        entered={entered}
        pointerRef={pointerRef}
        reducedMotion={reducedMotion}
        sceneStateRef={sceneStateRef}
      />

      <LandingLights />

      <group>
        <BackgroundParticles
          reducedMotion={reducedMotion}
          sceneStateRef={sceneStateRef}
        />
        <Suspense fallback={null}>
          <WheatPlant
            reducedMotion={reducedMotion}
            sceneStateRef={sceneStateRef}
          />
        </Suspense>
      </group>
    </>
  )
}

useLoader.preload(GLTFLoader, WHEAT_MODEL_URL)
