precision highp float;

uniform vec3 uParticleOrange;
uniform vec3 uParticleGold;
uniform float uHaloBaseOpacity;
uniform float uSceneOpacity;
uniform float uSceneRevealProgress;
uniform float uSceneRevealSoftness;

varying float vBottomEndFade;
varying float vBrightness;
varying float vColorMix;
varying float vEmphasis;
varying float vProgress;
varying float vVanishFade;

void main() {
  vec2 point = gl_PointCoord * 2.0 - 1.0;
  float radius = length(point);
  float halo = 1.0 - smoothstep(0.2, 1.0, radius);
  float core = 1.0 - smoothstep(0.0, 0.32, radius);
  vec3 color = mix(uParticleOrange, uParticleGold, vColorMix);
  color = mix(color, uParticleGold, vEmphasis * 0.52);
  color *= vBrightness
    * (0.85 + core * 0.65)
    * (1.0 + vEmphasis * 0.48);
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
  float alpha = halo
    * (uHaloBaseOpacity + core * (1.0 - uHaloBaseOpacity))
    * vBottomEndFade
    * vVanishFade
    * sceneReveal
    * uSceneOpacity;

  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color, alpha);
}
