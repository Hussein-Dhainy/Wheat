attribute float aColorMix;
attribute float aDriftSpeed;
attribute float aOpacity;
attribute vec2 aOrbitCenter;
attribute float aOrbitSpeed;
attribute float aPhase;
attribute float aSize;

uniform float uPixelRatio;
uniform float uTime;

varying float vColorMix;
varying float vOpacity;

void main() {
  vec3 transformedPosition = position;
  float driftTime = uTime * aDriftSpeed;

  // Rotate each particle around its own vertical axis in the XZ plane, the
  // same slow-orbit motif as the genetics scene's background field.
  float orbitAngle = uTime * aOrbitSpeed;
  float orbitCosine = cos(orbitAngle);
  float orbitSine = sin(orbitAngle);
  vec2 orbitPosition = position.xz - aOrbitCenter;
  orbitPosition = mat2(
    orbitCosine, -orbitSine,
    orbitSine, orbitCosine
  ) * orbitPosition;
  transformedPosition.xz = aOrbitCenter + orbitPosition;

  // A slow suspended drift keeps the field feeling alive without reading as
  // a rigid rotation around a single point.
  transformedPosition.x += sin(driftTime + aPhase) * 0.1;
  transformedPosition.y += cos(driftTime * 0.73 + aPhase * 1.31) * 0.08;
  transformedPosition.z += sin(driftTime * 0.51 + aPhase * 0.67) * 0.06;

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
