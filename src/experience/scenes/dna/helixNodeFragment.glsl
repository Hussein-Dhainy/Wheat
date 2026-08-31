precision highp float;

uniform vec3 uCyan;
uniform float uSceneOpacity;
uniform vec3 uYellow;

varying float vColorMix;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float radius = length(point);
  float halo = 1.0 - smoothstep(0.18, 1.0, radius);
  float body = 1.0 - smoothstep(0.58, 0.76, radius);
  float core = 1.0 - smoothstep(0.0, 0.48, radius);
  vec3 color = mix(uCyan, uYellow, vColorMix);
  color *= 0.84 + core * 0.46;
  float alpha = (halo * 0.18 + body * 0.82) * uSceneOpacity;

  if (alpha < 0.008) discard;
  gl_FragColor = vec4(color, alpha);
}
