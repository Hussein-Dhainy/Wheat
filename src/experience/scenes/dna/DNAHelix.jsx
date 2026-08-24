import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MathUtils,
  Vector2,
  Vector3,
} from 'three'
import { DNACameraRig } from '../../camera/DNACameraRig.jsx'
import { createDNAGeometry } from './createDNAGeometry.js'
import { DNA_RENDER_CONFIG } from './dnaConfig.js'
import dnaFragmentShader from './dnaFragment.glsl?raw'
import dnaHaloFragmentShader from './dnaHaloFragment.glsl?raw'
import dnaParticleFragmentShader from './dnaParticleFragment.glsl?raw'
import dnaParticleVertexShader from './dnaParticleVertex.glsl?raw'
import dnaVertexShader from './dnaVertex.glsl?raw'
import DNABackgroundParticles from './DNABackgroundParticles.jsx'
import DNABokehParticles from './DNABokehParticles.jsx'
import DNAFallingSeeds from './DNAFallingSeeds.jsx'
import DNAHaze from './DNAHaze.jsx'
import DNAHelixNodes from './DNAHelixNodes.jsx'
import DNAParticleTrails from './DNAParticleTrails.jsx'

const ROTATION_SPEED_RADIANS_PER_SECOND = 0.2
const DNA_VERTICAL_TRAVEL = 7
const DNA_SCROLL_ROTATION = Math.PI * 2
// The scene's single section is 4 scroll units long (see sceneTimeline.js);
// keep the established DNA beat at 2 units and use the added space for seeds.
const DISAPPEAR_FRACTION_OF_SCENE = 1 / 2
// The bottom-up dissolve only runs in the last third of that journey; before
// that it's just the plain slide/twist.
const VANISH_START_PROGRESS = 2 / 3

function applyBackgroundPalette(target, stops, progress) {
  if (progress <= stops[0].progress) {
    target.copy(stops[0].color)
    return
  }

  for (let index = 1; index < stops.length; index += 1) {
    const next = stops[index]
    if (progress > next.progress) continue

    const previous = stops[index - 1]
    const range = Math.max(0.0001, next.progress - previous.progress)
    const localProgress = Math.min(
      1,
      Math.max(0, (progress - previous.progress) / range),
    )
    const easedProgress = localProgress * localProgress
      * (3 - 2 * localProgress)
    target.lerpColors(previous.color, next.color, easedProgress)
    return
  }

  target.copy(stops[stops.length - 1].color)
}

