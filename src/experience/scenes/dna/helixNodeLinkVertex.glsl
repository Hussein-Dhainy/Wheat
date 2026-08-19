attribute float aProgress;

uniform float uPixelRatio;

varying float vOpacity;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(
    5.0 * uPixelRatio * (7.0 / max(1.0, -viewPosition.z)),
    2.0,
    8.0
  );
  vOpacity = 0.35 + sin(aProgress * 3.14159265) * 0.35;
}
