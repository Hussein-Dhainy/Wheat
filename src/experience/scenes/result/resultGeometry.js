import { Color, DoubleSide, MathUtils, Vector2, Vector3 } from 'three'
import { RESULT_SCENE_CONFIG as CONFIG } from './resultConfig.js'
import { getResultOrbitMarkerAngle } from './resultInspection.js'

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

export function smootherRange(value, range) {
  const progress = MathUtils.smoothstep(value, range[0], range[1])
  return progress * progress * (3 - 2 * progress)
}

export function prepareGeometry(node, name) {
  if (!node?.isMesh || !node.geometry) {
    throw new Error(`Result scene is missing required mesh: ${name}`)
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

export function prepareMaterial(node) {
  const source = node?.material
  if (!source?.isMeshStandardMaterial) {
    throw new Error('Result grain requires a MeshStandardMaterial')
  }

  const material = source.clone()
  material.color.multiply(new Color(CONFIG.material.colorTint))
  material.emissive.set(CONFIG.material.emissive)
  material.emissiveIntensity = CONFIG.material.emissiveIntensity
  material.metalness = 0
  material.roughness = CONFIG.material.roughness
  material.normalScale = new Vector2(
    CONFIG.material.normalScale,
    CONFIG.material.normalScale,
  )
  material.side = DoubleSide
  material.transparent = true
  return material
}

export function createDustPositions() {
  const random = seededRandom(5711)
  const positions = new Float32Array(CONFIG.atmosphere.dustCount * 3)

  for (let index = 0; index < CONFIG.atmosphere.dustCount; index += 1) {
    positions[index * 3] = MathUtils.lerp(-8.5, 8.5, random())
    positions[index * 3 + 1] = MathUtils.lerp(-4.8, 4.8, random())
    positions[index * 3 + 2] = MathUtils.lerp(-2.8, -0.9, random())
  }

  return positions
}

export function createNetworkData() {
  const random = seededRandom(9102)
  const nodes = []
  const nodePhases = []
  const nodeSizeFactors = []
  const nodeDriftPhases = []
  const nodeDriftSpeeds = []
  const nodeDriftAmplitudes = []
  const nodeShadeFactors = []
  const connectorValues = []
  const connectorPhases = []
  const connectorDepthFactors = []
  const connectorSizeFactors = []
  const connectorDriftPhases = []
  const connectorDriftSpeeds = []
  const connectorDriftAmplitudes = []
  const connectorShadeFactors = []

  const getDepthFactor = (depth) => MathUtils.lerp(
    0.48,
    1,
    MathUtils.clamp(
      (depth + CONFIG.network.wrapDepth) / (CONFIG.network.wrapDepth * 2),
      0,
      1,
    ),
  )

  const addNode = (position, phase, sizeFactor, drift) => {
    nodes.push(position)
    nodePhases.push(phase)
    nodeSizeFactors.push(sizeFactor)
    nodeDriftPhases.push(drift.phase)
    nodeDriftSpeeds.push(drift.speed)
    nodeDriftAmplitudes.push(...drift.amplitude)
    nodeShadeFactors.push(MathUtils.lerp(218 / 255, 1, random()))
  }

  const addDottedConnection = (start, end, phaseOffset, drift) => {
    const distance = Math.hypot(
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2],
    )
    const sampleCount = Math.max(
      2,
      Math.ceil(distance / CONFIG.network.connectorSpacing),
    )

    for (let sampleIndex = 1; sampleIndex < sampleCount; sampleIndex += 1) {
      const progress = sampleIndex / sampleCount
      connectorValues.push(
        MathUtils.lerp(start[0], end[0], progress),
        MathUtils.lerp(start[1], end[1], progress),
        MathUtils.lerp(start[2], end[2], progress),
      )
      connectorPhases.push((phaseOffset + progress) % 1)
      connectorDepthFactors.push(getDepthFactor(
        MathUtils.lerp(start[2], end[2], progress),
      ))
      connectorSizeFactors.push(1)
      connectorDriftPhases.push(drift.phase)
      connectorDriftSpeeds.push(drift.speed)
      connectorDriftAmplitudes.push(...drift.amplitude)
      connectorShadeFactors.push(MathUtils.lerp(0.76, 0.96, random()))
    }
  }

  for (let clusterIndex = 0; clusterIndex < CONFIG.network.clusterCount; clusterIndex += 1) {
    const verticalProgress = clusterIndex
      / Math.max(1, CONFIG.network.clusterCount - 1)
    const centerX = MathUtils.lerp(
      CONFIG.network.horizontalRange[0],
      CONFIG.network.horizontalRange[1],
      random(),
    )
    const centerY = MathUtils.lerp(
      -CONFIG.network.height / 2,
      CONFIG.network.height / 2,
      verticalProgress,
    ) + MathUtils.lerp(
      -CONFIG.network.verticalJitter,
      CONFIG.network.verticalJitter,
      random(),
    )
    const centerZ = Math.sin(verticalProgress * Math.PI * 2.35 - 0.65)
      * CONFIG.network.wrapDepth
    const radius = MathUtils.lerp(
      CONFIG.network.clusterRadiusRange[0],
      CONFIG.network.clusterRadiusRange[1],
      random(),
    )
    const stretch = clusterIndex % CONFIG.network.longClusterEvery === 0
      ? CONFIG.network.longClusterStretch
      : 1
    const rotation = random() * Math.PI * 2
    const amplitude = MathUtils.lerp(
      CONFIG.network.driftAmplitudeRange[0],
      CONFIG.network.driftAmplitudeRange[1],
      random(),
    )
    const drift = {
      amplitude: [
        amplitude * MathUtils.lerp(0.75, 1.15, random()),
        amplitude * MathUtils.lerp(0.8, 1.2, random()),
        amplitude * MathUtils.lerp(0.35, 0.65, random()),
      ],
      phase: random() * Math.PI * 2,
      speed: MathUtils.lerp(
        CONFIG.network.driftSpeedRange[0],
        CONFIG.network.driftSpeedRange[1],
        random(),
      ),
    }
    const clusterNodes = []

    for (let nodeIndex = 0; nodeIndex < CONFIG.network.nodesPerCluster; nodeIndex += 1) {
      const angle = rotation
        + nodeIndex * (Math.PI * 2 / CONFIG.network.nodesPerCluster)
      const radialStretch = nodeIndex === 2 ? stretch : 1
      const node = [
        centerX + Math.cos(angle) * radius * radialStretch,
        centerY + Math.sin(angle) * radius * radialStretch,
        centerZ + Math.sin(angle + 0.8) * radius * 0.55,
      ]
      clusterNodes.push(node)
      addNode(
        node,
        (verticalProgress + nodeIndex * 0.19) % 1,
        0.34 + Math.pow(random(), 1.45) * 1.52,
        drift,
      )
    }

    addDottedConnection(clusterNodes[0], clusterNodes[1], random(), drift)
    addDottedConnection(clusterNodes[1], clusterNodes[2], random(), drift)
  }

  return {
    connectorDepthFactors: new Float32Array(connectorDepthFactors),
    connectorDriftAmplitudes: new Float32Array(connectorDriftAmplitudes),
    connectorDriftPhases: new Float32Array(connectorDriftPhases),
    connectorDriftSpeeds: new Float32Array(connectorDriftSpeeds),
    connectorPhases: new Float32Array(connectorPhases),
    connectorPositions: new Float32Array(connectorValues),
    connectorShadeFactors: new Float32Array(connectorShadeFactors),
    connectorSizeFactors: new Float32Array(connectorSizeFactors),
    nodeDepthFactors: new Float32Array(nodes.map((node) => getDepthFactor(node[2]))),
    nodeDriftAmplitudes: new Float32Array(nodeDriftAmplitudes),
    nodeDriftPhases: new Float32Array(nodeDriftPhases),
    nodeDriftSpeeds: new Float32Array(nodeDriftSpeeds),
    nodePhases: new Float32Array(nodePhases),
    nodeShadeFactors: new Float32Array(nodeShadeFactors),
    nodeSizeFactors: new Float32Array(nodeSizeFactors),
    pointPositions: new Float32Array(nodes.flat()),
  }
}

export function createNetworkUniforms(color, opacity, pointSize, halo) {
  return {
    uColor: { value: new Color(color) },
    uDriftStrength: { value: 1 },
    uHalo: { value: halo },
    uOpacity: { value: opacity },
    uPixelRatio: { value: 1 },
    uPointSize: { value: pointSize },
    uPulseSpeed: { value: CONFIG.network.pulseSpeed },
    uPulseStrength: { value: CONFIG.network.pulseStrength },
    uTime: { value: 0 },
  }
}

export function createStaticPointData(positions) {
  const pointCount = positions.length / 3

  return {
    positions: new Float32Array(positions),
    phases: new Float32Array(pointCount),
    depthFactors: new Float32Array(pointCount).fill(1),
    sizeFactors: new Float32Array(pointCount).fill(1),
    driftPhases: new Float32Array(pointCount),
    driftSpeeds: new Float32Array(pointCount),
    driftAmplitudes: new Float32Array(pointCount * 3),
    shadeFactors: new Float32Array(pointCount).fill(1),
  }
}

export function createInspectionOrbitData() {
  const orbit = CONFIG.inspection.orbit
  const ringPositions = []
  const markerPositions = []

  for (let index = 0; index < orbit.dotCount; index += 1) {
    const angle = index / orbit.dotCount * Math.PI * 2
    ringPositions.push(
      Math.cos(angle) * orbit.radius,
      Math.sin(angle) * orbit.verticalRadius,
      Math.sin(angle) * orbit.radius,
    )
  }

  for (let index = 0; index < 3; index += 1) {
    const angle = getResultOrbitMarkerAngle(index, CONFIG.inspection.viewStep)
    markerPositions.push(
      Math.cos(angle) * orbit.radius,
      Math.sin(angle) * orbit.verticalRadius,
      Math.sin(angle) * orbit.radius,
    )
  }

  return {
    markers: createStaticPointData(markerPositions),
    ring: createStaticPointData(ringPositions),
  }
}
