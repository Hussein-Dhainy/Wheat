uniform float uClosingMix;
uniform float uTime;

varying vec2 vUv;

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

float valueNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);

  float bottomLeft = hash21(cell);
  float bottomRight = hash21(cell + vec2(1.0, 0.0));
  float topLeft = hash21(cell + vec2(0.0, 1.0));
  float topRight = hash21(cell + vec2(1.0, 1.0));
  return mix(
    mix(bottomLeft, bottomRight, local.x),
    mix(topLeft, topRight, local.x),
    local.y
  );
}

float softHaze(vec2 point) {
  float haze = valueNoise(point) * 0.57;
  haze += valueNoise(point * 2.03 + 4.7) * 0.29;
  haze += valueNoise(point * 4.11 + 9.2) * 0.14;
  return haze;
}

float ellipseField(vec2 uv, vec2 center, vec2 radius) {
  vec2 offset = (uv - center) / radius;
  return exp(-dot(offset, offset) * 2.0);
}

void main() {
  vec2 uv = vUv;
  vec2 hazeDrift = vec2(uTime * 0.004, -uTime * 0.0025);
  float haze = softHaze(uv * vec2(2.15, 2.45) + hazeDrift);
  float warpedY = uv.y + (haze - 0.5) * 0.16;

  vec3 deepGreen = vec3(0.001, 0.019, 0.014);
  vec3 lowerTeal = vec3(0.002, 0.068, 0.047);
  vec3 upperOlive = vec3(0.24, 0.18, 0.075);
  vec3 plum = vec3(0.17, 0.065, 0.09);
  vec3 amber = vec3(0.55, 0.22, 0.075);
  vec3 orange = vec3(0.92, 0.32, 0.105);

  vec3 color = deepGreen;
  float tealLift = ellipseField(uv, vec2(0.62, 0.22), vec2(0.68, 0.38));
  color = mix(color, lowerTeal, tealLift * 0.3);

  float oliveLift = smoothstep(0.62, 1.04, warpedY);
  color = mix(color, upperOlive, oliveLift * 0.52);

  // Keep warm color fields in the upper portion so dark green remains the
  // visual foundation rather than being replaced across the whole frame.
  float middleWarmGate = smoothstep(0.38, 0.66, warpedY);
  float upperWarmGate = smoothstep(0.5, 0.76, warpedY);

  float plumField = ellipseField(
    vec2(uv.x, warpedY),
    vec2(0.46, 0.68),
    vec2(0.66, 0.25)
  );
  color = mix(color, plum, plumField * middleWarmGate * 0.64);

  float amberField = ellipseField(
    vec2(uv.x, warpedY),
    vec2(0.5, 0.91),
    vec2(0.8, 0.22)
  );
  color = mix(color, amber, amberField * upperWarmGate * 0.52);

  float orangeField = ellipseField(
    vec2(uv.x, warpedY),
    vec2(0.73, 0.78),
    vec2(0.46, 0.24)
  );
  color = mix(color, orange, orangeField * upperWarmGate * 0.7);

  // Once the closing results arrive, the warm studio palette resolves into
  // dark green. Blue-green and lighter green remain deliberately close in
  // value so they add depth without reading as separate bright color bands.
  vec3 closingDarkGreen = vec3(0.001, 0.014, 0.011);
  vec3 closingBlueGreen = vec3(0.003, 0.033, 0.038);
  vec3 closingLightGreen = vec3(0.008, 0.042, 0.027);
  vec3 closingColor = closingDarkGreen;
  float closingBlueField = ellipseField(
    vec2(uv.x, warpedY),
    vec2(0.74, 0.68),
    vec2(0.72, 0.52)
  );
  closingColor = mix(
    closingColor,
    closingBlueGreen,
    closingBlueField * 0.38
  );
  float closingGreenField = ellipseField(
    vec2(uv.x, warpedY),
    vec2(0.32, 0.32),
    vec2(0.62, 0.48)
  );
  closingColor = mix(
    closingColor,
    closingLightGreen,
    closingGreenField * 0.3
  );
  color = mix(color, closingColor, uClosingMix);

  // The haze only perturbs the broad color boundaries; it should never read
  // as explicit smoke or compete with the foreground particle systems.
  color += (haze - 0.5) * mix(0.018, 0.008, uClosingMix);

  vec2 vignetteUv = (uv - 0.5) * vec2(0.84, 1.0);
  float vignette = smoothstep(0.3, 0.78, length(vignetteUv));
  color *= mix(1.0, 0.56, vignette);

  float filmGrain = hash21(floor(gl_FragCoord.xy)) - 0.5;
  color += filmGrain * 0.012;

  gl_FragColor = vec4(max(color, 0.0), 1.0);
}
