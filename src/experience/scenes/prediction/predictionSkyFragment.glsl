uniform vec3 uBottomColor;
uniform vec3 uHorizonColor;
uniform vec3 uTopColor;
uniform float uHazeStrength;
uniform float uHorizonY;

varying vec2 vUv;

void main() {
  float verticalBlend = smoothstep(0.02, 0.98, vUv.y);
  vec3 color = mix(uBottomColor, uTopColor, verticalBlend);

  float horizonDistance = (vUv.y - uHorizonY) * 6.5;
  float horizonBand = exp(-horizonDistance * horizonDistance);
  color = mix(color, uHorizonColor, horizonBand * uHazeStrength);

  vec2 glowOffset = vec2(
    (vUv.x - 0.67) * 1.25,
    (vUv.y - uHorizonY) * 1.8
  );
  float horizonGlow = exp(-length(glowOffset) * 3.4);
  color = mix(
    color,
    uHorizonColor,
    horizonGlow * uHazeStrength * 0.22
  );

  vec2 vignetteOffset = (vUv - 0.5) * vec2(0.82, 1.0);
  float vignette = 1.0 - smoothstep(0.28, 0.78, length(vignetteOffset));
  color *= mix(0.76, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
