import {
  AdditiveBlending,
  Color,
  Mesh,
  ShaderMaterial,
  Vector2,
} from 'three'

const SOIL_VERTEX_SHADER = /* glsl */ `
varying vec3 vSoilLocalPosition;
varying vec2 vSoilUv;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vSoilLocalPosition = position;
  vSoilUv = uv;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const SOIL_FRAGMENT_SHADER = /* glsl */ `
uniform float uSoilActiveFraction;
uniform vec3 uSoilColor;
uniform float uSoilDensity;
uniform float uSoilGlowSize;
uniform float uSoilHaloIntensity;
uniform float uSoilIntensity;
uniform float uSoilMappingMode;
uniform float uSoilModelScale;
uniform float uSoilParticleSize;
uniform float uSoilRadialScale;
uniform float uSoilSpeed;
uniform float uSoilStrength;
uniform float uSoilTime;
uniform vec2 uSoilUvToWorldScale;

varying vec3 vSoilLocalPosition;
varying vec2 vSoilUv;

float soilHash(vec2 coordinate) {
  return fract(sin(dot(coordinate, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 soilHash2(vec2 coordinate) {
  return fract(
    sin(vec2(
      dot(coordinate, vec2(269.5, 183.3)),
      dot(coordinate, vec2(419.2, 371.9))
    )) * 43758.5453123
  );
}

float soilSurfaceParticle(vec2 coordinate) {
  vec2 cell = floor(coordinate);
  vec2 localPosition = fract(coordinate);
  float isActive = step(
    1.0 - uSoilActiveFraction,
    soilHash(cell + vec2(17.0, 53.0))
  );
  vec2 center = vec2(0.18) + soilHash2(cell) * 0.64;
  float distanceFromCenter = distance(localPosition, center);
  float core = 1.0 - smoothstep(
    uSoilParticleSize * 0.38,
    uSoilParticleSize,
    distanceFromCenter
  );
  float halo = 1.0 - smoothstep(
    uSoilParticleSize,
    uSoilGlowSize,
    distanceFromCenter
  );

  return isActive * (core + halo * uSoilHaloIntensity);
}

void main() {
  // Leaves and stems use their authored UV direction: V runs from each
  // attachment point toward its tip. The per-mesh metric converts both UV
  // axes back to approximate world units so the dots remain round.
  vec2 surfaceCoordinate = vSoilUv * uSoilUvToWorldScale;

  // The wheat head contains several UV islands, so use a cylindrical local
  // mapping there: local Y still travels toward the top of the plant.
  if (uSoilMappingMode > 0.5) {
    surfaceCoordinate = vec2(
      atan(vSoilLocalPosition.z, vSoilLocalPosition.x) * uSoilRadialScale,
      vSoilLocalPosition.y * uSoilModelScale
    );
  }

  surfaceCoordinate.y -= uSoilTime * uSoilSpeed;
  vec2 flowCoordinate = surfaceCoordinate * uSoilDensity;
  float particle = soilSurfaceParticle(flowCoordinate);
  float opacity = clamp(particle * uSoilStrength, 0.0, 1.0);

  if (opacity < 0.002) discard;

  gl_FragColor = vec4(uSoilColor * uSoilIntensity, opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function estimateUvToWorldScale(geometry, modelScale = 1) {
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  if (!position || !uv) return new Vector2(modelScale, modelScale)

  const index = geometry.getIndex()
  const triangleCount = index
    ? Math.floor(index.count / 3)
    : Math.floor(position.count / 3)
  let weightedUScale = 0
  let weightedVScale = 0
  let totalWeight = 0

  const readIndex = (offset) => index ? index.getX(offset) : offset
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const a = readIndex(triangle * 3)
    const b = readIndex(triangle * 3 + 1)
    const c = readIndex(triangle * 3 + 2)

    const edge1X = position.getX(b) - position.getX(a)
    const edge1Y = position.getY(b) - position.getY(a)
    const edge1Z = position.getZ(b) - position.getZ(a)
    const edge2X = position.getX(c) - position.getX(a)
    const edge2Y = position.getY(c) - position.getY(a)
    const edge2Z = position.getZ(c) - position.getZ(a)
    const deltaU1 = uv.getX(b) - uv.getX(a)
    const deltaV1 = uv.getY(b) - uv.getY(a)
    const deltaU2 = uv.getX(c) - uv.getX(a)
    const deltaV2 = uv.getY(c) - uv.getY(a)
    const determinant = deltaU1 * deltaV2 - deltaV1 * deltaU2
    const weight = Math.abs(determinant)
    if (weight < 1e-10) continue

    const inverseDeterminant = 1 / determinant
    const derivativeUX = (edge1X * deltaV2 - edge2X * deltaV1) * inverseDeterminant
    const derivativeUY = (edge1Y * deltaV2 - edge2Y * deltaV1) * inverseDeterminant
    const derivativeUZ = (edge1Z * deltaV2 - edge2Z * deltaV1) * inverseDeterminant
    const derivativeVX = (edge2X * deltaU1 - edge1X * deltaU2) * inverseDeterminant
    const derivativeVY = (edge2Y * deltaU1 - edge1Y * deltaU2) * inverseDeterminant
    const derivativeVZ = (edge2Z * deltaU1 - edge1Z * deltaU2) * inverseDeterminant

    weightedUScale += Math.hypot(
      derivativeUX,
      derivativeUY,
      derivativeUZ,
    ) * weight
    weightedVScale += Math.hypot(
      derivativeVX,
      derivativeVY,
      derivativeVZ,
    ) * weight
    totalWeight += weight
  }

  if (totalWeight < 1e-10) {
    return new Vector2(modelScale, modelScale)
  }

  return new Vector2(
    (weightedUScale / totalWeight) * modelScale,
    (weightedVScale / totalWeight) * modelScale,
  )
}

export function createSoilSurfaceOverlay(sourceMesh, config, modelScale = 1) {
  sourceMesh.geometry.computeBoundingBox()
  const bounds = sourceMesh.geometry.boundingBox
  const radialScale = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.z - bounds.min.z,
  ) * 0.5 * modelScale
  const uniforms = {
    uSoilActiveFraction: { value: config.activeFraction },
    uSoilColor: { value: new Color(config.particleColor) },
    uSoilDensity: { value: config.particleDensity },
    uSoilGlowSize: { value: config.glowSize },
    uSoilHaloIntensity: { value: config.haloIntensity },
    uSoilIntensity: { value: config.intensity },
    uSoilMappingMode: { value: /head/i.test(sourceMesh.name) ? 1 : 0 },
    uSoilModelScale: { value: modelScale },
    uSoilParticleSize: { value: config.particleSize },
    uSoilRadialScale: { value: Math.max(0.001, radialScale) },
    uSoilSpeed: { value: config.speed },
    uSoilStrength: { value: 0 },
    uSoilTime: { value: 0 },
    uSoilUvToWorldScale: {
      value: estimateUvToWorldScale(sourceMesh.geometry, modelScale),
    },
  }
  const sourceMaterial = Array.isArray(sourceMesh.material)
    ? sourceMesh.material[0]
    : sourceMesh.material
  const material = new ShaderMaterial({
    blending: AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    fragmentShader: SOIL_FRAGMENT_SHADER,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: sourceMaterial?.side,
    toneMapped: true,
    transparent: true,
    uniforms,
    vertexShader: SOIL_VERTEX_SHADER,
  })
  const mesh = new Mesh(sourceMesh.geometry, material)
  mesh.frustumCulled = sourceMesh.frustumCulled
  mesh.matrixAutoUpdate = false
  mesh.name = `${sourceMesh.name}-soil-surface-overlay`
  mesh.renderOrder = sourceMesh.renderOrder + 1
  mesh.visible = false

  return { material, mesh, uniforms }
}
