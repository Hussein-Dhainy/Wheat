import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  MathUtils,
  Object3D,
  Vector2,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureGLTFLoader } from '../../systems/gltfAssetLoader.js'
import {
  DEFAULT_GENETICS_SEED_ID,
  GENETICS_SEED_OPTIONS,
} from '../../../config/geneticsSeeds.js'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import carouselRingHaloFragmentShader from './carouselRingHaloFragment.glsl?raw'
import carouselRingHaloVertexShader from './carouselRingHaloVertex.glsl?raw'
import { DNA_RENDER_CONFIG } from './dnaConfig.js'

const CONFIG = DNA_RENDER_CONFIG.seeds
const CLOSED_OPTION = GENETICS_SEED_OPTIONS.find(
  (option) => option.id === 'closed',
)
const FULL_CIRCLE = Math.PI * 2

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function smoothRange(value, range) {
  return MathUtils.smoothstep(value, range[0], range[1])
}

function createTracks() {
  const random = seededRandom(8675309)
  return Array.from({ length: CONFIG.count }, (_, index) => {
    const sequence = index / Math.max(1, CONFIG.count - 1)
    const rotationSpeed = MathUtils.lerp(
      ...CONFIG.streamRotationSpeed,
      random(),
    )
    return {
      initialRotation: [
        random() * FULL_CIRCLE,
        random() * FULL_CIRCLE,
        random() * FULL_CIRCLE,
      ],
      rotationSpeed: [
        rotationSpeed * MathUtils.lerp(-1, 1, random()),
        rotationSpeed * MathUtils.lerp(-1, 1, random()),
        rotationSpeed * MathUtils.lerp(-1, 1, random()),
      ],
      size: MathUtils.lerp(...CONFIG.sizeRange, random()),
      x: MathUtils.lerp(-CONFIG.horizontalRange, CONFIG.horizontalRange, random()),
      y: MathUtils.lerp(...CONFIG.streamYRange, sequence)
        + MathUtils.lerp(-0.18, 0.18, random()),
      z: MathUtils.lerp(...CONFIG.depthRange, random()),
    }
  })
}

function createCarouselRingHaloPositions() {
  const { haloPointCount } = CONFIG.carousel.ring
  const positions = new Float32Array(haloPointCount * 3)

  for (let index = 0; index < haloPointCount; index += 1) {
    const angle = index * FULL_CIRCLE / haloPointCount
    positions[index * 3] = Math.cos(angle) * CONFIG.carousel.radius
    positions[index * 3 + 1] = 0
    positions[index * 3 + 2] = Math.sin(angle) * CONFIG.carousel.radius
  }

  return positions
}

function prepareGeometry(node, name) {
  if (!node?.isMesh || !node.geometry) {
    throw new Error(`Seed model is missing required mesh: ${name}`)
  }

  const geometry = node.geometry.clone()
  geometry.computeBoundingBox()
  const size = new Vector3()
  geometry.boundingBox.getSize(size)
  geometry.center()
  const normalization = 1 / Math.max(size.x, size.y, size.z, 0.0001)
  geometry.scale(normalization, normalization, normalization)
  geometry.computeBoundingSphere()
  return geometry
}

function prepareMaterial(source, tint) {
  const material = source.clone()
  material.color.multiply(new Color(tint))
  material.metalness = 0
  material.roughness = CONFIG.material.roughness
  material.normalScale = new Vector2(
    CONFIG.material.normalScale,
    CONFIG.material.normalScale,
  )
  material.side = DoubleSide
  material.transparent = false
  material.depthWrite = true
  material.emissive.set(CONFIG.material.selectedEmissive)
  material.emissiveIntensity = CONFIG.material.baseEmissiveIntensity
  return material
}

function getTint(optionId) {
  if (optionId === 'open') return CONFIG.material.openTint
  if (optionId === 'semiOpen') return CONFIG.material.semiOpenTint
  return CONFIG.material.closedTint
}

function closestEquivalentAngle(current, target) {
  return current + Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  )
}

function SeedLights() {
  const { hemisphere, tealRim, warmKey } = CONFIG.lighting
  return (
    <>
      <hemisphereLight
        args={[hemisphere.skyColor, hemisphere.groundColor, hemisphere.intensity]}
      />
      <directionalLight {...warmKey} />
      <directionalLight {...tealRim} />
    </>
  )
}

