import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
} from 'three'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import { DNA_RENDER_CONFIG } from './dnaConfig.js'
import helixNodeFragmentShader from './helixNodeFragment.glsl?raw'
import helixNodeHaloFragmentShader from './helixNodeHaloFragment.glsl?raw'
import helixNodeHaloVertexShader from './helixNodeHaloVertex.glsl?raw'
import helixNodeLinkFragmentShader from './helixNodeLinkFragment.glsl?raw'
import helixNodeLinkVertexShader from './helixNodeLinkVertex.glsl?raw'
import helixNodeVertexShader from './helixNodeVertex.glsl?raw'

const IDLE_ROTATION_SPEED = -0.085
const SCROLL_ROTATION = Math.PI * 1.65
// The node chain is finite. This travel is long enough for its authored tail
// to clear the viewport during the Scene 2 -> 3 transition without recycling.
const SCROLL_TRAVEL = 16
const LINK_SPACING = 0.14
const NODE_CHAIN_HEAD_Y = -3.35
const NODE_CHAIN_LENGTH_SCALE = 0.75

// Each inner array is one linked cluster. Keeping these groups explicit makes
// the four-node limit structural rather than an accidental visual outcome.
const NODE_GROUPS = [
  [
    { angle: 0.2, radius: 1.15, size: 60, y: -3.35, yellow: false },
    { angle: 1.0, radius: 1.45, size: 48, y: -4.05, yellow: false },
    { angle: 1.75, radius: 1.25, size: 56, y: -4.9, yellow: true },
    { angle: 2.45, radius: 1.55, size: 46, y: -5.75, yellow: false },
  ],
  [
    { angle: 3.0, radius: 1.2, size: 54, y: -6.9, yellow: false },
    { angle: 3.8, radius: 1.55, size: 62, y: -7.75, yellow: false },
    { angle: 4.55, radius: 1.3, size: 50, y: -8.65, yellow: false },
  ],
  [
    { angle: 5.25, radius: 1.5, size: 58, y: -9.8, yellow: true },
    { angle: 6.05, radius: 1.18, size: 48, y: -10.65, yellow: false },
    { angle: 6.8, radius: 1.52, size: 64, y: -11.55, yellow: false },
    { angle: 7.55, radius: 1.3, size: 52, y: -12.45, yellow: false },
  ],
  [
    { angle: 8.25, radius: 1.55, size: 56, y: -13.65, yellow: false },
    { angle: 9.05, radius: 1.2, size: 60, y: -14.55, yellow: true },
    { angle: 9.8, radius: 1.48, size: 48, y: -15.45, yellow: false },
  ],
]

function getNodePosition(node) {
  return [
    Math.cos(node.angle) * node.radius,
    NODE_CHAIN_HEAD_Y
      + (node.y - NODE_CHAIN_HEAD_Y) * NODE_CHAIN_LENGTH_SCALE,
    Math.sin(node.angle) * node.radius,
  ]
}

