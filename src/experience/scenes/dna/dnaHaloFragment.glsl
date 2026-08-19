precision highp float;

uniform vec3 uHaloColor;
uniform float uHaloFalloffPower;
uniform float uHaloOpacity;
uniform float uBottomFadeEnd;
uniform float uBottomFadePower;
uniform float uBottomFadeStart;
uniform float uSceneOpacity;
uniform float uSceneRevealProgress;
uniform float uSceneRevealSoftness;

varying float vSide;
varying float vProgress;
varying float vBrightness;
varying float vOpacity;
varying float vCrossingEmphasis;
varying float vLightBoost;
varying float vVanishFade;

void main() {
  float distanceFromCenter = abs(vSide);
  float haloFalloff = pow(
    max(0.0, 1.0 - distanceFromCenter),
    max(0.001, uHaloFalloffPower)
  );
  float strandPresence = mix(
    0.35,
    1.0,
    sqrt(clamp(vOpacity, 0.0, 1.0))
  );
  float bottomEndFade = pow(
    smoothstep(
      uBottomFadeStart,
      uBottomFadeEnd,
      vProgress
    ),
    uBottomFadePower
  );
  float highlightBoost = 1.0
    + vCrossingEmphasis * 0.3
    + vLightBoost * 0.75;
  vec3 color = uHaloColor
    * (0.76 + vBrightness * 0.24)
    * (1.0 + vLightBoost * 0.3);
  float revealBoundary = mix(
    1.0 + uSceneRevealSoftness,
    0.0,
    clamp(uSceneRevealProgress, 0.0, 1.0)
  );
  float sceneReveal = smoothstep(
    revealBoundary - uSceneRevealSoftness,
    revealBoundary,
    vProgress
  );
  float alpha = haloFalloff
    * strandPresence
    * highlightBoost
    * uHaloOpacity
    * bottomEndFade
    * vVanishFade
    * sceneReveal
    * uSceneOpacity;

  if (alpha < 0.004) discard;
  gl_FragColor = vec4(color, alpha);
}
