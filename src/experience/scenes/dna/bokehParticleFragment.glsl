uniform vec3 uDeepTeal;
uniform vec3 uForestGreen;

varying float vColorMix;
varying float vOpacity;

void main() {
  vec2 centeredPoint = gl_PointCoord * 2.0 - 1.0;
  float distanceFromCenter = length(centeredPoint);

  // A broad falloff creates an intentionally defocused shape rather than a
  // sharply defined particle. The faint inner haze keeps the center soft.
  float outerFalloff = 1.0 - smoothstep(0.05, 1.0, distanceFromCenter);
  float haze = outerFalloff * outerFalloff;
  float alpha = haze * vOpacity;

  if (alpha < 0.002) discard;

  vec3 particleColor = mix(uDeepTeal, uForestGreen, vColorMix);
  gl_FragColor = vec4(particleColor, alpha);
}