function createNodeGeometry() {
  const nodes = NODE_GROUPS.flat()
  const positions = new Float32Array(nodes.length * 3)
  const sizes = new Float32Array(nodes.length)
  const colorMixes = new Float32Array(nodes.length)
  const phases = new Float32Array(nodes.length)

  nodes.forEach((node, index) => {
    const position = getNodePosition(node)
    positions.set(position, index * 3)
    sizes[index] = node.size
    colorMixes[index] = node.yellow ? 1 : 0
    phases[index] = node.angle * 1.7 + index * 0.31
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aColorMix', new BufferAttribute(colorMixes, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
  return geometry
}

function createLinkGeometry() {
  const positions = []
  const progresses = []

  NODE_GROUPS.forEach((group) => {
    for (let nodeIndex = 0; nodeIndex < group.length - 1; nodeIndex += 1) {
      const start = getNodePosition(group[nodeIndex])
      const end = getNodePosition(group[nodeIndex + 1])
      const distance = Math.hypot(
        end[0] - start[0],
        end[1] - start[1],
        end[2] - start[2],
      )
      const segmentCount = Math.max(3, Math.floor(distance / LINK_SPACING))

      for (let segmentIndex = 1; segmentIndex < segmentCount; segmentIndex += 1) {
        const progress = segmentIndex / segmentCount
        const eased = progress * progress * (3 - 2 * progress)
        positions.push(
          start[0] + (end[0] - start[0]) * eased,
          start[1] + (end[1] - start[1]) * progress,
          start[2] + (end[2] - start[2]) * eased,
        )
        progresses.push(progress)
      }
    }
  })

  return {
    positions: new Float32Array(positions),
    progresses: new Float32Array(progresses),
  }
}

export default function DNAHelixNodes({
  sceneOpacityRef,
  reducedMotion,
  sceneStateRef,
}) {
  const activeTime = useRef(0)
  const groupReference = useRef()
  const nodeMaterialReference = useRef()
  const nodeHaloMaterialReference = useRef()
  const linkMaterialReference = useRef()
  const nodeGeometry = useMemo(createNodeGeometry, [])
  const linkGeometry = useMemo(createLinkGeometry, [])
  const nodeUniforms = useMemo(() => ({
    uCyan: { value: new Color(DNA_RENDER_CONFIG.colors.helixNodeCyan) },
    uPixelRatio: { value: 1 },
    uSceneOpacity: { value: 1 },
    uTime: { value: 0 },
    uYellow: { value: new Color(DNA_RENDER_CONFIG.colors.helixNodeYellow) },
  }), [])
  const nodeHaloUniforms = useMemo(() => ({
    uCyan: { value: new Color(DNA_RENDER_CONFIG.colors.helixNodeCyan) },
    uFalloffPower: { value: DNA_RENDER_CONFIG.halos.nodes.falloffPower },
    uHaloOpacity: { value: DNA_RENDER_CONFIG.halos.nodes.opacity },
    uMaximumSize: { value: DNA_RENDER_CONFIG.halos.nodes.maximumSize },
    uPixelRatio: { value: 1 },
    uPulseAmount: { value: DNA_RENDER_CONFIG.halos.nodes.pulseAmount },
    uSceneOpacity: { value: 1 },
    uSizeScale: { value: DNA_RENDER_CONFIG.halos.nodes.sizeScale },
    uTime: { value: 0 },
    uYellow: { value: new Color(DNA_RENDER_CONFIG.colors.helixNodeYellow) },
  }), [])
  const linkUniforms = useMemo(() => ({
    uColor: { value: new Color('#70cdb1') },
    uPixelRatio: { value: 1 },
    uSceneOpacity: { value: 1 },
  }), [])

  useEffect(() => {
    return () => nodeGeometry.dispose()
  }, [nodeGeometry])

  useFrame(({ gl }, deltaTime) => {
    if (
      !groupReference.current
      || !nodeMaterialReference.current
      || !nodeHaloMaterialReference.current
      || !linkMaterialReference.current
      || !sceneStateRef?.current?.isActive
    ) return

    const progress = reducedMotion
      ? Math.min(1, Math.max(0, sceneStateRef.current.progress ?? 0))
      : sceneStateRef.current.motionProgress
        ?? sceneStateRef.current.progress
        ?? 0
    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      deltaTime,
      !reducedMotion,
    )
    const time = reducedMotion ? 0 : activeTime.current

    groupReference.current.position.y = progress * SCROLL_TRAVEL
    groupReference.current.rotation.y = time * IDLE_ROTATION_SPEED
      + progress * SCROLL_ROTATION
    const pixelRatio = gl.getPixelRatio()
    // DNAHelix owns this value so the nodes fade on exactly the same curve as
    // the ribbon and particles when the genetics detail opens.
    const sceneOpacity = sceneOpacityRef?.current ?? 1
    nodeMaterialReference.current.uniforms.uPixelRatio.value = pixelRatio
    nodeMaterialReference.current.uniforms.uSceneOpacity.value = sceneOpacity
    nodeMaterialReference.current.uniforms.uTime.value = time
    nodeHaloMaterialReference.current.uniforms.uPixelRatio.value = pixelRatio
    nodeHaloMaterialReference.current.uniforms.uSceneOpacity.value = sceneOpacity
    nodeHaloMaterialReference.current.uniforms.uTime.value = time
    linkMaterialReference.current.uniforms.uPixelRatio.value = pixelRatio
    linkMaterialReference.current.uniforms.uSceneOpacity.value = sceneOpacity
  })

  return (
    <group ref={groupReference}>
      <points
        dispose={null}
        geometry={nodeGeometry}
        frustumCulled={false}
        renderOrder={-1}
      >
        <shaderMaterial
          ref={nodeHaloMaterialReference}
          uniforms={nodeHaloUniforms}
          vertexShader={helixNodeHaloVertexShader}
          fragmentShader={helixNodeHaloFragmentShader}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
        />
      </points>

      <points
        dispose={null}
        geometry={nodeGeometry}
        frustumCulled={false}
        renderOrder={0}
      >
        <shaderMaterial
          ref={nodeMaterialReference}
          uniforms={nodeUniforms}
          vertexShader={helixNodeVertexShader}
          fragmentShader={helixNodeFragmentShader}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
        />
      </points>

      <points frustumCulled={false} renderOrder={-2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linkGeometry.positions, 3]} />
          <bufferAttribute attach="attributes-aProgress" args={[linkGeometry.progresses, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={linkMaterialReference}
          uniforms={linkUniforms}
          vertexShader={helixNodeLinkVertexShader}
          fragmentShader={helixNodeLinkFragmentShader}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
        />
      </points>
    </group>
  )
}
