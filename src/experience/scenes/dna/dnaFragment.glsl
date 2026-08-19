precision highp float;

uniform vec3 uHotCore;
uniform float uBottomFadeEnd;
uniform float uBottomFadePower;
uniform float uBottomFadeStart;
uniform float uLightSpotColorBoost;
uniform float uLightSpotOpacityBoost;
uniform float uSceneOpacity;
uniform float uSceneRevealProgress;
uniform float uSceneRevealSoftness;

varying float vSide;
varying float vProgress;
varying float vBrightness;
varying float vOpacity;
varying float vColorMix;
varying float vCrossingEmphasis;
varying float vLightBoost;
varying float vVanishFade;

void main() {
  float distanceFromCenter = abs(vSide);
  float softBody = 1.0 - smoothstep(0.97, 1.0, distanceFromCenter);
  vec3 color = uHotCore * vBrightness;
  float hotspotBrightness = 1.0 + vCrossingEmphasis * 1.25;
  color *= hotspotBrightness;
  color = mix(color, uHotCore, vCrossingEmphasis * 0.38);

  float alpha = softBody
    * vOpacity
    * (1.0 + vCrossingEmphasis * 0.34);

  color *= 1.0 + vLightBoost * uLightSpotColorBoost;
  alpha = min(1.0, alpha * (1.0 + vLightBoost * uLightSpotOpacityBoost));
  float bottomEndFade = pow(
    smoothstep(
      uBottomFadeStart,
      uBottomFadeEnd,
      vProgress
    ),
    uBottomFadePower
  );
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
  alpha *= bottomEndFade * vVanishFade * sceneReveal * uSceneOpacity;

  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color, alpha);
}