export default function DNAHelix({
  background = '#160904',
  onSelectGeneticsSeed,
  pointerRef,
  reducedMotion,
  sceneStateRef,
  selectedGeneticsSeed,
}) {
  const dnaReference = useRef()
  const backgroundReference = useRef()
  const haloMaterialReference = useRef()
  const ribbonMaterialReference = useRef()
  const particleMaterialReference = useRef()
  const entryParticleFlow = useRef(0)
  const scrollRotationProgress = useRef(0)
  const idleRotation = useRef(0)
  const renderResolution = useRef(new Vector2(1, 1))
  const backgroundStops = useMemo(() => (
    DNA_RENDER_CONFIG.background.stops.map((stop) => ({
      color: new Color(stop.color ?? background),
      progress: stop.progress,
    }))
  ), [background])

  const geometries = useMemo(() => {
    return createDNAGeometry({
      bundleRadius: 0.16,
      crossingGroups: [
        {
          fractionPerCluster: 0.4,
          timingSpread: 0.00,
          movements: [
            {
              end: 0.37,
              smoothness: 2,
              start: 0.25,
            },
            {
              end: 0.59,
              smoothness: 2,
              start: 0.47,
            },
            {
              end: 0.81,
              smoothness: 2,
              start: 0.69,
            },
          ],
        },
      ],
      detailNoiseFrequency: 10,
      fiberTwists: 4,
      height: 6,
      maximumRibbonOpacity: DNA_RENDER_CONFIG.maximumRibbonOpacity,
      maximumRibbonWidth: DNA_RENDER_CONFIG.maximumRibbonWidth,
      minimumRibbonOpacity: DNA_RENDER_CONFIG.minimumRibbonOpacity,
      minimumRibbonWidth: DNA_RENDER_CONFIG.minimumRibbonWidth,
      movementAmplitude: 0.12,
      particlesPerFiber: DNA_RENDER_CONFIG.particlesPerFiber,
      primaryNoiseFrequency: 4,
      pulseAmount: 0.12,
      pulseCount: 12,
      radius: 0.8,
      seed: 12345,
      segments: 250,
      strandCount: 30,
      turns: 0.75,
    })
  }, [])

  // Static, config-authored highlights, pinned to the DNA's structure.
  const lightSpots = useMemo(() => ({
    intensities: DNA_RENDER_CONFIG.lightSpots.map((spot) => spot.intensity),
    positions: DNA_RENDER_CONFIG.lightSpots.map(
      (spot) => new Vector3(...spot.position),
    ),
    radii: DNA_RENDER_CONFIG.lightSpots.map((spot) => spot.radius),
  }), [])

  const ribbonUniforms = useMemo(() => ({
    uBottomFadeEnd: { value: DNA_RENDER_CONFIG.bottomEndFade.end },
    uBottomFadePower: { value: DNA_RENDER_CONFIG.bottomEndFade.power },
    uBottomFadeStart: { value: DNA_RENDER_CONFIG.bottomEndFade.start },
    uHotCore: { value: new Color(DNA_RENDER_CONFIG.colors.hotCore) },
    uLightSpotColorBoost: { value: DNA_RENDER_CONFIG.glow.colorBoost },
    uLightSpotIntensities: { value: lightSpots.intensities },
    uLightSpotOpacityBoost: { value: DNA_RENDER_CONFIG.glow.opacityBoost },
    uLightSpotPositions: { value: lightSpots.positions },
    uLightSpotRadii: { value: lightSpots.radii },
    uLightSpotWidthBoost: { value: DNA_RENDER_CONFIG.glow.widthBoost },
    uPixelRatio: { value: 1 },
    uResolution: { value: renderResolution.current },
    uSceneOpacity: { value: 0 },
    uSceneRevealProgress: { value: 0 },
    uSceneRevealSoftness: { value: DNA_RENDER_CONFIG.entry.revealSoftness },
    uWidthScale: { value: 1 },
    uVanishProgress: { value: 0 },
  }), [lightSpots])

  const haloUniforms = useMemo(() => ({
    uBottomFadeEnd: { value: DNA_RENDER_CONFIG.bottomEndFade.end },
    uBottomFadePower: { value: DNA_RENDER_CONFIG.bottomEndFade.power },
    uBottomFadeStart: { value: DNA_RENDER_CONFIG.bottomEndFade.start },
    uHaloColor: { value: new Color(DNA_RENDER_CONFIG.halos.dna.color) },
    uHaloFalloffPower: { value: DNA_RENDER_CONFIG.halos.dna.falloffPower },
    uHaloOpacity: { value: DNA_RENDER_CONFIG.halos.dna.opacity },
    uLightSpotIntensities: { value: lightSpots.intensities },
    uLightSpotPositions: { value: lightSpots.positions },
    uLightSpotRadii: { value: lightSpots.radii },
    uLightSpotWidthBoost: { value: DNA_RENDER_CONFIG.glow.widthBoost },
    uPixelRatio: { value: 1 },
    uResolution: { value: renderResolution.current },
    uSceneOpacity: { value: 0 },
    uSceneRevealProgress: { value: 0 },
    uSceneRevealSoftness: { value: DNA_RENDER_CONFIG.entry.revealSoftness },
    uVanishProgress: { value: 0 },
    uWidthScale: { value: DNA_RENDER_CONFIG.halos.dna.widthScale },
  }), [lightSpots])

  const particleUniforms = useMemo(() => ({
    uBottomFadeEnd: { value: DNA_RENDER_CONFIG.bottomEndFade.end },
    uBottomFadeMinimumParticleScale: {
      value: DNA_RENDER_CONFIG.bottomEndFade.minimumParticleScale,
    },
    uBottomFadePower: { value: DNA_RENDER_CONFIG.bottomEndFade.power },
    uBottomFadeStart: { value: DNA_RENDER_CONFIG.bottomEndFade.start },
    uHaloBaseOpacity: {
      value: DNA_RENDER_CONFIG.halos.dna.embeddedParticleOpacity,
    },
    uParticleGold: {
      value: new Color(DNA_RENDER_CONFIG.colors.particleGold),
    },
    uParticleOrange: {
      value: new Color(DNA_RENDER_CONFIG.colors.particleOrange),
    },
    uPixelRatio: { value: 1 },
    uSceneOpacity: { value: 0 },
    uSceneRevealProgress: { value: 0 },
    uSceneRevealSoftness: { value: DNA_RENDER_CONFIG.entry.revealSoftness },
    uVanishProgress: { value: 0 },
  }), [])

  useEffect(() => {
    return () => {
      geometries.particleGeometry.dispose()
      geometries.ribbonGeometry.dispose()
    }
  }, [geometries])

  useFrame(({ gl }, deltaTime) => {
    gl.getDrawingBufferSize(renderResolution.current)
    const pixelRatio = gl.getPixelRatio()
    haloUniforms.uPixelRatio.value = pixelRatio
    ribbonUniforms.uPixelRatio.value = pixelRatio
    particleUniforms.uPixelRatio.value = pixelRatio

    const sceneState = sceneStateRef?.current
    if (!dnaReference.current || !sceneState) return

    if (!sceneState.isActive) {
      entryParticleFlow.current = 0
      scrollRotationProgress.current = 0
      if (haloMaterialReference.current) {
        haloMaterialReference.current.uniforms.uSceneOpacity.value = 0
        haloMaterialReference.current.uniforms.uSceneRevealProgress.value = 0
      }
      if (ribbonMaterialReference.current) {
        ribbonMaterialReference.current.uniforms.uSceneOpacity.value = 0
        ribbonMaterialReference.current.uniforms.uSceneRevealProgress.value = 0
      }
      if (particleMaterialReference.current) {
        particleMaterialReference.current.uniforms.uSceneOpacity.value = 0
        particleMaterialReference.current.uniforms.uSceneRevealProgress.value = 0
      }
      return
    }

    // Normalized so 1.0 lands exactly 2 scroll units into the scene's
    // single 3-unit-long section, instead of at the section's own end.
    const sceneProgress = sceneState.progress ?? 0
    const motionProgress = reducedMotion
      ? sceneProgress
      : sceneState.motionProgress ?? sceneProgress
    const transitionMotionOffset = reducedMotion
      ? 0
      : sceneState.transitionMotionOffset ?? 0
    const sceneVisibility = Math.min(
      1,
      Math.max(0, sceneState.visibility ?? 0),
    )
    // The Scene 1/2 handoff owns the entry twist. Once genetics content has
    // begun (or Scene 2 is re-entering from Scene 3), the twist stays fully
    // settled. This single scroll-derived value is exactly reversible.
    const entryTransitionProgress = sceneProgress > 0
      ? 1
      : sceneVisibility

    const transitionRevealProgress = MathUtils.lerp(
      DNA_RENDER_CONFIG.entry.minimumRevealProgress,
      DNA_RENDER_CONFIG.entry.transitionRevealProgress,
      // Keep the sweep directly tied to scroll. The shader already softens
      // its moving edge; easing here as well delayed the visible onset and
      // compressed too much of the downward growth into the middle.
      entryTransitionProgress,
    )
    const revealCompletionProgress = MathUtils.clamp(
      sceneProgress
        / Math.max(
          0.001,
          DNA_RENDER_CONFIG.entry.revealCompletionSceneProgress,
        ),
      0,
      1,
    )
    const entryRevealProgress = MathUtils.lerp(
      transitionRevealProgress,
      1,
      revealCompletionProgress,
    )
    const entrySettleProgress = MathUtils.smootherstep(
      entryTransitionProgress,
      0,
      1,
    )
    entryParticleFlow.current = reducedMotion
      ? 0
      : MathUtils.damp(
          entryParticleFlow.current,
          entrySettleProgress,
          DNA_RENDER_CONFIG.particleFlow.entryDamping,
          deltaTime,
        )
    // Tracks scene progress directly rather than easing toward it — the
    // scroll position itself is already smoothed upstream (virtualScroll's
    // own damping), so a second damping pass here only added extra lag
    // between scrolling and the DNA visibly responding.
    scrollRotationProgress.current = reducedMotion
      ? 0
      : motionProgress * entrySettleProgress
    applyBackgroundPalette(
      backgroundReference.current,
      backgroundStops,
      Math.min(1, Math.max(0, sceneProgress)),
    )
    const disappearProgress = Math.min(
      1,
      Math.max(
        0,
        sceneProgress / DISAPPEAR_FRACTION_OF_SCENE,
      ),
    )
    const vanishProgress = Math.min(
      1,
      Math.max(
        0,
        (disappearProgress - VANISH_START_PROGRESS)
          / (1 - VANISH_START_PROGRESS),
      ),
    )

    if (!reducedMotion) {
      idleRotation.current += (
        deltaTime * ROTATION_SPEED_RADIANS_PER_SECOND
      )
    }

    dnaReference.current.position.y = (
      disappearProgress * DNA_VERTICAL_TRAVEL
      + transitionMotionOffset * DNA_RENDER_CONFIG.transitionTravel
    )
    dnaReference.current.rotation.y = reducedMotion
      ? 0
      : idleRotation.current
        + scrollRotationProgress.current * DNA_SCROLL_ROTATION
        - DNA_RENDER_CONFIG.entry.rotation * (1 - entrySettleProgress)
    haloUniforms.uVanishProgress.value = vanishProgress
    ribbonUniforms.uVanishProgress.value = vanishProgress
    particleUniforms.uVanishProgress.value = vanishProgress
    // Update the uniforms owned by the mounted ShaderMaterial instances.
    // R3F may instantiate/copy the uniforms passed through JSX, so mutating
    // only the memoized definitions can leave the rendered opacity at its
    // initial value of zero.
    if (haloMaterialReference.current) {
      haloMaterialReference.current.uniforms.uSceneOpacity.value = 1
      haloMaterialReference.current.uniforms.uSceneRevealProgress.value = (
        entryRevealProgress
      )
    }
    if (ribbonMaterialReference.current) {
      ribbonMaterialReference.current.uniforms.uSceneOpacity.value = 1
      ribbonMaterialReference.current.uniforms.uSceneRevealProgress.value = (
        entryRevealProgress
      )
    }
    if (particleMaterialReference.current) {
      particleMaterialReference.current.uniforms.uSceneOpacity.value = 1
      particleMaterialReference.current.uniforms.uSceneRevealProgress.value = (
        entryRevealProgress
      )
    }
  })

  return (
    <>
      <color ref={backgroundReference} attach="background" args={[background]} />

      <DNACameraRig
        pointerRef={pointerRef}
        reducedMotion={reducedMotion}
        sceneStateRef={sceneStateRef}
      />

      <DNAHaze />
      <DNABokehParticles
        entryFlowRef={entryParticleFlow}
        reducedMotion={reducedMotion}
        sceneStateRef={sceneStateRef}
      />
      <DNABackgroundParticles
        entryFlowRef={entryParticleFlow}
        reducedMotion={reducedMotion}
        sceneStateRef={sceneStateRef}
      />
      <DNAParticleTrails
        entryFlowRef={entryParticleFlow}
        reducedMotion={reducedMotion}
        sceneStateRef={sceneStateRef}
      />
      <DNAHelixNodes
        reducedMotion={reducedMotion}
        sceneStateRef={sceneStateRef}
      />
      <Suspense fallback={null}>
        <DNAFallingSeeds
          onSelectSeed={onSelectGeneticsSeed}
          reducedMotion={reducedMotion}
          sceneStateRef={sceneStateRef}
          selectedSeedId={selectedGeneticsSeed}
        />
      </Suspense>

      <group ref={dnaReference}>
        <mesh
          geometry={geometries.ribbonGeometry}
          frustumCulled={false}
          renderOrder={0}
        >
          <shaderMaterial
            ref={haloMaterialReference}
            defines={{ LIGHT_SPOT_COUNT: lightSpots.positions.length }}
            uniforms={haloUniforms}
            vertexShader={dnaVertexShader}
            fragmentShader={dnaHaloFragmentShader}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
            transparent
          />
        </mesh>

        <mesh
          geometry={geometries.ribbonGeometry}
          frustumCulled={false}
          renderOrder={1}
        >
          <shaderMaterial
            ref={ribbonMaterialReference}
            defines={{ LIGHT_SPOT_COUNT: lightSpots.positions.length }}
            uniforms={ribbonUniforms}
            vertexShader={dnaVertexShader}
            fragmentShader={dnaFragmentShader}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
            transparent
          />
        </mesh>

        <points
          geometry={geometries.particleGeometry}
          frustumCulled={false}
          renderOrder={2}
        >
          <shaderMaterial
            ref={particleMaterialReference}
            uniforms={particleUniforms}
            vertexShader={dnaParticleVertexShader}
            fragmentShader={dnaParticleFragmentShader}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
          />
        </points>
      </group>
    </>
  )
}
