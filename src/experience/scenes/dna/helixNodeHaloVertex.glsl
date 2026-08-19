attribute float aColorMix;
attribute float aPhase;
attribute float aSize;

uniform float uMaximumSize;
uniform float uPixelRatio;
uniform float uPulseAmount;
uniform float uSizeScale;
uniform float uTime;

varying float vColorMix;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  float pulse = 1.0 + sin(uTime * 0.85 + aPhase) * uPulseAmount;
  gl_PointSize = clamp(
    aSize
      * uSizeScale
      * pulse
      * uPixelRatio
      * (7.0 / max(1.0, -viewPosition.z)),
    14.0,
    uMaximumSize
  );
  vColorMix = aColorMix;
}