export default function DNAFallingSeeds({
  onSelectSeed,
  reducedMotion,
  sceneStateRef,
  selectedSeedId = DEFAULT_GENETICS_SEED_ID,
}) {
  const activeTime = useRef(0)
  const fallingReference = useRef()
  const carouselReference = useRef()
  const carouselSeedReferences = useRef([])
  const carouselRotation = useRef(0)
  const carouselSeedIsHovered = useRef(false)
  const { gl } = useThree()
  const { scene } = useLoader(GLTFLoader, CONFIG.modelUrl, configureGLTFLoader(gl))
  const tracks = useMemo(createTracks, [])
  const scratchObject = useMemo(() => new Object3D(), [])
  const carouselRingHaloPositions = useMemo(
    createCarouselRingHaloPositions,
    [],
  )
  const carouselRingHaloUniforms = useMemo(() => ({
    uColor: { value: new Color(CONFIG.carousel.ring.color) },
    uFalloffPower: { value: CONFIG.carousel.ring.haloFalloffPower },
    uOpacity: { value: CONFIG.carousel.ring.haloOpacity },
    uPixelRatio: { value: 1 },
    uPointSize: { value: CONFIG.carousel.ring.haloPointSize },
  }), [])

  const assets = useMemo(() => {
    const fallingNode = scene.getObjectByName(CLOSED_OPTION.meshName)
    const sourceMaterial = fallingNode?.material
    if (!sourceMaterial?.isMeshStandardMaterial) {
      throw new Error('Seed model requires a MeshStandardMaterial')
    }

    const carouselGeometries = GENETICS_SEED_OPTIONS.map((option) => (
      prepareGeometry(
        scene.getObjectByName(option.heroMeshName),
        option.heroMeshName,
      )
    ))
    const carouselMaterials = GENETICS_SEED_OPTIONS.map((option) => (
      prepareMaterial(sourceMaterial, getTint(option.id))
    ))

    return {
      carouselGeometries,
      carouselMaterials,
      fallingGeometry: prepareGeometry(fallingNode, CLOSED_OPTION.meshName),
      fallingMaterial: prepareMaterial(sourceMaterial, CONFIG.material.closedTint),
    }
  }, [scene])

  useLayoutEffect(() => {
    fallingReference.current.count = 0
  }, [])

  useEffect(() => {
    fallingReference.current.instanceMatrix.setUsage(DynamicDrawUsage)

    return () => {
      assets.fallingGeometry.dispose()
      assets.fallingMaterial.dispose()
      assets.carouselGeometries.forEach((geometry) => geometry.dispose())
      assets.carouselMaterials.forEach((material) => material.dispose())
    }
  }, [assets])

  useEffect(() => () => {
    if (carouselSeedIsHovered.current) {
      gl.domElement.style.cursor = ''
    }
  }, [gl])

  const carouselIsInteractive = () => (
    sceneStateRef?.current?.isActive
    && (sceneStateRef.current.progress ?? 0)
      >= CONFIG.carousel.interactionStartProgress
  )

  const handleSeedClick = (event, optionId) => {
    if (!carouselIsInteractive()) return
    event.stopPropagation()
    onSelectSeed?.(optionId)
  }

  const handleSeedPointerEnter = (event) => {
    if (!carouselIsInteractive()) return
    event.stopPropagation()
    carouselSeedIsHovered.current = true
    gl.domElement.style.cursor = 'pointer'
  }

  const handleSeedPointerLeave = () => {
    carouselSeedIsHovered.current = false
    gl.domElement.style.cursor = ''
  }

  useFrame(({ gl: renderer }, deltaTime) => {
    if (!sceneStateRef?.current?.isActive) return

    carouselRingHaloUniforms.uPixelRatio.value = renderer.getPixelRatio()

    const sceneProgress = MathUtils.clamp(
      sceneStateRef.current.progress ?? 0,
      0,
      1,
    )
    const transitionTravel = reducedMotion
      ? 0
      : (sceneStateRef.current.transitionMotionOffset ?? 0)
        * CONFIG.transitionTravel
    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      deltaTime,
      !reducedMotion,
    )
    const time = reducedMotion ? 0 : activeTime.current
    const streamProgress = smoothRange(
      sceneProgress,
      CONFIG.streamScrollRange,
    )
    const scrollTravel = streamProgress * CONFIG.streamTravel
    fallingReference.current.position.y = scrollTravel + transitionTravel
    carouselReference.current.position.y = CONFIG.carousel.center[1]
      - CONFIG.streamTravel
      + scrollTravel
      + transitionTravel

    tracks.forEach((track, index) => {
      scratchObject.position.set(
        track.x,
        track.y,
        track.z,
      )
      scratchObject.rotation.set(
        track.initialRotation[0] + time * track.rotationSpeed[0],
        track.initialRotation[1] + time * track.rotationSpeed[1],
        track.initialRotation[2] + time * track.rotationSpeed[2],
      )
      scratchObject.scale.setScalar(track.size)
      scratchObject.updateMatrix()
      fallingReference.current.setMatrixAt(index, scratchObject.matrix)
    })

    fallingReference.current.count = tracks.length
    fallingReference.current.instanceMatrix.needsUpdate = true

    const selectedIndex = Math.max(
      0,
      GENETICS_SEED_OPTIONS.findIndex((option) => option.id === selectedSeedId),
    )
    const selectedBaseAngle = selectedIndex * FULL_CIRCLE
      / GENETICS_SEED_OPTIONS.length
    const targetRotation = closestEquivalentAngle(
      carouselRotation.current,
      selectedBaseAngle - Math.PI / 2,
    )
    carouselRotation.current = reducedMotion
      ? targetRotation
      : MathUtils.damp(
        carouselRotation.current,
        targetRotation,
        CONFIG.carousel.rotationDamping,
        deltaTime,
    )
    carouselReference.current.rotation.y = carouselRotation.current

    carouselSeedReferences.current.forEach((seed, index) => {
      if (!seed) return
      const baseAngle = index * FULL_CIRCLE / GENETICS_SEED_OPTIONS.length
      const frontness = (Math.sin(baseAngle - carouselRotation.current) + 1) / 2
      const depthScale = MathUtils.lerp(
        CONFIG.carousel.rearScale,
        CONFIG.carousel.frontScale,
        frontness,
      )
      const individualSpeed = MathUtils.lerp(
        ...CONFIG.carousel.individualRotationSpeed,
        index / Math.max(1, GENETICS_SEED_OPTIONS.length - 1),
      )
      const rotationDirection = index % 2 === 0 ? 1 : -1
      seed.scale.setScalar(CONFIG.carousel.seedSize * depthScale)
      seed.rotation.x = -0.18
        + time * individualSpeed * 0.55 * rotationDirection
        + Math.sin(time * 0.4 + index) * 0.035
      seed.rotation.y = index * 0.22
        + time * individualSpeed * rotationDirection
      seed.rotation.z = 0.08
        + Math.cos(time * 0.35 + index) * 0.025
      assets.carouselMaterials[index].emissiveIntensity = MathUtils.lerp(
        CONFIG.material.baseEmissiveIntensity,
        CONFIG.material.selectedEmissiveIntensity,
        frontness,
      )
    })
  })

  return (
    <>
      <SeedLights />
      <instancedMesh
        ref={fallingReference}
        args={[assets.fallingGeometry, assets.fallingMaterial, CONFIG.count]}
        frustumCulled={false}
      />
      <group
        ref={carouselReference}
        position={[
          CONFIG.carousel.center[0],
          CONFIG.carousel.center[1] - CONFIG.streamTravel,
          CONFIG.carousel.center[2],
        ]}
      >
        <points frustumCulled={false} renderOrder={-1}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[carouselRingHaloPositions, 3]}
            />
          </bufferGeometry>
          <shaderMaterial
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={carouselRingHaloFragmentShader}
            toneMapped={false}
            transparent
            uniforms={carouselRingHaloUniforms}
            vertexShader={carouselRingHaloVertexShader}
          />
        </points>
        <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={0}>
          <torusGeometry
            args={[
              CONFIG.carousel.radius,
              CONFIG.carousel.ring.coreTubeRadius,
              8,
              128,
            ]}
          />
          <meshBasicMaterial
            color={CONFIG.carousel.ring.color}
            blending={AdditiveBlending}
            depthWrite={false}
            opacity={CONFIG.carousel.ring.coreOpacity}
            toneMapped={false}
            transparent
          />
        </mesh>
        {GENETICS_SEED_OPTIONS.map((option, index) => {
          const angle = index * FULL_CIRCLE / GENETICS_SEED_OPTIONS.length
          return (
            <mesh
              key={option.id}
              ref={(node) => { carouselSeedReferences.current[index] = node }}
              geometry={assets.carouselGeometries[index]}
              material={assets.carouselMaterials[index]}
              onClick={(event) => handleSeedClick(event, option.id)}
              onPointerEnter={handleSeedPointerEnter}
              onPointerLeave={handleSeedPointerLeave}
              position={[
                Math.cos(angle) * CONFIG.carousel.radius,
                0,
                Math.sin(angle) * CONFIG.carousel.radius,
              ]}
              frustumCulled={false}
            />
          )
        })}
      </group>
    </>
  )
}

// Intentionally not a useLoader.preload: KTX2 transcoding has to be told which
// compressed format the renderer supports, and no renderer exists at module
// evaluation time. Every scene mounts immediately behind the preloader overlay,
// so the in-component useLoader begins the same fetch within a frame of where a
// module-level preload would have.
