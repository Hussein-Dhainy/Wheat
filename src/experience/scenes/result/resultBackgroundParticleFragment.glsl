uniform vec3 uDeepTeal;
uniform vec3 uGold;
uniform vec3 uIvory;

varying float vColorMix;
varying float vOpacity;

void main() {
  vec2 centeredPoint = gl_PointCoord * 2.0 - 1.0;
  float distanceFromCenter = length(centeredPoint);
  float softBody = 1.0 - smoothstep(0.28, 1.0, distanceFromCenter);
  float centerGlow = 1.0 - smoothstep(0.0, 0.42, distanceFromCenter);

  float goldAmount = smoothstep(0.18, 0.82, vColorMix);
  float ivoryAmount = smoothstep(0.92, 0.98, vColorMix);
  vec3 baseColor = mix(uDeepTeal, uGold, goldAmount);
  vec3 particleColor = mix(baseColor, uIvory, ivoryAmount);

  float alpha = softBody * vOpacity;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(particleColor + centerGlow * 0.12, alpha);
}
