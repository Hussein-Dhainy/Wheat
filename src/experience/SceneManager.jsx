import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Color,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector4,
} from 'three'
import { SCENE_TIMELINE } from '../config/sceneTimeline.js'
import { PortalScene } from './PortalScene.jsx'
import {
  createOverlayUpdateSignature,
  getCompositorRenderTargetSize,
} from './sceneManagerPerformance.js'
import {
  DIAGONAL_TRANSITION,
  MINIMUM_TRANSITION_PROGRESS,
  createRenderTarget,
  createSceneState,
  updateOverlayLayers,
  updateSceneStates,
} from './sceneManagerState.js'
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

if (
  SCENE_TIMELINE.scenes.length !== SCENE_COUNT
  || SCENE_TIMELINE.scenes.some(
    (scene, index) => scene.id !== SCENE_REGISTRY[index].id,
  )
) {
  throw new Error('Scene timeline configuration must match SceneRegistry order')
}

export function SceneManager({
  entered,
  onSelectGeneticsSeed,
  onWarmupComplete,
  overlayRootRef,
  pointerRef,
  predictionTestsOpen,
  reducedMotion,
  resultInspectionOpen,
  resultInteractionRef,
  scrollRef,
  selectedGeneticsSeed,
  selectedPredictionCondition,
  selectedResultView,
}) {
  const { camera: rootCamera, gl, size, viewport } = useThree()
  const transitionMaterial = useRef()
  const renderTargetBPair = useRef('')
  const renderTargetLifecycle = useRef({
    generation: 0,
    renderTargetA: null,
    renderTargetB: null,
  })
  const transitionState = useRef(resolveSceneTimeline(
    SCENE_TIMELINE.initialPosition,
    SCENE_TIMELINE,
  ))
  const overlayCache = useRef({
    activeSectionIndices: [],
    announcer: null,
    announcementKey: '',
    dominantIndex: -1,
    layerVisibilityActive: [],
    layers: [],
    pairKey: '',
    root: null,
    sections: [],
  })
  const overlayFrameCache = useRef({ root: null, signature: '' })
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
    const { width, height } = getCompositorRenderTargetSize(
      drawingBufferSize.x,
      drawingBufferSize.y,
    )

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

  // Every scene mounts immediately (all five are always in the tree, per
  // PortalScene below), but the render loop only ever calls gl.render() on
  // whichever scene is currently "current" or "next" — a scene's shaders
  // don't actually get compiled, and its textures don't get uploaded to the
  // GPU, until scrolling makes it one of those for the first time. That
  // first real render is a synchronous, main-thread-blocking cost (worst
  // for scenes with large textures, e.g. field trials' ~3.6MB texture),
  // which reads as scrolling suddenly stalling for a moment.
  //
  // This runs once, forcing every scene through one real (offscreen,
  // 8x8, never displayed) render pass up front — by the time the
  // preloader lets go (see onWarmupComplete, threaded up to App.jsx's
  // canvasReady gate), nothing left in the experience is "new" to the GPU.
  useEffect(() => {
    const warmupTarget = createRenderTarget('Scene warm-up')
    warmupTarget.setSize(8, 8)

    const previousRenderTarget = gl.getRenderTarget()
    const previousAutoClear = gl.autoClear
    gl.autoClear = true

    portalScenes.forEach((scene, index) => {
      gl.setRenderTarget(warmupTarget)
      gl.render(scene, portalCameras[index])
    })

    gl.setRenderTarget(previousRenderTarget)
    gl.autoClear = previousAutoClear
    warmupTarget.dispose()

    onWarmupComplete?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const scroll = advanceVirtualScroll(
      scrollRef.current,
      delta,
      scrollRef.current.damping ?? undefined,
    )
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

    const overlayRoot = overlayRootRef.current
    if (overlayRoot) {
      const overlaySignature = createOverlayUpdateSignature(scroll, transition)
      const frameCache = overlayFrameCache.current

      if (frameCache.root !== overlayRoot || frameCache.signature !== overlaySignature) {
        updateOverlayLayers(overlayRoot, overlayCache.current, transition)
        const timelinePosition = scroll.current.toFixed(4)
        const timelineTarget = scroll.target.toFixed(4)
        if (overlayRoot.dataset.timelinePosition !== timelinePosition) {
          overlayRoot.dataset.timelinePosition = timelinePosition
        }
        if (overlayRoot.dataset.timelineTarget !== timelineTarget) {
          overlayRoot.dataset.timelineTarget = timelineTarget
        }
        frameCache.root = overlayRoot
        frameCache.signature = overlaySignature
      }
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
          onSelectGeneticsSeed={onSelectGeneticsSeed}
          pointerRef={pointerRef}
          predictionTestsOpen={predictionTestsOpen}
          reducedMotion={reducedMotion}
          resultInspectionOpen={resultInspectionOpen}
          resultInteractionRef={resultInteractionRef}
          scene={portalScenes[index]}
          sceneStateRef={sceneStateRefs[index]}
          selectedGeneticsSeed={selectedGeneticsSeed}
          selectedPredictionCondition={selectedPredictionCondition}
          selectedResultView={selectedResultView}
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
