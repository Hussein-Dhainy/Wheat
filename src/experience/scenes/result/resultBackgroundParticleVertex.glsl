attribute float aColorMix;
attribute float aDriftSpeed;
attribute float aOpacity;
attribute vec2 aOrbitCenter;
attribute float aOrbitSpeed;
attribute float aPhase;
attribute float aSize;

uniform float uPixelRatio;
uniform vec3 uFieldCenter;
uniform float uMotionScale;
uniform vec2 uPointer;
uniform vec3 uPointerRange;
uniform vec3 uPointerRotation;
uniform float uScrollProgress;
uniform float uScrollMotionScale;
uniform vec3 uScrollRotation;
uniform vec3 uScrollTravel;
uniform float uTime;
uniform float uYaw;

varying float vColorMix;
varying float vOpacity;

vec3 rotateX(vec3 value, float angle) {
  float angleCosine = cos(angle);
  float angleSine = sin(angle);
  return vec3(
    value.x,
    value.y * angleCosine - value.z * angleSine,
    value.y * angleSine + value.z * angleCosine
  );
}

vec3 rotateY(vec3 value, float angle) {
  float angleCosine = cos(angle);
  float angleSine = sin(angle);
  return vec3(
    value.x * angleCosine + value.z * angleSine,
    value.y,
    -value.x * angleSine + value.z * angleCosine
  );
}

vec3 rotateZ(vec3 value, float angle) {
  float angleCosine = cos(angle);
  float angleSine = sin(angle);
  return vec3(
    value.x * angleCosine - value.y * angleSine,
    value.x * angleSine + value.y * angleCosine,
    value.z
  );
}

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

  // Rotate the complete field slowly around its vertical axis. Scroll adds
  // restrained motion around every axis and a reversible XYZ translation.
  vec3 fieldOffset = transformedPosition - uFieldCenter;
  vec3 scrollAngles = uScrollRotation
    * uScrollProgress
    * uMotionScale
    * uScrollMotionScale;
  vec3 pointerAngles = vec3(
    -uPointer.y * uPointerRotation.x,
    -uPointer.x * uPointerRotation.y,
    uPointer.x * uPointerRotation.z
  ) * uMotionScale;
  fieldOffset = rotateX(fieldOffset, scrollAngles.x + pointerAngles.x);
  fieldOffset = rotateY(
    fieldOffset,
    uYaw + scrollAngles.y + pointerAngles.y
  );
  fieldOffset = rotateZ(fieldOffset, scrollAngles.z + pointerAngles.z);
  transformedPosition = uFieldCenter + fieldOffset
    + uScrollTravel
      * uScrollProgress
      * uMotionScale
      * uScrollMotionScale;

  // Far particles react more strongly than near ones, creating parallax that
  // reads like a small camera look without changing the shared scene camera.
  float depthParallax = mix(
    0.42,
    1.0,
    smoothstep(1.8, 6.2, -position.z)
  );
  transformedPosition += vec3(
    -uPointer.x * uPointerRange.x,
    -uPointer.y * uPointerRange.y,
    (uPointer.x - uPointer.y) * uPointerRange.z
  ) * depthParallax * uMotionScale;

  vec4 viewPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(
    aSize * uPixelRatio * (7.0 / max(1.0, -viewPosition.z)),
    1.0,
    160.0
  );

  vColorMix = aColorMix;
  vOpacity = aOpacity;
}
