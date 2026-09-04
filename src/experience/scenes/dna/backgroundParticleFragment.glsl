uniform vec3 uDarkTeal;
uniform vec3 uEmerald;
uniform vec3 uPink;
uniform float uSceneOpacity;

varying float vColorMix;
varying float vOpacity;

void main() {
  vec2 centeredPoint = gl_PointCoord * 2.0 - 1.0;
  float distanceFromCenter = length(centeredPoint);
  float softBody = 1.0 - smoothstep(0.28, 1.0, distanceFromCenter);
  float centerGlow = 1.0 - smoothstep(0.0, 0.42, distanceFromCenter);

  float emeraldAmount = smoothstep(0.18, 0.82, vColorMix);
  float pinkAmount = smoothstep(0.92, 0.98, vColorMix);
  vec3 greenColor = mix(uDarkTeal, uEmerald, emeraldAmount);
  vec3 particleColor = mix(greenColor, uPink, pinkAmount);

  float alpha = softBody * vOpacity * uSceneOpacity;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(particleColor + centerGlow * 0.12, alpha);
}
