import {
  AdditiveBlending,
  Color,
  Mesh,
  ShaderMaterial,
} from 'three'

const SOIL_VERTEX_SHADER = /* glsl */ `
varying float vSoilWorldY;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vSoilWorldY = worldPosition.y;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const SOIL_FRAGMENT_SHADER = /* glsl */ `
uniform float uSoilActiveFraction;
uniform vec3 uSoilColor;
uniform float uSoilGlowSize;
uniform float uSoilHaloIntensity;
uniform float uSoilIntensity;
uniform float uSoilParticleSize;
uniform float uSoilParticleSpacing;
uniform float uSoilPixelsPerWorldUnit;
uniform float uSoilPixelRatio;
uniform float uSoilSpeed;
uniform float uSoilStrength;
uniform float uSoilTime;

varying float vSoilWorldY;

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

float soilScreenCorrectedDistance(vec2 coordinate, vec2 coordinateOffset) {
  vec2 derivativeX = dFdx(coordinate);
  vec2 derivativeY = dFdy(coordinate);
  float determinant = derivativeX.x * derivativeY.y
    - derivativeY.x * derivativeX.y;

  if (abs(determinant) < 0.000001) {
    return length(coordinateOffset);
  }

  vec2 pixelOffset = vec2(
    derivativeY.y * coordinateOffset.x
      - derivativeY.x * coordinateOffset.y,
    -derivativeX.y * coordinateOffset.x
      + derivativeX.x * coordinateOffset.y
  ) / determinant;

  return length(pixelOffset) * sqrt(abs(determinant));
}

float soilSurfaceParticle(vec2 coordinate) {
  vec2 cell = floor(coordinate);
  vec2 localPosition = fract(coordinate);
  float isActive = step(
    1.0 - uSoilActiveFraction,
    soilHash(cell + vec2(17.0, 53.0))
  );
  vec2 center = vec2(0.18) + soilHash2(cell) * 0.64;
  float distanceFromCenter = soilScreenCorrectedDistance(
    coordinate,
    localPosition - center
  );
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
  // Screen X keeps each path visually vertical. World Y keeps the particles
  // attached to the plant while the camera scrolls, instead of pinning the
  // pattern to the viewport. The derivative metric above preserves roundness.
  float pixelCellSize = max(
    1.0,
    uSoilParticleSpacing * uSoilPixelRatio
  );
  vec2 flowCoordinate = vec2(
    gl_FragCoord.x,
    vSoilWorldY * uSoilPixelsPerWorldUnit
  ) / pixelCellSize;
  flowCoordinate.y -= uSoilTime
    * uSoilSpeed
    / max(1.0, uSoilParticleSpacing);
  float particle = soilSurfaceParticle(flowCoordinate);
  float opacity = clamp(particle * uSoilStrength, 0.0, 1.0);

  if (opacity < 0.002) discard;

  gl_FragColor = vec4(uSoilColor * uSoilIntensity, opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function createSoilSurfaceOverlay(sourceMesh, config) {
  const uniforms = {
    uSoilActiveFraction: { value: config.activeFraction },
    uSoilColor: { value: new Color(config.particleColor) },
    uSoilGlowSize: { value: config.glowSize },
    uSoilHaloIntensity: { value: config.haloIntensity },
    uSoilIntensity: { value: config.intensity },
    uSoilParticleSize: { value: config.particleSize },
    uSoilParticleSpacing: { value: config.particleSpacing },
    uSoilPixelsPerWorldUnit: { value: 1 },
    uSoilPixelRatio: { value: 1 },
    uSoilSpeed: { value: config.speed },
    uSoilStrength: { value: 0 },
    uSoilTime: { value: 0 },
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
