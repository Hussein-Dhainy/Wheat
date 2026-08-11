import { useMemo } from 'react'
import {
  diagonalTransitionFragmentShader,
  diagonalTransitionVertexShader,
} from '../shaders/diagonalTransition.js'

export function DiagonalTransition({ materialRef, sceneATexture, sceneBTexture }) {
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uSceneA: { value: sceneATexture },
      uSceneB: { value: sceneBTexture },
      uSlope: { value: 0.34 },
      uOverscan: { value: 0.002 },
    }),
    [sceneATexture, sceneBTexture],
  )

  return (
    <mesh frustumCulled={false} renderOrder={1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        depthTest={false}
        depthWrite={false}
        fragmentShader={diagonalTransitionFragmentShader}
        toneMapped
        transparent
        uniforms={uniforms}
        vertexShader={diagonalTransitionVertexShader}
      />
    </mesh>
  )
}
