import { useMemo } from 'react'
import { Color } from 'three'
import hazeFragmentShader from './hazeFragment.glsl?raw'
import hazeVertexShader from './hazeVertex.glsl?raw'

export default function DNAHaze() {
  const uniforms = useMemo(() => ({
    uGreen: { value: new Color('#075037') },
    uOrange: { value: new Color('#a34513') },
  }), [])

  return (
    <mesh frustumCulled={false} renderOrder={-3}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        depthTest={false}
        depthWrite={false}
        fragmentShader={hazeFragmentShader}
        transparent
        uniforms={uniforms}
        vertexShader={hazeVertexShader}
      />
    </mesh>
  )
}
