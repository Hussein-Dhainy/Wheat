uniform float uPixelRatio;
uniform float uPointSize;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  float perspectiveScale = 7.0 / max(1.0, -viewPosition.z);

  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(
    uPointSize * uPixelRatio * perspectiveScale,
    8.0,
    64.0
  );
}
