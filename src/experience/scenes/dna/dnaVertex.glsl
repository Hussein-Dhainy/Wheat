attribute vec3 aPrevious;
attribute vec3 aNext;
attribute float aSide;
attribute float aProgress;
attribute float aCrossingEmphasis;
attribute vec4 aFiberProperties;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform vec3 uLightSpotPositions[LIGHT_SPOT_COUNT];
uniform float uLightSpotRadii[LIGHT_SPOT_COUNT];
uniform float uLightSpotIntensities[LIGHT_SPOT_COUNT];
uniform float uLightSpotWidthBoost;
uniform float uWidthScale;
uniform float uVanishProgress;

varying float vSide;
varying float vProgress;
varying float vBrightness;
varying float vOpacity;
varying float vColorMix;
varying float vCrossingEmphasis;
varying float vLightBoost;
varying float vVanishFade;

// The helix's centerline spans roughly y = -3 to 3 (see height in
// createDNAGeometry.js); these give the fade sweep a little margin beyond
// that so nothing clips before the sweep line actually reaches it.
const float VANISH_BOTTOM = -3.3;
const float VANISH_TOP = 3.3;
const float VANISH_BAND = 1.2;

void main() {
  float lightBoost = 0.0;
  for (int spotIndex = 0; spotIndex < LIGHT_SPOT_COUNT; spotIndex += 1) {
    float spotDistance = distance(position, uLightSpotPositions[spotIndex]);
    float spotFalloff = 1.0
      - smoothstep(0.0, uLightSpotRadii[spotIndex], spotDistance);
    lightBoost += spotFalloff * uLightSpotIntensities[spotIndex];
  }

  vec4 currentView = modelViewMatrix * vec4(position, 1.0);
  vec4 previousClip = projectionMatrix
    * modelViewMatrix
    * vec4(aPrevious, 1.0);
  vec4 nextClip = projectionMatrix
    * modelViewMatrix
    * vec4(aNext, 1.0);
  vec4 currentClip = projectionMatrix * currentView;

  vec2 previousScreen = previousClip.xy
    / max(previousClip.w, 0.0001)
    * uResolution
    * 0.5;
  vec2 nextScreen = nextClip.xy
    / max(nextClip.w, 0.0001)
    * uResolution
    * 0.5;
  vec2 screenDirection = nextScreen - previousScreen;
  float directionLength = max(length(screenDirection), 0.0001);
  vec2 screenNormal = vec2(
    -screenDirection.y,
    screenDirection.x
  ) / directionLength;
  float halfWidthPixels = aFiberProperties.w
    * uPixelRatio
    * uWidthScale
    * (1.0 + lightBoost * uLightSpotWidthBoost);
  vec2 clipOffset = screenNormal
    * aSide
    * halfWidthPixels
    * 2.0
    / uResolution;

  currentClip.xy += clipOffset * currentClip.w;
  gl_Position = currentClip;

  vSide = aSide;
  vProgress = aProgress;
  vBrightness = aFiberProperties.x;
  vOpacity = aFiberProperties.y;
  vColorMix = aFiberProperties.z;
  vCrossingEmphasis = aCrossingEmphasis;
  vLightBoost = lightBoost;

  // Sweeps a soft fade boundary up the strand's own local Y axis, so the
  // dissolve stays anchored to the structure regardless of its scroll-driven
  // position and rotation.
  float vanishThreshold = mix(
    VANISH_BOTTOM - VANISH_BAND,
    VANISH_TOP,
    uVanishProgress
  );
  vVanishFade = smoothstep(
    vanishThreshold,
    vanishThreshold + VANISH_BAND,
    position.y
  );
}
