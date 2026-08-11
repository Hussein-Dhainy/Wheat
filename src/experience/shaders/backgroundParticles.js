export const backgroundParticleVertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  attribute float aShape;
  attribute float aOrbitSpeed;
  attribute vec3 aOrbitCenter;

  uniform float uTime;
  uniform float uOpacity;

  varying float vShape;
  varying float vOpacity;
  varying float vColorMix;
  varying float vRotation;

  void main() {
    vec3 transformed = position;
    float orbitAngle = uTime * aOrbitSpeed;
    float orbitCosine = cos(orbitAngle);
    float orbitSine = sin(orbitAngle);
    vec2 orbitPosition = position.xz - aOrbitCenter.xz;
    orbitPosition = mat2(
      orbitCosine, -orbitSine,
      orbitSine, orbitCosine
    ) * orbitPosition;

    float horizontalDrift = sin(uTime * 0.31 + aPhase);
    float verticalDrift = cos(uTime * 0.27 + aPhase * 1.37);
    float depthDrift = sin(uTime * 0.19 + aPhase * 0.73);

    transformed.xz = aOrbitCenter.xz + orbitPosition;
    transformed.x += horizontalDrift * 0.07;
    transformed.y += verticalDrift * 0.035;
    transformed.z += depthDrift * 0.055;

    vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float perspectiveSize = aSize * (9.0 / max(1.5, -viewPosition.z));
    gl_PointSize = clamp(perspectiveSize, 1.5, 84.0);

    vShape = aShape;
    vColorMix = fract(aPhase * 0.37);
    vOpacity = uOpacity * (0.96 + (verticalDrift * 0.5 + 0.5) * 0.04);
    vRotation = uTime * mix(0.05, 0.11, fract(aPhase)) + aPhase;
  }
`

export const backgroundParticleFragmentShader = /* glsl */ `
  uniform vec3 uGold;
  uniform vec3 uRed;

  varying float vShape;
  varying float vOpacity;
  varying float vColorMix;
  varying float vRotation;

  const float PI = 3.14159265359;
  const float TWO_PI = 6.28318530718;

  float polygonDistance(vec2 point, float sides) {
    float angle = atan(point.x, point.y) + PI;
    float sector = TWO_PI / sides;
    return cos(floor(0.5 + angle / sector) * sector - angle) * length(point);
  }

  void main() {
    vec2 point = gl_PointCoord * 2.0 - 1.0;
    float cosine = cos(vRotation);
    float sine = sin(vRotation);
    point = mat2(cosine, -sine, sine, cosine) * point;
    float polygon = polygonDistance(point, vShape);
    float edge = 1.0 - smoothstep(0.72, 0.9, polygon);
    float innerGlow = 1.0 - smoothstep(0.05, 0.95, length(point));
    vec3 color = mix(uGold, uRed, smoothstep(0.58, 0.95, vColorMix));

    gl_FragColor = vec4(color + innerGlow * 0.12, edge * vOpacity);
  }
`
