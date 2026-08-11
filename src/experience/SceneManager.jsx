import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Color,
  LinearFilter,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector4,
  WebGLRenderTarget,
} from 'three'
import { SCENE_TIMELINE } from '../config/sceneTimeline.js'
import { getDiagonalBounds } from './sceneMath.js'
import {
  SCENE_COUNT,
  SCENE_REGISTRY,
} from './SceneRegistry.js'
import { resolveSceneTimeline } from './sceneTimeline.js'
import { DiagonalTransition } from './transitions/DiagonalTransition.jsx'
import {
  advanceVirtualScroll,
  configureVirtualScrollTimeline,
} from './virtualScroll.js'

export const DIAGONAL_TRANSITION = {
  overscan: 0.002,
  slope: 0.34,
}

const OVERLAY_DOMINANCE_HYSTERESIS = 0.04
const MINIMUM_TRANSITION_PROGRESS = 1e-6

if (
  SCENE_TIMELINE.scenes.length !== SCENE_COUNT
  || SCENE_TIMELINE.scenes.some(
    (scene, index) => scene.id !== SCENE_REGISTRY[index].id,
  )
) {
  throw new Error('Scene timeline configuration must match SceneRegistry order')
}

function createRenderTarget(name) {
  const target = new WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    stencilBuffer: false,
  })

  target.texture.generateMipmaps = false
  target.texture.name = name
  return target
}

function createSceneState(index) {
  return {
    current: {
      direction: 1,
      index,
      isActive: index < 2,
      isEntering: index === 1,
      isLeaving: false,
      phase: index === 0 ? 'transition' : 'inactive',
      progress: index === 0 ? 1 : 0,
      sectionId: null,
      sectionIndex: -1,
      sectionProgress: index === 0 ? 1 : 0,
      transitionProgress: 0,
      visibility: index === 0 ? 1 : 0,
    },
  }
}

function updateSceneStates(sceneStateRefs, transition, direction, timeline) {
  sceneStateRefs.forEach((stateRef) => {
    const state = stateRef.current
    state.isActive = false
    state.isEntering = false
    state.isLeaving = false
    state.phase = 'inactive'
    state.progress = 0
    state.sectionId = null
    state.sectionIndex = -1
    state.sectionProgress = 0
    state.transitionProgress = 0
    state.visibility = 0
    state.direction = direction
  })

  const sceneA = sceneStateRefs[transition.currentIndex].current
  const sceneB = sceneStateRefs[transition.nextIndex].current

  sceneA.isActive = true
  sceneA.phase = transition.phase
  sceneA.visibility = 1 - transition.progress
  sceneA.progress = transition.sceneProgress
  sceneA.sectionId = transition.sectionId
  sceneA.sectionIndex = transition.sectionIndex
  sceneA.sectionProgress = transition.sectionProgress
  sceneA.transitionProgress = transition.progress

  const nextTimelineScene = timeline.scenes[transition.nextIndex]
  const firstNextSection = nextTimelineScene.sections[0] ?? null
  sceneB.isActive = transition.progress > MINIMUM_TRANSITION_PROGRESS
  sceneB.phase = transition.phase
  sceneB.visibility = transition.progress
  sceneB.progress = 0
  sceneB.sectionId = firstNextSection?.id ?? null
  sceneB.sectionIndex = firstNextSection?.index ?? -1
  sceneB.sectionProgress = 0
  sceneB.transitionProgress = transition.progress

  if (transition.phase !== 'transition') return

  if (direction >= 0) {
    sceneA.isLeaving = transition.progress > 0
    sceneB.isEntering = transition.progress > 0
  } else {
    sceneA.isEntering = transition.progress < 1
    sceneB.isLeaving = transition.progress < 1
  }
}

function getOverlayLayers(root, cache) {
  if (cache.root !== root) {
    cache.root = root
    cache.layers = [...root.querySelectorAll('[data-scene-layer]')]
    cache.sections = cache.layers.map((layer) => (
      [...layer.querySelectorAll('[data-scene-section]')]
    ))
    cache.activeSectionIndices = cache.layers.map(() => -1)
    cache.announcer = root.querySelector('[data-scene-announcer]')
    cache.announcementKey = ''
    cache.pairKey = ''
    cache.dominantIndex = -1
  }

  return cache.layers
}

