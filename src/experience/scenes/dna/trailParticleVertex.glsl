attribute float aColorMix;
attribute float aDriftSpeed;
attribute float aOpacity;
attribute vec2 aOrbitCenter;
attribute float aOrbitSpeed;
attribute float aSize;
attribute float aTrailPhase;
attribute float aTrailProgress;

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
    sin(source.y * 0.5 + source.z * 0.3 + phase),
    cos(source.x * 0.42 - source.z * 0.35 + phase * 0.7) * 0.32,
    sin(source.x * 0.46 + source.y * 0.28 - phase * 0.74) * 0.58
  );
}

void main() {
  vec3 transformedPosition = position;
  float driftTime = uTime * aDriftSpeed;

  // aDriftSpeed is shared by every point on one trail, so the whole path
  // drifts upward and wraps together instead of tearing apart mid-loop.
  float scrollTravel = uScrollProgress * uScrollTravel * (0.5 + aDriftSpeed * 10.0);
  float halfWrapRange = uScrollWrapRange * 0.5;
  transformedPosition.y = mod(
    transformedPosition.y + scrollTravel + halfWrapRange,
    uScrollWrapRange
  ) - halfWrapRange;

  // All points in one dotted trail share an axis and speed, allowing each
  // path to orbit around Y without pulling its dots apart.
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
    + aTrailPhase * 0.12;
  float scrollFlowEnvelope = smoothstep(0.0, 0.08, uScrollProgress);
  vec3 scrollFlow = sampleFluidFlow(position, scrollFlowPhase);
  transformedPosition += scrollFlow
    * uScrollFlowStrength
    * scrollFlowEnvelope;

  // Trail phase is shared by every point in one path, so this larger X/Z
  // translation moves the whole dotted strand without pulling it apart.
  float axisFlowPhase = uScrollProgress * 4.71238898038;
  float horizontalFlow = sin(axisFlowPhase + aTrailPhase)
    - sin(aTrailPhase);
  float depthFlow = cos(axisFlowPhase * 0.83 + aTrailPhase * 0.73)
    - cos(aTrailPhase * 0.73);
  transformedPosition.x += horizontalFlow * uScrollAxisTravel.x;
  transformedPosition.z += depthFlow * uScrollAxisTravel.y;

  // Every point on a path receives the same base phase. Progress adds a small
  // travelling bend without destroying the visual continuity of the trail.
  float trailWave = sin(
    driftTime + aTrailPhase + aTrailProgress * 6.28318530718
  );
  transformedPosition.x += trailWave * 0.045;
  transformedPosition.y += cos(driftTime * 0.8 + aTrailPhase) * 0.045;

  vec4 viewPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(
    aSize * uPixelRatio * (7.0 / max(1.0, -viewPosition.z)),
    1.25,
    14.0
  );

  vColorMix = aColorMix;
  vOpacity = aOpacity;
}
