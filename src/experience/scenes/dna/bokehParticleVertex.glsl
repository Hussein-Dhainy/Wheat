attribute float aColorMix;
attribute float aDriftSpeed;
attribute float aOpacity;
attribute vec2 aOrbitCenter;
attribute float aOrbitSpeed;
attribute float aPhase;
attribute float aSize;

uniform float uPixelRatio;
uniform float uTime;
uniform float uScrollProgress;
uniform vec2 uScrollAxisTravel;
uniform float uScrollFlowCycles;
uniform float uScrollFlowStrength;
uniform float uScrollTravel;
uniform float uScrollWrapRange;

varying float vColorMix;
varying float vOpacity;

vec3 sampleFluidFlow(vec3 source, float phase) {
  return vec3(
    sin(source.y * 0.5 + source.z * 0.28 + phase)
      + cos(source.z * 0.72 - phase * 0.6) * 0.42,
    cos(source.x * 0.4 - source.z * 0.34 + phase * 0.68) * 0.38,
    sin(source.x * 0.43 + source.y * 0.3 - phase * 0.73) * 0.68
  );
}

void main() {
  vec3 transformedPosition = position;
  float driftTime = uTime * aDriftSpeed;

  // These sit furthest back and largest, so they carry the strongest
  // parallax of the three particle layers.
  float depthFactor = clamp((-position.z - 2.4) / 4.2, 0.0, 1.0);
  float parallaxSpeed = mix(1.5, 0.6, depthFactor)
    * (0.8 + aDriftSpeed * 8.0);
  float scrollTravel = uScrollProgress * uScrollTravel * parallaxSpeed;
  float halfWrapRange = uScrollWrapRange * 0.5;
  transformedPosition.y = mod(
    transformedPosition.y + scrollTravel + halfWrapRange,
    uScrollWrapRange
  ) - halfWrapRange;

  float orbitAngle = uTime * aOrbitSpeed;
  float orbitCosine = cos(orbitAngle);
  float orbitSine = sin(orbitAngle);
  vec2 orbitPosition = position.xz - aOrbitCenter;
  orbitPosition = mat2(
    orbitCosine, -orbitSine,
    orbitSine, orbitCosine
  ) * orbitPosition;
  transformedPosition.xz = aOrbitCenter + orbitPosition;

  float scrollFlowPhase = uScrollProgress
    * uScrollFlowCycles
    * 6.28318530718
    + aPhase * 0.13;
  float scrollFlowEnvelope = smoothstep(0.0, 0.08, uScrollProgress);
  vec3 scrollFlow = sampleFluidFlow(position, scrollFlowPhase);
  transformedPosition += scrollFlow
    * uScrollFlowStrength
    * scrollFlowEnvelope;

  float axisFlowPhase = uScrollProgress * 4.71238898038;
  float horizontalFlow = sin(axisFlowPhase + aPhase)
    - sin(aPhase);
  float depthFlow = cos(axisFlowPhase * 0.83 + aPhase * 0.73)
    - cos(aPhase * 0.73);
  transformedPosition.x += horizontalFlow * uScrollAxisTravel.x;
  transformedPosition.z += depthFlow * uScrollAxisTravel.y;

  transformedPosition.x += sin(driftTime + aPhase) * 0.16;
  transformedPosition.y += cos(driftTime * 0.74 + aPhase * 1.23) * 0.12;
  transformedPosition.z += sin(driftTime * 0.43 + aPhase) * 0.08;

  vec4 viewPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(
    aSize * uPixelRatio * (7.0 / max(1.0, -viewPosition.z)),
    4.0,
    170.0
  );

  vColorMix = aColorMix;
  vOpacity = aOpacity;
}
