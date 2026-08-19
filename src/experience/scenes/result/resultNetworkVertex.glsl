attribute float aPulsePhase;
attribute float aDepthFactor;
attribute float aSizeFactor;
attribute float aDriftPhase;
attribute float aDriftSpeed;
attribute vec3 aDriftAmplitude;
attribute float aShade;

uniform float uPixelRatio;
uniform float uPointSize;
uniform float uPulseSpeed;
uniform float uPulseStrength;
uniform float uTime;
uniform float uDriftStrength;

varying float vPulse;
varying float vDepthFactor;
varying float vShade;

void main() {
  float driftTime = uTime * aDriftSpeed + aDriftPhase;
  vec3 drift = vec3(
    sin(driftTime),
    cos(driftTime * 0.83 + 1.7),
    sin(driftTime * 0.67 + 3.1)
  ) * aDriftAmplitude * uDriftStrength;
  vec4 viewPosition = modelViewMatrix * vec4(position + drift, 1.0);
  float pulseWave = 0.5 + 0.5 * sin(
    aPulsePhase * 6.28318530718 - uTime * uPulseSpeed * 6.28318530718
  );
  float travelingPulse = 0.58 + pow(pulseWave, 9.0) * 1.6;
  vPulse = mix(1.0, travelingPulse, uPulseStrength);
  vDepthFactor = aDepthFactor;
  vShade = aShade;

  gl_PointSize = max(
    1.0,
    uPointSize * aSizeFactor * uPixelRatio * (6.0 / max(1.0, -viewPosition.z))
  );
  gl_Position = projectionMatrix * viewPosition;
}
