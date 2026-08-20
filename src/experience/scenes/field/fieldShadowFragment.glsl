// Static screen-space shadow for Scene 4. The camera-facing quad keeps this
// mask pinned to the viewport regardless of the field or camera rotation.
uniform float uBottomOpacity;
uniform float uCloudOpacity;
uniform float uDriftAmount;
uniform float uDriftSpeed;
uniform float uEndFadeEnd;
uniform float uEndFadeStart;
uniform float uFadeEnd;
uniform float uFadeStart;
uniform float uOpacityExponent;
uniform float uRightVignetteOpacity;
uniform vec3 uShadowColor;
uniform float uShadowProgress;
uniform float uTime;
uniform float uTopVignetteOpacity;

varying vec2 vUv;

float softEllipse(vec2 uv, vec2 center, vec2 radius) {
  vec2 offset = (uv - center) / radius;
  return 1.0 - smoothstep(0.35, 1.0, length(offset));
}

void main() {
  // Progress has already been eased within the transition and Scene 4
  // ranges on the CPU; smoothing it again would hide most of the early
  // shrink and make the effect appear static through the diagonal wipe.
  float progress = clamp(uShadowProgress, 0.0, 1.0);
  float fadeStart = mix(uFadeStart, uEndFadeStart, progress);
  float fadeEnd = mix(uFadeEnd, uEndFadeEnd, progress);
  float bottomMask = 1.0 - smoothstep(fadeStart, fadeEnd, vUv.y);
  float opacity = uBottomOpacity * pow(
    max(1.0 - progress, 0.0),
    max(uOpacityExponent, 0.001)
  );
  float shadow = bottomMask * opacity;

  // Enormous independently moving patches read as cloud shadows over the
  // field instead of foreground objects floating in front of the camera.
  float time = uTime * uDriftSpeed;
  vec2 upperCenter = vec2(
    0.48 + sin(time * 0.73) * 0.055 * uDriftAmount,
    0.84 + cos(time * 0.51) * 0.035 * uDriftAmount
  );
  vec2 rightCenter = vec2(
    0.91 + sin(time * 0.39 + 1.7) * 0.035 * uDriftAmount,
    0.58 + cos(time * 0.47 + 0.8) * 0.06 * uDriftAmount
  );
  vec2 middleCenter = vec2(
    0.67 + sin(time * 0.61 + 3.0) * 0.05 * uDriftAmount,
    0.48 + cos(time * 0.43 + 2.1) * 0.045 * uDriftAmount
  );
  vec2 lowerLeftCenter = vec2(
    0.13 + sin(time * 0.52 + 4.2) * 0.065 * uDriftAmount,
    0.22 + cos(time * 0.46 + 1.3) * 0.045 * uDriftAmount
  );
  vec2 bottomLeftCenter = vec2(
    0.36 + sin(time * 0.34 + 2.5) * 0.07 * uDriftAmount,
    0.06 + cos(time * 0.58 + 3.7) * 0.025 * uDriftAmount
  );

  float upperShadow = softEllipse(vUv, upperCenter, vec2(0.32, 0.34));
  float rightShadow = softEllipse(vUv, rightCenter, vec2(0.25, 0.52));
  float middleShadow = softEllipse(vUv, middleCenter, vec2(0.22, 0.29));
  float lowerLeftShadow = softEllipse(
    vUv,
    lowerLeftCenter,
    vec2(0.27, 0.31)
  );
  float bottomLeftShadow = softEllipse(
    vUv,
    bottomLeftCenter,
    vec2(0.34, 0.23)
  );
  float cloudField = max(
    max(upperShadow, rightShadow),
    max(
      middleShadow,
      max(lowerLeftShadow, bottomLeftShadow)
    )
  ) * uCloudOpacity;
  float topVignette = smoothstep(0.58, 1.0, vUv.y)
    * uTopVignetteOpacity;
  float rightVignette = smoothstep(0.70, 1.0, vUv.x)
    * uRightVignetteOpacity;
  float organicShadow = max(
    cloudField,
    max(topVignette, rightVignette)
  );

  float combinedShadow = 1.0
    - (1.0 - clamp(shadow, 0.0, 1.0))
    * (1.0 - clamp(organicShadow, 0.0, 1.0));
  gl_FragColor = vec4(uShadowColor, combinedShadow);
}
