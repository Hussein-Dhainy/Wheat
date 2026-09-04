import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AnimationMixer, MathUtils, Object3D, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { configureGLTFLoader } from '../../systems/gltfAssetLoader.js'
import {
  GENETICS_GROWTH_TIMING,
  GENETICS_SEEDLING_MODEL,
  GENETICS_SEEDLING_LIGHTING,
} from '../../../config/geneticsSeeds.js'
import { SCENE_TIMELINE_CONFIG } from '../../../config/sceneTimeline.js'

const MODEL_URL = '/models/seedling/WheatSeedlingGrowth-web.glb'
const SEED_MODEL_URL = '/models/seedling/WheatSeed-web.glb'
const GENETICS_TIMELINE = SCENE_TIMELINE_CONFIG.find(
  (scene) => scene.id === 'genetics',
).timeline
const GENETICS_SCROLL_LENGTH = GENETICS_TIMELINE.sections.reduce(
  (total, section) => total + section.scrollLength,
  0,
)
const keyTargetPosition = new Vector3()
const floatingSeedTransform = new Object3D()
const FLOATING_SEEDS = [
  { x: -0.28, height: 1.01, z: 0.28, scale: 2.03, phase: 0.3, speed: 0.32 },
  { x: 0.22, height: 1.21, z: -0.34, scale: 1.86, phase: 1.6, speed: -0.28 },
  { x: -0.17, height: 1.42, z: 0.42, scale: 1.71, phase: 2.9, speed: 0.37 },
  { x: 0.3, height: 1.64, z: -0.26, scale: 1.55, phase: 4.2, speed: -0.31 },
  { x: -0.03, height: 1.87, z: 0.16, scale: 1.4, phase: 5.5, speed: 0.26 },
]

function linearRange(value, range) {
  return MathUtils.clamp((value - range[0]) / (range[1] - range[0]), 0, 1)
}

function smoothRange(value, range) {
  return MathUtils.smoothstep(value, range[0], range[1])
}

