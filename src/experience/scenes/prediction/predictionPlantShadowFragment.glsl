precision highp float;

uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  // The plane's UV top is anchored at the plant and its bottom points away
  // from the drought key light. Keep the base broad and fade the long tip.
  float along = smoothstep(0.0, 0.34, vUv.y)
    * (1.0 - smoothstep(0.94, 1.0, vUv.y));
  float taper = mix(0.18, 0.5, pow(vUv.y, 0.62));
  float across = 1.0 - smoothstep(
    taper * 0.58,
    taper,
    abs(vUv.x - 0.5)
  );
  float brokenEdge = 0.9 + sin(vUv.y * 31.0) * 0.05;
  float alpha = along * across * brokenEdge * uOpacity;

  if (alpha < 0.002) discard;
  gl_FragColor = vec4(uColor, alpha);
}
