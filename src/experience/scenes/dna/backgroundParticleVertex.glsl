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
    sin(source.y * 0.58 + source.z * 0.32 + phase)
      + cos(source.z * 0.9 - phase * 0.62) * 0.45,
    cos(source.x * 0.48 - source.z * 0.4 + phase * 0.71) * 0.42,
    sin(source.x * 0.52 + source.y * 0.34 - phase * 0.76) * 0.72
  );
}

void main() {
  vec3 transformedPosition = position;
  float driftTime = uTime * aDriftSpeed;

  // Particles nearer the camera (smaller -z) drift upward faster than ones
  // further back, and each particle's own drift speed adds a bit more
  // variance — a cheap parallax that reads as flowing through a fluid
  // rather than a rigid block scrolling past.
  float depthFactor = clamp((-position.z - 1.2) / 5.2, 0.0, 1.0);
  float parallaxSpeed = mix(1.4, 0.55, depthFactor)
    * (0.8 + aDriftSpeed * 1.5);
  float scrollTravel = uScrollProgress * uScrollTravel * parallaxSpeed;
  float halfWrapRange = uScrollWrapRange * 0.5;
  transformedPosition.y = mod(
    transformedPosition.y + scrollTravel + halfWrapRange,
    uScrollWrapRange
  ) - halfWrapRange;

  // Rotate each particle around its own vertical axis in the XZ plane.
  float orbitAngle = uTime * aOrbitSpeed;
  float orbitCosine = cos(orbitAngle);
  float orbitSine = sin(orbitAngle);
  vec2 orbitPosition = position.xz - aOrbitCenter;
  orbitPosition = mat2(
    orbitCosine, -orbitSine,
    orbitSine, orbitCosine
  ) * orbitPosition;
  transformedPosition.xz = aOrbitCenter + orbitPosition;

  // Scroll samples a stable curl-like field rather than incrementing a
  // simulation. The motion therefore retraces exactly when scrolling back.
  float scrollFlowPhase = uScrollProgress
    * uScrollFlowCycles
    * 6.28318530718
    + aPhase * 0.16;
  float scrollFlowEnvelope = smoothstep(0.0, 0.08, uScrollProgress);
  vec3 scrollFlow = sampleFluidFlow(position, scrollFlowPhase);
  transformedPosition += scrollFlow
    * uScrollFlowStrength
    * scrollFlowEnvelope;

  // A larger bounded X/Z current makes scroll travel readable in all three
  // dimensions. Subtracting the phase's starting sample keeps progress zero
  // identical to the authored particle layout.
  float axisFlowPhase = uScrollProgress * 4.71238898038;
  float horizontalFlow = sin(axisFlowPhase + aPhase)
    - sin(aPhase);
  float depthFlow = cos(axisFlowPhase * 0.83 + aPhase * 0.73)
    - cos(aPhase * 0.73);
  transformedPosition.x += horizontalFlow * uScrollAxisTravel.x;
  transformedPosition.z += depthFlow * uScrollAxisTravel.y;

  // Layer two very slow motions so the field feels suspended instead of
  // orbiting around a visible center.
  transformedPosition.x += sin(driftTime + aPhase) * 0.09;
  transformedPosition.y += cos(driftTime * 0.73 + aPhase * 1.31) * 0.07;
  transformedPosition.z += sin(driftTime * 0.51 + aPhase * 0.67) * 0.05;

  vec4 viewPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(
    aSize * uPixelRatio * (7.0 / max(1.0, -viewPosition.z)),
    1.0,
    52.0
  );

  vColorMix = aColorMix;
  vOpacity = aOpacity;
}
