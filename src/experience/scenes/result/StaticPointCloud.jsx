import { AdditiveBlending } from 'three'
import resultNetworkFragmentShader from './resultNetworkFragment.glsl?raw'
import resultNetworkVertexShader from './resultNetworkVertex.glsl?raw'

export function StaticPointCloud({ data, materialRef, uniforms }) {
  return (
    <points frustumCulled={false} renderOrder={2}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aPulsePhase" args={[data.phases, 1]} />
        <bufferAttribute attach="attributes-aDepthFactor" args={[data.depthFactors, 1]} />
        <bufferAttribute attach="attributes-aSizeFactor" args={[data.sizeFactors, 1]} />
        <bufferAttribute attach="attributes-aDriftPhase" args={[data.driftPhases, 1]} />
        <bufferAttribute attach="attributes-aDriftSpeed" args={[data.driftSpeeds, 1]} />
        <bufferAttribute attach="attributes-aDriftAmplitude" args={[data.driftAmplitudes, 3]} />
        <bufferAttribute attach="attributes-aShade" args={[data.shadeFactors, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        blending={AdditiveBlending}
        depthWrite={false}
        fragmentShader={resultNetworkFragmentShader}
        toneMapped={false}
        transparent
        uniforms={uniforms}
        vertexShader={resultNetworkVertexShader}
      />
    </points>
  )
}
