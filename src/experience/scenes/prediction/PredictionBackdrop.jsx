import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, MathUtils, Scene } from 'three'
import { createBlurPass, createRenderTarget } from './fieldGeometry.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const BACKDROP = CONFIG.backdrop

export function PredictionBackdrop({ children }) {
  const { gl, size, viewport } = useThree()
  const [backdropScene] = useState(() => new Scene())
  const [sourceRenderTarget] = useState(() => createRenderTarget(true))
  const [horizontalBlurTarget] = useState(() => createRenderTarget(false))
  const [verticalBlurTarget] = useState(() => createRenderTarget(false))
  const blurPass = useMemo(
    () => createBlurPass(sourceRenderTarget.texture, BACKDROP.blurRadius),
    [sourceRenderTarget],
  )
  const planeRef = useRef()
  const savedClearColor = useMemo(() => new Color(), [])

  useEffect(() => {
    const width = Math.max(
      1,
      Math.round(size.width * viewport.dpr * BACKDROP.resolutionScale),
    )
    const height = Math.max(
      1,
      Math.round(size.height * viewport.dpr * BACKDROP.resolutionScale),
    )
    sourceRenderTarget.setSize(width, height)
    horizontalBlurTarget.setSize(width, height)
    verticalBlurTarget.setSize(width, height)
    blurPass.material.uniforms.uTexelSize.value.set(1 / width, 1 / height)
  }, [
    blurPass,
    horizontalBlurTarget,
    size.height,
    size.width,
    sourceRenderTarget,
    verticalBlurTarget,
    viewport.dpr,
  ])

  useEffect(() => () => {
    sourceRenderTarget.dispose()
    horizontalBlurTarget.dispose()
    verticalBlurTarget.dispose()
    blurPass.geometry.dispose()
    blurPass.material.dispose()
  }, [blurPass, horizontalBlurTarget, sourceRenderTarget, verticalBlurTarget])

  useFrame(({ camera }) => {
    if (!planeRef.current) return

    const previousRenderTarget = gl.getRenderTarget()
    const previousAutoClear = gl.autoClear
    const previousClearAlpha = gl.getClearAlpha()
    gl.getClearColor(savedClearColor)

    gl.autoClear = true
    gl.setClearColor(0x000000, 0)
    gl.setRenderTarget(sourceRenderTarget)
    gl.render(backdropScene, camera)

    let blurInput = sourceRenderTarget.texture
    for (let iteration = 0; iteration < BACKDROP.blurIterations; iteration += 1) {
      blurPass.material.uniforms.uFieldTexture.value = blurInput
      blurPass.material.uniforms.uDirection.value.set(1, 0)
      gl.setRenderTarget(horizontalBlurTarget)
      gl.render(blurPass.scene, blurPass.camera)

      blurPass.material.uniforms.uFieldTexture.value = horizontalBlurTarget.texture
      blurPass.material.uniforms.uDirection.value.set(0, 1)
      gl.setRenderTarget(verticalBlurTarget)
      gl.render(blurPass.scene, blurPass.camera)
      blurInput = verticalBlurTarget.texture
    }

    gl.setRenderTarget(previousRenderTarget)
    gl.setClearColor(savedClearColor, previousClearAlpha)
    gl.autoClear = previousAutoClear

    const distance = camera.position.z - BACKDROP.planeZ
    const height = 2
      * Math.tan(MathUtils.degToRad(camera.fov) / 2)
      * distance
    const width = height * camera.aspect
    planeRef.current.position.set(
      camera.position.x,
      camera.position.y,
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
