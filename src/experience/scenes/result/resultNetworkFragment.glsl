uniform vec3 uColor;
uniform float uHalo;
uniform float uOpacity;

varying float vPulse;
varying float vDepthFactor;
varying float vShade;

void main() {
  float radius = length(gl_PointCoord - 0.5) * 2.0;
  if (radius >= 1.0) discard;

  float coreAlpha = 1.0 - smoothstep(0.55, 1.0, radius);
  float haloAlpha = pow(max(0.0, 1.0 - radius), 2.35);
  float alpha = mix(coreAlpha, haloAlpha, uHalo)
    * uOpacity
    * vPulse
    * vDepthFactor;

  gl_FragColor = vec4(uColor * vShade, alpha);
}
