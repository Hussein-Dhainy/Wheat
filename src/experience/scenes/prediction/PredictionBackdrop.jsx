import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Color, MathUtils, Scene, Vector4 } from 'three'
import { createBlurPass, createRenderTarget } from './fieldGeometry.js'
import {
  createBackdropRefreshState,
  shouldRefreshBackdrop,
} from './predictionBackdropPerformance.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const BACKDROP = CONFIG.backdrop

export function PredictionBackdrop({
  children,
  onWarmupComplete,
  quality,
  sceneStateRef,
}) {
  const { camera, gl, size, viewport } = useThree()
  const [backdropScene] = useState(() => new Scene())
  const [sourceRenderTarget] = useState(() => createRenderTarget(true))
  const [horizontalBlurTarget] = useState(() => createRenderTarget(false))
  const [verticalBlurTarget] = useState(() => createRenderTarget(false))
  const blurPass = useMemo(
    () => createBlurPass(
      sourceRenderTarget.texture,
      BACKDROP.quality.high.blurRadius,
    ),
    [sourceRenderTarget],
  )
  const planeRef = useRef()
  const refreshState = useRef(createBackdropRefreshState())
  const resourceLifecycle = useRef({
    generation: 0,
    blurPass: null,
    horizontalBlurTarget: null,
    sourceRenderTarget: null,
    verticalBlurTarget: null,
  })
  const warmupCompleteRef = useRef(false)
  const savedClearColor = useMemo(() => new Color(), [])
  const savedScissor = useMemo(() => new Vector4(), [])
  const savedViewport = useMemo(() => new Vector4(), [])
  const backdropQuality = BACKDROP.quality[quality] ?? BACKDROP.quality.medium

  useEffect(() => {
    const width = Math.max(
      1,
      Math.round(size.width * viewport.dpr * backdropQuality.resolutionScale),
    )
    const height = Math.max(
      1,
      Math.round(size.height * viewport.dpr * backdropQuality.resolutionScale),
    )
    sourceRenderTarget.setSize(width, height)
    horizontalBlurTarget.setSize(width, height)
    verticalBlurTarget.setSize(width, height)
    blurPass.material.uniforms.uTexelSize.value.set(1 / width, 1 / height)
    blurPass.material.uniforms.uBlurRadius.value = backdropQuality.blurRadius
    refreshState.current.wasActive = false
  }, [
    backdropQuality.blurRadius,
    blurPass,
    backdropQuality.resolutionScale,
    horizontalBlurTarget,
    size.height,
    size.width,
    sourceRenderTarget,
    verticalBlurTarget,
    viewport.dpr,
  ])

  useEffect(() => {
    const generation = resourceLifecycle.current.generation + 1
    resourceLifecycle.current = {
      generation,
      blurPass,
      horizontalBlurTarget,
      sourceRenderTarget,
      verticalBlurTarget,
    }

    return () => {
      // Strict Mode immediately replays this effect with the same resources.
      // Delay disposal so that replay retains the private pipeline warmed
      // behind the preloader, while a real unmount still releases everything.
      queueMicrotask(() => {
        const current = resourceLifecycle.current
        const componentStayedUnmounted = current.generation === generation
        const resourcesWereReplaced = current.blurPass !== blurPass
          || current.horizontalBlurTarget !== horizontalBlurTarget
          || current.sourceRenderTarget !== sourceRenderTarget
          || current.verticalBlurTarget !== verticalBlurTarget

        if (componentStayedUnmounted || resourcesWereReplaced) {
          sourceRenderTarget.dispose()
          horizontalBlurTarget.dispose()
          verticalBlurTarget.dispose()
          blurPass.geometry.dispose()
          blurPass.material.dispose()
        }
      })
    }
  }, [blurPass, horizontalBlurTarget, sourceRenderTarget, verticalBlurTarget])

  const renderBackdropPipeline = useCallback((activeCamera) => {
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
    gl.setRenderTarget(sourceRenderTarget)
    gl.render(backdropScene, activeCamera)

    blurPass.material.uniforms.uFieldTexture.value = sourceRenderTarget.texture
    blurPass.material.uniforms.uDirection.value.set(1, 0)
    gl.setRenderTarget(horizontalBlurTarget)
    gl.render(blurPass.scene, blurPass.camera)

    blurPass.material.uniforms.uFieldTexture.value = horizontalBlurTarget.texture
    blurPass.material.uniforms.uDirection.value.set(0, 1)
    gl.setRenderTarget(verticalBlurTarget)
    gl.render(blurPass.scene, blurPass.camera)

    gl.setRenderTarget(previousRenderTarget)
    gl.setViewport(savedViewport)
    gl.setScissor(savedScissor)
    gl.setScissorTest(previousScissorTest)
    gl.setClearColor(savedClearColor, previousClearAlpha)
    gl.autoClear = previousAutoClear
  }, [
    backdropScene,
    blurPass,
    gl,
    horizontalBlurTarget,
    savedClearColor,
    savedScissor,
    savedViewport,
    sourceRenderTarget,
    verticalBlurTarget,
  ])

  useEffect(() => {
    if (warmupCompleteRef.current) return

    // Warm the private field scene, blur shaders, textures, geometry, and
    // actual-size render targets before the preloader uncovers the canvas.
    renderBackdropPipeline(camera)
    warmupCompleteRef.current = true
    onWarmupComplete?.('prediction-backdrop')
  }, [camera, onWarmupComplete, renderBackdropPipeline])

  useFrame(({ camera: activeCamera }) => {
    if (!planeRef.current) return

    const active = Boolean(sceneStateRef?.current?.isActive)
    const refreshBackdrop = shouldRefreshBackdrop(
      refreshState.current,
      active,
      backdropQuality.refreshIntervalFrames,
    )
    if (!active) return

    if (refreshBackdrop) renderBackdropPipeline(activeCamera)

    const distance = activeCamera.position.z - BACKDROP.planeZ
    const height = 2
      * Math.tan(MathUtils.degToRad(activeCamera.fov) / 2)
      * distance
    const width = height * activeCamera.aspect
    planeRef.current.position.set(
      activeCamera.position.x,
      activeCamera.position.y,
      BACKDROP.planeZ,
    )
    planeRef.current.scale.set(width / 2, height / 2, 1)
  }, 0.75)

  return (
    <>
      {createPortal(children, backdropScene)}
      <mesh
        ref={planeRef}
        position={[0, 0, BACKDROP.planeZ]}
        renderOrder={-1000}
      >
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          depthTest={false}
          depthWrite={false}
          map={verticalBlurTarget.texture}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}
