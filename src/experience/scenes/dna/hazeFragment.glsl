uniform vec3 uGreen;
uniform vec3 uOrange;

varying vec2 vUv;

float ellipticalHaze(
  vec2 coordinate,
  vec2 center,
  vec2 radius,
  float softness
) {
  vec2 distanceFromCenter = (coordinate - center) / radius;
  return exp(-dot(distanceFromCenter, distanceFromCenter) * softness);
}

float interleavedGradientNoise(vec2 pixelPosition) {
  return fract(
    52.9829189
    * fract(dot(pixelPosition, vec2(0.06711056, 0.00583715)))
  );
}

void main() {
  float orangeHaze = ellipticalHaze(
    vUv,
    vec2(-0.04, 0.55),
    vec2(0.72, 0.82),
    1.55
  );
  float greenHaze = ellipticalHaze(
    vUv,
    vec2(1.05, 0.48),
    vec2(0.76, 0.88),
    1.5
  );

  float totalHaze = max(orangeHaze + greenHaze, 0.0001);
  vec3 hazeColor = (
    uOrange * orangeHaze
    + uGreen * greenHaze
  ) / totalHaze;

  // Fade gently at the top and bottom so the color reads as suspended haze
  // rather than a flat two-color background.
  float verticalFade = smoothstep(0.0, 0.18, vUv.y)
    * (1.0 - smoothstep(0.82, 1.0, vUv.y));
  float hazeOpacity = clamp(totalHaze * 0.24, 0.0, 0.3)
    * mix(0.72, 1.0, verticalFade);

  // The scene portals use standard 8-bit render targets. A stable amount of
  // subpixel noise breaks up dark gradient bands before they are quantized.
  float dither = (interleavedGradientNoise(gl_FragCoord.xy) - 0.5) / 255.0;
  hazeColor = max(
    hazeColor + vec3(dither / max(hazeOpacity, 0.08)),
    vec3(0.0)
  );

  gl_FragColor = vec4(hazeColor, hazeOpacity);
}