function updateOverlaySection(cache, sceneIndex, requestedSectionIndex) {
  const sections = cache.sections[sceneIndex] ?? []
  if (sections.length === 0) return 0

  const sectionIndex = Math.max(
    0,
    Math.min(sections.length - 1, requestedSectionIndex),
  )
  if (cache.activeSectionIndices[sceneIndex] === sectionIndex) {
    return sectionIndex
  }

  sections.forEach((section, index) => {
    const active = index === sectionIndex
    section.inert = !active
    section.style.opacity = active ? '1' : '0'
    section.style.pointerEvents = active ? 'auto' : 'none'
    section.style.visibility = active ? 'visible' : 'hidden'
    section.setAttribute('aria-hidden', active ? 'false' : 'true')
  })
  cache.activeSectionIndices[sceneIndex] = sectionIndex
  return sectionIndex
}

function updateOverlayLayers(root, cache, transition) {
  if (!root) return

  const layers = getOverlayLayers(root, cache)
  if (layers.length !== SCENE_COUNT) return

  const pairKey = `${transition.phase}:${transition.currentIndex}:${transition.nextIndex}`
  if (pairKey !== cache.pairKey) {
    layers.forEach((layer, index) => {
      const participates = index === transition.currentIndex
        || (
          transition.phase === 'transition'
          && index === transition.nextIndex
        )
      layer.style.visibility = participates ? 'visible' : 'hidden'
      if (!participates) layer.style.clipPath = 'inset(100%)'
    })
    cache.pairKey = pairKey
  }

  const bounds = getDiagonalBounds(
    transition.progress,
    DIAGONAL_TRANSITION.slope,
    DIAGONAL_TRANSITION.overscan,
  )
  const leftScreenY = (1 - bounds.left) * 100
  const rightScreenY = (1 - bounds.right) * 100
  const sceneAClip = `polygon(0 0, 100% 0, 100% ${rightScreenY}%, 0 ${leftScreenY}%)`
  const sceneBClip = `polygon(0 ${leftScreenY}%, 100% ${rightScreenY}%, 100% 100%, 0 100%)`

  layers[transition.currentIndex].style.clipPath = sceneAClip
  layers[transition.nextIndex].style.clipPath = sceneBClip

  const currentSectionIndex = updateOverlaySection(
    cache,
    transition.currentIndex,
    transition.sectionIndex,
  )
  if (transition.phase === 'transition') {
    updateOverlaySection(cache, transition.nextIndex, 0)
  }

  const currentLayer = layers[transition.currentIndex]
  currentLayer.dataset.sceneContentProgress = transition.sceneProgress.toFixed(4)
  currentLayer.dataset.sectionId = transition.sectionId ?? ''
  currentLayer.dataset.sectionIndex = String(currentSectionIndex)
  currentLayer.dataset.sectionProgress = transition.sectionProgress.toFixed(4)
  currentLayer.style.setProperty('--scene-progress', transition.sceneProgress)
  currentLayer.style.setProperty('--section-progress', transition.sectionProgress)

  const previousDominantParticipates = cache.dominantIndex === transition.currentIndex
    || cache.dominantIndex === transition.nextIndex
  let dominantIndex = previousDominantParticipates
    ? cache.dominantIndex
    : transition.progress < 0.5
      ? transition.currentIndex
      : transition.nextIndex

  if (
    dominantIndex === transition.currentIndex
    && transition.progress >= 0.5 + OVERLAY_DOMINANCE_HYSTERESIS
  ) {
    dominantIndex = transition.nextIndex
  } else if (
    dominantIndex === transition.nextIndex
    && transition.progress <= 0.5 - OVERLAY_DOMINANCE_HYSTERESIS
  ) {
    dominantIndex = transition.currentIndex
  }

  if (dominantIndex !== cache.dominantIndex) {
    layers.forEach((layer, index) => {
      const dominant = index === dominantIndex
      layer.inert = !dominant
      layer.style.pointerEvents = dominant ? 'auto' : 'none'
      layer.setAttribute('aria-hidden', dominant ? 'false' : 'true')
    })

    cache.dominantIndex = dominantIndex
  }

  const dominantSectionIndex = dominantIndex === transition.currentIndex
    ? currentSectionIndex
    : 0
  const dominantSections = cache.sections[dominantIndex] ?? []
  const dominantSection = dominantSections[dominantSectionIndex] ?? null
  const announcementKey = `${dominantIndex}:${dominantSectionIndex}`

  if (announcementKey !== cache.announcementKey) {
    if (cache.announcementKey && cache.announcer) {
      const sectionLabel = dominantSection?.dataset.sectionLabel
        ?? SCENE_REGISTRY[dominantIndex].label
      cache.announcer.textContent = dominantSections.length > 1
        ? `Scene ${dominantIndex + 1} of ${SCENE_COUNT}, section ${dominantSectionIndex + 1} of ${dominantSections.length}: ${sectionLabel}`
        : `Scene ${dominantIndex + 1} of ${SCENE_COUNT}: ${sectionLabel}`
    }
    cache.announcementKey = announcementKey
  }

  root.dataset.sceneA = String(transition.currentIndex)
  root.dataset.sceneB = String(transition.nextIndex)
  root.dataset.sceneContentProgress = transition.sceneProgress.toFixed(4)
  root.dataset.sceneProgress = transition.progress.toFixed(4)
  root.dataset.sectionId = transition.sectionId ?? ''
  root.dataset.sectionIndex = String(currentSectionIndex)
  root.dataset.sectionProgress = transition.sectionProgress.toFixed(4)
  root.dataset.timelineCycle = String(transition.cycleIndex)
  root.dataset.timelinePhase = transition.phase
}

