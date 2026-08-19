attribute float aColorMix;
attribute float aPhase;
attribute float aSize;

uniform float uPixelRatio;
uniform float uTime;

varying float vColorMix;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  float pulse = 1.0 + sin(uTime * 0.85 + aPhase) * 0.035;
  gl_PointSize = clamp(
    aSize * pulse * uPixelRatio * (7.0 / max(1.0, -viewPosition.z)),
    10.0,
    96.0
  );
  vColorMix = aColorMix;
}
