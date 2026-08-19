attribute float aSize;
attribute float aBrightness;
attribute float aColorMix;
attribute float aEmphasis;
attribute float aProgress;

uniform float uBottomFadeEnd;
uniform float uBottomFadeMinimumParticleScale;
uniform float uBottomFadePower;
uniform float uBottomFadeStart;
uniform float uPixelRatio;
uniform float uVanishProgress;

varying float vBottomEndFade;
varying float vBrightness;
varying float vColorMix;
varying float vEmphasis;
varying float vProgress;
varying float vVanishFade;

const float VANISH_BOTTOM = -3.3;
const float VANISH_TOP = 3.3;
const float VANISH_BAND = 1.2;

void main() {
  float bottomEndFade = pow(
    smoothstep(
      uBottomFadeStart,
      uBottomFadeEnd,
      aProgress
    ),
    uBottomFadePower
  );
  float particleScale = mix(
    uBottomFadeMinimumParticleScale,
    1.0,
    bottomEndFade
  );
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(
    aSize * particleScale * uPixelRatio
      * (6.0 / max(1.0, -viewPosition.z)),
    1.5,
    18.0
  );

  float vanishThreshold = mix(
    VANISH_BOTTOM - VANISH_BAND,
    VANISH_TOP,
    uVanishProgress
  );

  vBottomEndFade = bottomEndFade;
  vBrightness = aBrightness;
  vColorMix = aColorMix;
  vEmphasis = aEmphasis;
  vProgress = aProgress;
  vVanishFade = smoothstep(
    vanishThreshold,
    vanishThreshold + VANISH_BAND,
    position.y
  );
}
