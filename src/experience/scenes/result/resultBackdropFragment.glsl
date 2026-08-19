uniform float uOrangeStrength;
uniform float uTime;
varying vec2 vUv;

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

void main() {
  vec2 uv = vUv;
  vec3 deepGreen = vec3(0.002, 0.05, 0.035);
  vec3 upperGreen = vec3(0.025, 0.05, 0.02);
  vec3 color = mix(deepGreen, upperGreen, smoothstep(0.14, 1.0, uv.y));

  vec2 orangePoint = (uv - vec2(0.73, 0.78)) / vec2(0.5, 0.22);
  float orangeBloom = exp(-dot(orangePoint, orangePoint) * 2.0);
  vec2 purplePoint = (uv - vec2(0.5, 0.55)) / vec2(0.36, 0.22);
  float purpleHaze = exp(-dot(purplePoint, purplePoint) * 2.4);
  color = mix(color, vec3(0.96, 0.39, 0.17), orangeBloom * 0.76 * uOrangeStrength);
  color = mix(color, vec3(0.28, 0.12, 0.24), purpleHaze * 0.52 * uOrangeStrength);

  float slowHaze = sin(uv.x * 8.0 + uTime * 0.03)
    * sin(uv.y * 7.0 - uTime * 0.025);
  color += slowHaze * 0.008;

  float vignette = smoothstep(0.9, 0.24, length((uv - 0.5) * vec2(0.92, 1.0)));
  color *= mix(0.58, 1.0, vignette);

  vec2 grainCell = floor(uv * vec2(1150.0, 720.0));
  float grain = hash21(grainCell) - 0.5;
  color += grain * 0.014;

  gl_FragColor = vec4(color, 1.0);
}
