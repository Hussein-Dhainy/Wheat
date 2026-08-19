uniform vec3 uDeepGreen;
uniform vec3 uEmerald;
uniform vec3 uPink;

varying float vColorMix;
varying float vOpacity;

void main() {
  vec2 centeredPoint = gl_PointCoord * 2.0 - 1.0;
  float distanceFromCenter = length(centeredPoint);
  float body = 1.0 - smoothstep(0.58, 1.0, distanceFromCenter);
  float core = 1.0 - smoothstep(0.0, 0.32, distanceFromCenter);

  float emeraldAmount = smoothstep(0.2, 0.86, vColorMix);
  float pinkAmount = smoothstep(0.94, 0.985, vColorMix);
  vec3 greenColor = mix(uDeepGreen, uEmerald, emeraldAmount);
  vec3 particleColor = mix(greenColor, uPink, pinkAmount);
  float alpha = body * vOpacity;

  if (alpha < 0.01) discard;

  gl_FragColor = vec4(particleColor + core * 0.14, alpha);
}