function PortalScene({
  camera,
  entry,
  entered,
  pointerRef,
  reducedMotion,
  scene,
  sceneStateRef,
}) {
  const SceneComponent = entry.component

  return createPortal(
    <SceneComponent
      {...entry.sceneProps}
      entered={entered}
      pointerRef={pointerRef}
      quality="high"
      reducedMotion={reducedMotion}
      sceneStateRef={sceneStateRef}
    />,
    scene,
    {
      camera,
      events: { enabled: false },
    },
  )
}

export function SceneManager({
  entered,
  overlayRootRef,
  pointerRef,
  reducedMotion,
  scrollRef,
}) {
  const { camera: rootCamera, gl, size, viewport } = useThree()
  const transitionMaterial = useRef()
  const renderTargetBPair = useRef('')
  const renderTargetLifecycle = useRef({
    generation: 0,
    renderTargetA: null,
    renderTargetB: null,
  })
  const transitionState = useRef(resolveSceneTimeline(0, SCENE_TIMELINE))
  const overlayCache = useRef({
    activeSectionIndices: [],
    announcer: null,
    announcementKey: '',
    dominantIndex: -1,
    layers: [],
    pairKey: '',
    root: null,
    sections: [],
  })
  const savedClearColor = useMemo(() => new Color(), [])
  const savedScissor = useMemo(() => new Vector4(), [])
  const savedViewport = useMemo(() => new Vector4(), [])
  const drawingBufferSize = useMemo(() => new Vector2(), [])
  const [renderTargetA] = useState(
    () => createRenderTarget('Diagonal transition scene A'),
  )
  const [renderTargetB] = useState(
    () => createRenderTarget('Diagonal transition scene B'),
  )
  const [portalScenes] = useState(
    () => SCENE_REGISTRY.map(() => new Scene()),
  )
  const [portalCameras] = useState(
    () => SCENE_REGISTRY.map((entry, index) => {
      if (index === 0) return rootCamera

      const camera = new PerspectiveCamera(entry.camera?.fov ?? 42, 1, 0.1, 100)
      camera.position.fromArray(entry.camera?.position ?? [0, 0, 7])
      camera.lookAt(0, 0, 0)
      return camera
    }),
  )
  const [sceneStateRefs] = useState(
    () => SCENE_REGISTRY.map((_, index) => createSceneState(index)),
  )

  useEffect(() => {
    gl.getDrawingBufferSize(drawingBufferSize)
    const width = Math.max(1, Math.round(drawingBufferSize.x))
    const height = Math.max(1, Math.round(drawingBufferSize.y))

    renderTargetA.setSize(width, height)
    renderTargetB.setSize(width, height)
    renderTargetBPair.current = ''

    portalCameras.slice(1).forEach((camera) => {
      camera.aspect = size.width / Math.max(1, size.height)
      camera.updateProjectionMatrix()
    })
  }, [
    drawingBufferSize,
    gl,
    portalCameras,
    renderTargetA,
    renderTargetB,
    size.height,
    size.width,
    viewport.dpr,
  ])

  useEffect(() => {
    const generation = renderTargetLifecycle.current.generation + 1
    renderTargetLifecycle.current = {
      generation,
      renderTargetA,
      renderTargetB,
    }

    return () => {
      // Strict Mode and Fast Refresh immediately run the next setup while
      // preserving memoized targets. Defer disposal long enough to distinguish
      // that lifecycle replay from a real unmount or target replacement.
      queueMicrotask(() => {
        const currentLifecycle = renderTargetLifecycle.current
        const componentStayedUnmounted = currentLifecycle.generation === generation
        const targetsWereReplaced = currentLifecycle.renderTargetA !== renderTargetA
          || currentLifecycle.renderTargetB !== renderTargetB

        if (componentStayedUnmounted || targetsWereReplaced) {
          renderTargetA.dispose()
          renderTargetB.dispose()
        }
      })
    }
  }, [renderTargetA, renderTargetB])

  useFrame((_, delta) => {
    configureVirtualScrollTimeline(scrollRef.current, SCENE_TIMELINE)
    const scroll = advanceVirtualScroll(scrollRef.current, delta)
    const transition = resolveSceneTimeline(
      scroll.current,
      SCENE_TIMELINE,
      transitionState.current,
    )
    updateSceneStates(
      sceneStateRefs,
      transition,
      scroll.direction,
      SCENE_TIMELINE,
    )

    if (transitionMaterial.current) {
      const uniforms = transitionMaterial.current.uniforms
      uniforms.uProgress.value = transition.progress
      uniforms.uSlope.value = DIAGONAL_TRANSITION.slope
      uniforms.uOverscan.value = DIAGONAL_TRANSITION.overscan
    }

    updateOverlayLayers(overlayRootRef.current, overlayCache.current, transition)
    if (overlayRootRef.current) {
      overlayRootRef.current.dataset.timelinePosition = scroll.current.toFixed(4)
      overlayRootRef.current.dataset.timelineTarget = scroll.target.toFixed(4)
    }
  }, -100)

  useFrame(({ camera, scene }) => {
    if (!transitionMaterial.current) return

    const transition = transitionState.current
    const previousRenderTarget = gl.getRenderTarget()
    const previousAutoClear = gl.autoClear
    const previousClearAlpha = gl.getClearAlpha()
    const previousScissorTest = gl.getScissorTest()
    gl.getClearColor(savedClearColor)
    gl.getScissor(savedScissor)
    gl.getViewport(savedViewport)

    gl.autoClear = true
    gl.setScissorTest(false)

    gl.setClearColor(0x000000, 0)
    gl.setRenderTarget(renderTargetA)
    gl.render(
      portalScenes[transition.currentIndex],
      portalCameras[transition.currentIndex],
    )

    const renderPair = `${transition.currentIndex}:${transition.nextIndex}`
    if (
      renderTargetBPair.current !== renderPair
      || transition.progress > MINIMUM_TRANSITION_PROGRESS
    ) {
      gl.setClearColor(0x000000, 0)
      gl.setRenderTarget(renderTargetB)
      gl.render(
        portalScenes[transition.nextIndex],
        portalCameras[transition.nextIndex],
      )
      renderTargetBPair.current = renderPair
    }

    gl.setClearColor(0x000000, 0)
    gl.setRenderTarget(null)
    gl.setViewport(savedViewport)
    gl.setScissor(savedScissor)
    gl.setScissorTest(previousScissorTest)
    gl.render(scene, camera)

    gl.setRenderTarget(previousRenderTarget)
    gl.setViewport(savedViewport)
    gl.setScissor(savedScissor)
    gl.setScissorTest(previousScissorTest)
    gl.setClearColor(savedClearColor, previousClearAlpha)
    gl.autoClear = previousAutoClear
  }, 1)

  return (
    <>
      {SCENE_REGISTRY.map((entry, index) => (
        <PortalScene
          key={entry.id}
          camera={portalCameras[index]}
          entered={entered}
          entry={entry}
          pointerRef={pointerRef}
          reducedMotion={reducedMotion}
          scene={portalScenes[index]}
          sceneStateRef={sceneStateRefs[index]}
        />
      ))}

      <DiagonalTransition
        materialRef={transitionMaterial}
        sceneATexture={renderTargetA.texture}
        sceneBTexture={renderTargetB.texture}
      />
    </>
  )
}
