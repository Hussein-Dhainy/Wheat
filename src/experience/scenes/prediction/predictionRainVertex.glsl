uniform float uHalfHeight;
uniform float uHeight;
uniform float uHorizontalRange;
uniform float uPixelRatio;
uniform float uTime;
uniform float uWind;

attribute float aSize;
attribute float aSpeed;

varying float vDepthFade;

void main() {
  vec3 animatedPosition = position;
  float fallDistance = uTime * aSpeed;
  animatedPosition.y = mod(
    position.y - fallDistance + uHalfHeight,
    uHeight
  ) - uHalfHeight;
  animatedPosition.x = mod(
    position.x + fallDistance * uWind * 0.16 + uHorizontalRange,
    uHorizontalRange * 2.0
  ) - uHorizontalRange;

  vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
  float perspectiveScale = clamp(4.0 / max(0.5, -viewPosition.z), 0.48, 1.8);
  gl_PointSize = aSize * uPixelRatio * perspectiveScale;
  gl_Position = projectionMatrix * viewPosition;
  vDepthFade = smoothstep(18.0, 2.0, -viewPosition.z);
}
