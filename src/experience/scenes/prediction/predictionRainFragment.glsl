uniform float uFlash;
uniform float uOpacity;
uniform float uStrength;
uniform float uWind;

varying float vDepthFade;

void main() {
  vec2 point = gl_PointCoord - 0.5;
  float slant = mix(0.08, 0.3, uWind);
  float distanceToStreak = abs(point.x + point.y * slant);
  float streak = 1.0 - smoothstep(0.025, 0.075, distanceToStreak);
  float endFade = 1.0 - smoothstep(0.34, 0.5, abs(point.y));
  float alpha = streak * endFade * vDepthFade * uOpacity * uStrength;
  vec3 rainColor = mix(vec3(0.62, 0.69, 0.72), vec3(0.92, 0.98, 1.0), uFlash);

  if (alpha < 0.01) discard;
  gl_FragColor = vec4(rainColor, alpha);
}
