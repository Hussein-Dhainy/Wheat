uniform vec3 uDeepTeal;
uniform vec3 uGold;
uniform vec3 uIvory;

varying float vColorMix;
varying float vOpacity;

// Regular pentagon signed distance field (Inigo Quilez), evaluated in the
// point sprite's own [-1, 1] space.
float sdPentagon(vec2 point, float radius) {
  const vec3 k = vec3(0.809016994, 0.587785252, 0.726542528);
  point.x = abs(point.x);
  point -= 2.0 * min(dot(vec2(-k.x, k.y), point), 0.0) * vec2(-k.x, k.y);
  point -= 2.0 * min(dot(vec2(k.x, k.y), point), 0.0) * vec2(k.x, k.y);
  point -= vec2(clamp(point.x, -radius * k.z, radius * k.z), radius);
  return length(point) * sign(point.y);
}

void main() {
  vec2 centeredPoint = gl_PointCoord * 2.0 - 1.0;
  centeredPoint.y = -centeredPoint.y;
  float sdf = sdPentagon(centeredPoint, 0.72);

  // A wide soft-edge band (rather than a crisp cutoff) reads as a blurred
  // pentagon silhouette instead of a sharply outlined shape.
  float shape = 1.0 - smoothstep(-0.34, 0.28, sdf);

  float goldAmount = smoothstep(0.18, 0.82, vColorMix);
  float ivoryAmount = smoothstep(0.92, 0.98, vColorMix);
  vec3 baseColor = mix(uDeepTeal, uGold, goldAmount);
  vec3 particleColor = mix(baseColor, uIvory, ivoryAmount);

  float alpha = shape * vOpacity;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(particleColor, alpha);
}
