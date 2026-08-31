precision highp float;

uniform vec3 uCyan;
uniform float uFalloffPower;
uniform float uHaloOpacity;
uniform float uSceneOpacity;
uniform vec3 uYellow;

varying float vColorMix;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float radius = length(point);
  float halo = pow(
    max(0.0, 1.0 - radius),
    max(0.001, uFalloffPower)
  );
  vec3 color = mix(uCyan, uYellow, vColorMix);
  float alpha = halo * uHaloOpacity * uSceneOpacity;

  if (alpha < 0.004) discard;
  gl_FragColor = vec4(color, alpha);
}