export default function DNASeedlingGrowth({
  reducedMotion,
  sceneStateRef,
}) {
  const actionReference = useRef()
  const groupReference = useRef()
  const keyLightReference = useRef()
  const keyTargetReference = useRef()
  const seedHighlightReference = useRef()
  const floatingSeedsReference = useRef()
  const { gl, viewport } = useThree()
  const compact = viewport.width < 4
  const { animations, scene } = useLoader(
    GLTFLoader,
    MODEL_URL,
    configureGLTFLoader(gl),
  )
  const seedAsset = useLoader(
    GLTFLoader,
    SEED_MODEL_URL,
    configureGLTFLoader(gl),
  )
  const model = useMemo(() => {
    const instance = clone(scene)
    const plant = instance.getObjectByName('Seed.001')
    if (plant) plant.position.x += GENETICS_SEEDLING_MODEL.plantDepthOffset

    return instance
  }, [scene])
  const floatingSeedAsset = useMemo(() => {
    let mesh
    seedAsset.scene.traverse((object) => {
      if (!mesh && object.isMesh) mesh = object
    })
    if (!mesh) return null

    const material = mesh.material.clone()
    material.emissive?.set('#241307')
    material.emissiveIntensity = 0.06
    return { geometry: mesh.geometry, material }
  }, [seedAsset])
  const mixer = useMemo(() => new AnimationMixer(model), [model])
  const clip = animations[0]

  useEffect(() => {
    if (!clip) return undefined
    const action = mixer.clipAction(clip)
    action.play()
    action.paused = true
    action.time = 0
    actionReference.current = action
    mixer.update(0)

    return () => {
      actionReference.current = null
      action.stop()
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    }
  }, [clip, mixer, model])

  useEffect(
    () => () => floatingSeedAsset?.material.dispose(),
    [floatingSeedAsset],
  )

  useFrame(({ clock }) => {
    if (!groupReference.current || !sceneStateRef?.current) return

    const sceneProgress = MathUtils.clamp(
      sceneStateRef.current.progress ?? 0,
      0,
      1,
    )
    const entry = linearRange(sceneProgress, GENETICS_GROWTH_TIMING.entryRange)
    const reveal = smoothRange(sceneProgress, GENETICS_GROWTH_TIMING.revealRange)
    const growth = reducedMotion
      ? (reveal > 0 ? 1 : 0)
      : smoothRange(sceneProgress, GENETICS_GROWTH_TIMING.animationRange)
    const seedTrailEntry = smoothRange(
      sceneProgress,
      [0, GENETICS_GROWTH_TIMING.entryRange[0]],
    )
    const seedTrailOffsetY = MathUtils.lerp(-2.3, 0, seedTrailEntry)
    const transitionMotionOffset = reducedMotion
      ? 0
      : sceneStateRef.current.transitionMotionOffset ?? 0

    if (clip && actionReference.current) {
      actionReference.current.time = growth * clip.duration
      mixer.update(0)
    }

    const entryStartY = -viewport.height * 1.15 - 2
    const entryEndY = compact ? -1.9 : -2.1
    const entryProgressSpan = GENETICS_GROWTH_TIMING.entryRange[1]
      - GENETICS_GROWTH_TIMING.entryRange[0]
    const entryScrollDistance = entryProgressSpan * GENETICS_SCROLL_LENGTH
    const transitionTravel = (entryEndY - entryStartY)
      / entryScrollDistance
      * GENETICS_TIMELINE.exitTransitionLength

    groupReference.current.position.x = 0
    groupReference.current.position.y = MathUtils.lerp(
      entryStartY,
      entryEndY,
      entry,
    ) + transitionMotionOffset * transitionTravel
    groupReference.current.position.z = compact ? -1.6 : -2
    const finalScale = compact ? 2.75 : 3.8
    groupReference.current.scale.setScalar(finalScale)

    if (floatingSeedsReference.current) {
      const time = reducedMotion ? 0 : clock.elapsedTime

      FLOATING_SEEDS.forEach((seed, index) => {
        const drift = reducedMotion ? 0 : Math.sin(time * 0.48 + seed.phase) * 0.05
        floatingSeedTransform.position.set(
          seed.z / finalScale,
          seed.height + seedTrailOffsetY,
          -(seed.x + drift) / finalScale,
        )
        floatingSeedTransform.rotation.set(
          seed.phase * 0.31 + time * seed.speed * 0.5,
          seed.phase + time * seed.speed,
          seed.phase * 0.19 + time * seed.speed * 0.3,
        )
        floatingSeedTransform.scale.setScalar(seed.scale / finalScale)
        floatingSeedTransform.updateMatrix()
        floatingSeedsReference.current.setMatrixAt(
          index,
          floatingSeedTransform.matrix,
        )
      })
      floatingSeedsReference.current.instanceMatrix.needsUpdate = true
    }

    if (seedHighlightReference.current) {
      const highlight = GENETICS_SEEDLING_LIGHTING.seedHighlight
      seedHighlightReference.current.position.set(
        highlight.zOffset / finalScale,
        highlight.height + seedTrailOffsetY,
        -highlight.xOffset / finalScale,
      )
      seedHighlightReference.current.intensity = highlight.intensity
    }

    if (keyLightReference.current && keyTargetReference.current) {
      groupReference.current.getWorldPosition(keyTargetPosition)
      keyTargetPosition.y += GENETICS_SEEDLING_LIGHTING.targetHeight
      keyTargetReference.current.position.copy(keyTargetPosition)
      keyLightReference.current.target = keyTargetReference.current
    }

  })

  return (
    <>
      <hemisphereLight
        args={[
          GENETICS_SEEDLING_LIGHTING.hemisphere.skyColor,
          GENETICS_SEEDLING_LIGHTING.hemisphere.groundColor,
          GENETICS_SEEDLING_LIGHTING.hemisphere.intensity,
        ]}
      />
      <spotLight
        ref={keyLightReference}
        {...GENETICS_SEEDLING_LIGHTING.warmKey}
      />
      <object3D ref={keyTargetReference} />
      <directionalLight {...GENETICS_SEEDLING_LIGHTING.blueRim} />
      <directionalLight {...GENETICS_SEEDLING_LIGHTING.tealBacklight} />
      <group
        ref={groupReference}
        position={[
          0,
          -viewport.height * 1.15 - 2,
          compact ? -1.6 : -2,
        ]}
        rotation={[0, -Math.PI / 2, 0]}
        >
        <pointLight
          ref={seedHighlightReference}
          color={GENETICS_SEEDLING_LIGHTING.seedHighlight.color}
          intensity={GENETICS_SEEDLING_LIGHTING.seedHighlight.intensity}
          distance={GENETICS_SEEDLING_LIGHTING.seedHighlight.distance}
          decay={GENETICS_SEEDLING_LIGHTING.seedHighlight.decay}
        />
        {floatingSeedAsset ? (
          <instancedMesh
            ref={floatingSeedsReference}
            args={[
              floatingSeedAsset.geometry,
              floatingSeedAsset.material,
              FLOATING_SEEDS.length,
            ]}
            frustumCulled={false}
            dispose={null}
          />
        ) : null}
        <group>
          {[
            {
              position: [0, GENETICS_SEEDLING_LIGHTING.grounding.y, 0],
              scale: [0.64, 0.5, 1],
            },
            {
              position: [
                -1.162,
                GENETICS_SEEDLING_LIGHTING.grounding.y + 0.03,
                -0.739,
              ],
              scale: [0.52, 0.38, 1],
            },
            {
              position: [
                -1.808,
                GENETICS_SEEDLING_LIGHTING.grounding.y + 0.06,
                0.561,
              ],
              scale: [0.47, 0.34, 1],
            },
          ].map((shadow, index) => (
            <mesh
              key={index}
              position={shadow.position}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={shadow.scale}
              renderOrder={-1}
            >
              <circleGeometry args={[1, 40]} />
              <meshBasicMaterial
                color={GENETICS_SEEDLING_LIGHTING.grounding.color}
                opacity={GENETICS_SEEDLING_LIGHTING.grounding.opacity}
                transparent
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
        <primitive object={model} />
      </group>
    </>
  )
}
