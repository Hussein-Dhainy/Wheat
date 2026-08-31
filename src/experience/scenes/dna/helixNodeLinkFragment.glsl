precision highp float;

uniform vec3 uColor;
uniform float uSceneOpacity;

varying float vOpacity;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float radius = length(point);
  float body = 1.0 - smoothstep(0.68, 1.0, radius);
  float core = 1.0 - smoothstep(0.0, 0.35, radius);
  float alpha = body * vOpacity * uSceneOpacity;

  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor + core * 0.08, alpha);
}
