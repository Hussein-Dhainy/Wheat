// Screen-space overlay (this quad is kept glued in front of the camera, see
// ResultScene.jsx) rather than anything painted onto the grain itself, so
// the effect stays pinned to the viewport regardless of how the camera
// moves/tilts through the scene. Same technique and parameters as the field
// scene's shadow overlay (fieldShadowFragment.glsl).
uniform float uVignetteStrength;
uniform float uTime;

varying vec2 vUv;

float blob(vec2 uv, vec2 center, float radius) {
  float dist = distance(uv, center);
  return 1.0 - smoothstep(0.0, radius, dist);
}

void main() {
  // Two independent edge gradients leave a clearly clean top-left, darkening
  // only near the bottom and right edges.
  float bottomFade = 1.0 - smoothstep(0.0, 0.5, vUv.y);
  float rightFade = smoothstep(0.5, 1.0, vUv.x);
  float vignette = max(bottomFade, rightFade) * uVignetteStrength;

  // A couple of soft, slowly drifting blobs confined toward the left side —
  // always present while the scene is active, independent of scroll.
  float drift = uTime * 0.015;
  float leftMask = 1.0 - smoothstep(0.0, 0.55, vUv.x);
  float clouds = blob(
    vUv,
    vec2(0.08 + sin(drift * 1.3) * 0.05, 0.62 + cos(drift * 0.9) * 0.08),
    0.3
  );
  clouds += blob(
    vUv,
    vec2(0.16 + sin(drift * 0.7 + 2.0) * 0.06, 0.28 + cos(drift * 1.1 + 1.0) * 0.07),
    0.26
  );
  clouds = clamp(clouds, 0.0, 1.0) * leftMask * 0.35;

  float shadow = clamp(max(vignette, clouds), 0.0, 0.6);
  gl_FragColor = vec4(0.0, 0.0, 0.0, shadow);
}
