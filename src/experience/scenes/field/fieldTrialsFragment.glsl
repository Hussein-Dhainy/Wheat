uniform sampler2D uFieldTexture;
uniform sampler2D uTintTexture;
uniform vec2 uGridSize;
uniform float uBrightness;
uniform float uContrast;
uniform float uDividerDarkening;
uniform float uDividerWidth;
uniform float uSaturation;
uniform float uTintStrength;

varying vec2 vUv;

void main() {
  vec2 tiledUv = vUv * uGridSize;
  vec2 plot = floor(tiledUv);
  vec2 localUv = fract(tiledUv);

  // Alternating every copy removes the hard edge caused by directly repeating
  // a photograph whose opposite sides do not match.
  if (mod(plot.x, 2.0) > 0.5) localUv.x = 1.0 - localUv.x;
  if (mod(plot.y, 2.0) > 0.5) localUv.y = 1.0 - localUv.y;

  vec3 color = texture2D(uFieldTexture, localUv).rgb;
  vec2 tintUv = (plot + 0.5) / uGridSize;
  vec3 plotTint = texture2D(uTintTexture, tintUv).rgb;

  // Treat the plot color as a multiplier so the crop detail and planting rows
  // remain present instead of being covered by a flat colored overlay.
  vec3 tintMultiplier = 0.45 + plotTint * 1.1;
  color *= mix(vec3(1.0), tintMultiplier, uTintStrength);

  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, uSaturation);
  color = (color - 0.5) * uContrast + 0.5;
  color *= uBrightness;

  float nearestEdge = min(
    min(localUv.x, 1.0 - localUv.x),
    min(localUv.y, 1.0 - localUv.y)
  );
  float divider = 1.0 - smoothstep(0.0, uDividerWidth, nearestEdge);
  color *= 1.0 - divider * uDividerDarkening;

  gl_FragColor = vec4(max(color, 0.0), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
