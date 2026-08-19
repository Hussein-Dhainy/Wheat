precision highp float;

uniform vec3 uColor;
uniform float uFalloffPower;
uniform float uOpacity;

void main() {
  vec2 centeredPoint = gl_PointCoord * 2.0 - 1.0;
  float distanceFromCenter = length(centeredPoint);
  float glow = pow(
    max(0.0, 1.0 - distanceFromCenter),
    max(0.001, uFalloffPower)
  );
  float alpha = glow * uOpacity;

  if (alpha < 0.001) discard;

  gl_FragColor = vec4(uColor, alpha);
}
