import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { LANDING_INTRO } from '../../config/landingIntro.js'
import {
  GENETICS_INTRO_ENTER_EVENT,
  GENETICS_INTRO_EXIT_EVENT,
  SCENE_DOMINANCE_EXIT_EVENT,
  SCENE_VISIBILITY_ENTER_EVENT,
} from '../../experience/sceneManagerState.js'
import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'
import {
  BOLD_TITLE_FONT_SIZE,
  BOLD_TITLE_FONT_WEIGHT,
  BOLD_TITLE_LETTER_SPACING,
  BOLD_TITLE_LINE_HEIGHT,
  computeBoldTitleBox,
} from './sceneTitleBox.js'
import styles from './SceneOverlays.module.css'

const INTRO_TITLE_LINES = ['DIVERSITY BEGINS', 'IN THE CODE.']
const INTRO_TITLE_BOX = computeBoldTitleBox(INTRO_TITLE_LINES)
const DETAIL_TITLE_LINES = ['FROM MANY LINES,', 'ONE STANDS OUT.']
const DETAIL_TITLE_BOX = computeBoldTitleBox(DETAIL_TITLE_LINES)
const ENTRY_DELAY_MS = 320
const DETAIL_COPY_DELAY_MS = 720

// Geometry for one pulse ring, in the SVG's 100x100 viewBox.
const PULSE_RADIUS = 49
const PULSE_NODE_RADIUS = 6.3
const PULSE_NODE_ANGLES = [0, 120, 240]
// A node of radius r sitting on an arc of radius R covers 2*asin(r/R) of it,
// about 15deg here. The arc gap is cut a few degrees wider so it stays clear
// of the node instead of grazing it — resize this whenever the nodes resize.
const PULSE_GAP_DEGREES = 20

function pointOnPulseRing(degrees) {
  const radians = (degrees * Math.PI) / 180
  return {
    x: Number((50 + Math.cos(radians) * PULSE_RADIUS).toFixed(2)),
    y: Number((50 + Math.sin(radians) * PULSE_RADIUS).toFixed(2)),
  }
}

const PULSE_NODES = PULSE_NODE_ANGLES.map((angle) => ({
  angle,
  ...pointOnPulseRing(angle),
}))

// Three drawn arcs rather than one dashed circle. The ring scales up via a CSS
// transform, and a dash pattern under `vector-effect: non-scaling-stroke` is
// measured in screen space while `pathLength` normalises against user space —
// so the dashes multiply as the ring grows. Arc geometry scales with the
// transform, keeping exactly three gaps at every size.
const PULSE_ARCS = PULSE_NODE_ANGLES.map((angle) => {
  const from = pointOnPulseRing(angle + PULSE_GAP_DEGREES / 2)
  const to = pointOnPulseRing(angle + 120 - PULSE_GAP_DEGREES / 2)
  return `M ${from.x} ${from.y} A ${PULSE_RADIUS} ${PULSE_RADIUS} 0 0 1 ${to.x} ${to.y}`
})

// A miniature helix inside each node ring, drawn as rungs: a line with a point
// at each end. Seen side-on, a rung's width tracks cos(phase), so spinning the
// helix about its vertical axis is a scaleX oscillation — and giving each rung
// a later phase makes the twist travel down it. Phase is expressed as a
// negative animation-delay, the same trick the pulse orbits use.
// The helix runs taller than the node ring and is clipped to it, so it reads
// as a strand passing through rather than a specimen boxed inside.
// Its width stays comfortably inside the node while remaining readable as the
// pulse ring expands.
const HELIX_RUNG_COUNT = 29
const HELIX_HALF_WIDTH = 1.7
const HELIX_HALF_HEIGHT = 9.1
const HELIX_POINT_RADIUS = 0.24
// A rung's width tracks |cos(phase)|, which repeats every 180deg, not 360 — so
// the strands pinch twice per full turn and what reads as one "section" is a
// half turn. Sections on show = (rungs the ring reveals) * step / 180, and the
// ring reveals about 19 rungs, so 13deg a rung shows about one and a half
// sections. Lines per section is 180 / step. Lowering the step therefore does
// both jobs at once: fewer sections, more lines in each.
const HELIX_PHASE_STEP_DEGREES = 13
const HELIX_SPIN_SECONDS = 16

const HELIX_RUNGS = Array.from({ length: HELIX_RUNG_COUNT }, (_, index) => {
  const span = (HELIX_HALF_HEIGHT * 2) / (HELIX_RUNG_COUNT - 1)
  const phaseTurns = (index * HELIX_PHASE_STEP_DEGREES) / 360
  return {
    y: Number((-HELIX_HALF_HEIGHT + index * span).toFixed(2)),
    delay: `${-(phaseTurns * HELIX_SPIN_SECONDS).toFixed(2)}s`,
  }
})

const PULSE_RING_COUNT = 3
const PULSE_DURATION_SECONDS = 16
const PULSE_SIGNAL_ARRIVAL_PROGRESS = 0.54
const ORBIT_BASE_DURATIONS_SECONDS = [25, 32, 39]
const ORBIT_DURATION_JITTER_SECONDS = 1.25
const ORBIT_UNIQUE_ANGLE_DEGREES = 360 / PULSE_NODES.length
const ORBIT_PHASE_JITTER_DEGREES = 5
const CORE_SIGNAL_INTERVAL_SECONDS = PULSE_DURATION_SECONDS / PULSE_RING_COUNT
const CORE_SIGNAL_FIRST_DELAY_SECONDS = Math.min(
  ...Array.from({ length: PULSE_RING_COUNT }, (_, index) => (
    (
      PULSE_SIGNAL_ARRIVAL_PROGRESS
      - index / PULSE_RING_COUNT
      + 1
    ) % 1 * PULSE_DURATION_SECONDS
  )),
)

function getPulseDelay(index) {
  return `${-(index * CORE_SIGNAL_INTERVAL_SECONDS).toFixed(3)}s`
}

function shuffled(values) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

// Pure randomness can cluster the threefold-symmetric node patterns. Spread
// phases across their visually unique 120-degree range, guarantee both rotation
// directions are represented, and vary speeds so near-alignment keeps drifting.
// A fresh constrained set is rolled before every detail opening.
function createPulseOrbits() {
  const majorityDirection = Math.random() < 0.5 ? 'normal' : 'reverse'
  const minorityDirection = majorityDirection === 'normal' ? 'reverse' : 'normal'
  const directions = shuffled([
    majorityDirection,
    majorityDirection,
    minorityDirection,
  ])
  const durations = shuffled(ORBIT_BASE_DURATIONS_SECONDS.map((duration) => (
    duration
      + (Math.random() * 2 - 1) * ORBIT_DURATION_JITTER_SECONDS
  )))
  const phaseStep = ORBIT_UNIQUE_ANGLE_DEGREES / PULSE_RING_COUNT
  const phaseBase = Math.random() * ORBIT_UNIQUE_ANGLE_DEGREES
  const phases = shuffled(Array.from({ length: PULSE_RING_COUNT }, (_, index) => (
    (
      phaseBase
      + index * phaseStep
      + (Math.random() * 2 - 1) * ORBIT_PHASE_JITTER_DEGREES
      + ORBIT_UNIQUE_ANGLE_DEGREES
    ) % ORBIT_UNIQUE_ANGLE_DEGREES
  )))

  return Array.from({ length: PULSE_RING_COUNT }, (_, index) => {
    const duration = durations[index]
    const phaseDelay = (phases[index] / 360) * duration
    return {
      delay: `${-phaseDelay.toFixed(2)}s`,
      direction: directions[index],
      duration: `${duration.toFixed(2)}s`,
      highlightNodeIndex: Math.floor(Math.random() * PULSE_NODES.length),
    }
  })
}

export function GeneticsIntro({
  fallback,
  geneticsDetailOpen,
  setGeneticsDetailOpen,
}) {
  const experienceRef = useRef(null)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const replayFrame = useRef(0)
  const replayTimer = useRef(0)
  const detailReplayFrame = useRef(0)
  const detailReplayTimer = useRef(0)
  const restoreTriggerFocus = useRef(false)
  const titleParticles = useRef(null)
  const detailTitleParticles = useRef(null)
  const [introState, setIntroState] = useState(fallback ? 'playing' : 'waiting')
  const [introEffectsActive, setIntroEffectsActive] = useState(fallback)
  const [detailIntroState, setDetailIntroState] = useState(
    fallback ? 'complete' : 'waiting',
  )
  const [controlsReady, setControlsReady] = useState(fallback)
  const [pulseOrbits, setPulseOrbits] = useState(createPulseOrbits)
  const helixClipId = useId()

  const openDetail = () => {
    setPulseOrbits(createPulseOrbits())
    setGeneticsDetailOpen(true)
  }

  const replayIntro = useCallback(() => {
    setIntroEffectsActive(true)
    titleParticles.current?.setHoldActive(false)
    titleParticles.current?.park()
    setControlsReady(false)
    setIntroState('waiting')

    cancelAnimationFrame(replayFrame.current)
    window.clearTimeout(replayTimer.current)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIntroState('playing')
      return
    }

    replayTimer.current = window.setTimeout(() => {
      replayFrame.current = requestAnimationFrame(() => setIntroState('playing'))
    }, ENTRY_DELAY_MS)
  }, [])

  const pauseIntroEffects = useCallback(() => {
    titleParticles.current?.setHoldActive(false)
    titleParticles.current?.park()
    setIntroEffectsActive(false)
  }, [])

  const resetDetailForSceneExit = useCallback(() => {
    pauseIntroEffects()
    setGeneticsDetailOpen(false)
    setDetailIntroState(fallback ? 'complete' : 'waiting')
    restoreTriggerFocus.current = false

    if (
      experienceRef.current?.contains(document.activeElement)
      && document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur()
    }
  }, [fallback, pauseIntroEffects, setGeneticsDetailOpen])

  useEffect(() => {
    const sceneLayer = experienceRef.current?.closest('[data-scene-layer]')
    if (!sceneLayer || fallback) return undefined

    sceneLayer.addEventListener(GENETICS_INTRO_ENTER_EVENT, replayIntro)
    sceneLayer.addEventListener(GENETICS_INTRO_EXIT_EVENT, pauseIntroEffects)
    sceneLayer.addEventListener(SCENE_VISIBILITY_ENTER_EVENT, replayIntro)
    sceneLayer.addEventListener(
      SCENE_DOMINANCE_EXIT_EVENT,
      resetDetailForSceneExit,
    )
    return () => {
      cancelAnimationFrame(replayFrame.current)
      window.clearTimeout(replayTimer.current)
      sceneLayer.removeEventListener(GENETICS_INTRO_ENTER_EVENT, replayIntro)
      sceneLayer.removeEventListener(GENETICS_INTRO_EXIT_EVENT, pauseIntroEffects)
      sceneLayer.removeEventListener(SCENE_VISIBILITY_ENTER_EVENT, replayIntro)
      sceneLayer.removeEventListener(
        SCENE_DOMINANCE_EXIT_EVENT,
        resetDetailForSceneExit,
      )
    }
  }, [fallback, pauseIntroEffects, replayIntro, resetDetailForSceneExit])

  useEffect(() => {
    if (fallback || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setControlsReady(true)
      return undefined
    }

    if (introState === 'waiting') setControlsReady(false)
    return undefined
  }, [fallback, introState])

  useEffect(() => {
    cancelAnimationFrame(detailReplayFrame.current)
    window.clearTimeout(detailReplayTimer.current)

    if (!geneticsDetailOpen) {
      setDetailIntroState(fallback ? 'complete' : 'waiting')
      return undefined
    }

    detailTitleParticles.current?.setHoldActive(false)
    detailTitleParticles.current?.park()

    const reducedMotion = fallback
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setDetailIntroState('complete')
      requestAnimationFrame(() => closeRef.current?.focus())
      return undefined
    }

    setDetailIntroState('waiting')
    detailReplayTimer.current = window.setTimeout(() => {
      detailReplayFrame.current = requestAnimationFrame(() => {
        setDetailIntroState('playing')
        closeRef.current?.focus()
      })
    }, DETAIL_COPY_DELAY_MS)

    return () => {
      cancelAnimationFrame(detailReplayFrame.current)
      window.clearTimeout(detailReplayTimer.current)
    }
  }, [fallback, geneticsDetailOpen])

  useEffect(() => {
    if (!geneticsDetailOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setGeneticsDetailOpen(false)
      restoreTriggerFocus.current = true
      replayIntro()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [geneticsDetailOpen, replayIntro, setGeneticsDetailOpen])

  const closeDetail = () => {
    setGeneticsDetailOpen(false)
    restoreTriggerFocus.current = true
    replayIntro()
  }

  const handleIntroOuterRingComplete = (event) => {
    if (event.target !== event.currentTarget) return
    setControlsReady(true)

    if (restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false
      requestAnimationFrame(() => triggerRef.current?.focus())
    }
  }

  return (
    <div
      className={styles.geneticsExperience}
      data-detail-open={geneticsDetailOpen ? 'true' : 'false'}
      ref={experienceRef}
    >
      <div
        className={styles.geneticsIntro}
        data-controls-ready={controlsReady ? 'true' : 'false'}
        data-intro-state={introState}
        aria-hidden={geneticsDetailOpen}
        inert={geneticsDetailOpen}
      >
        <div className={styles.geneticsIntroCopy}>
          <p className={styles.geneticsEyebrow}>The genetic foundation</p>
          <TitleParticleText
            ref={titleParticles}
            as="h2"
            baseline={INTRO_TITLE_BOX.baseline}
            className={styles.geneticsTitleLines}
            effectsEnabled={introEffectsActive && introState === 'complete'}
            fontSize={BOLD_TITLE_FONT_SIZE}
            fontWeight={BOLD_TITLE_FONT_WEIGHT}
            headingId="genetics-title"
            introState={introState}
            letterSpacing={BOLD_TITLE_LETTER_SPACING}
            lineHeight={BOLD_TITLE_LINE_HEIGHT}
            lines={INTRO_TITLE_LINES}
            onIntroComplete={() => setIntroState('complete')}
            outlineColor="rgb(255 255 255 / 72%)"
            outlineHighlights
            outlineWidth={0.8}
            seed={6211}
            style={{
              '--title-reveal-delay': `${LANDING_INTRO.titleDelayMs}ms`,
              '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
            }}
            text="Diversity begins in the code."
            textAlign="left"
            textColor="#fff"
            viewBoxHeight={INTRO_TITLE_BOX.viewBoxHeight}
            viewBoxWidth={INTRO_TITLE_BOX.viewBoxWidth}
          />
          <p className={styles.geneticsIntroBody}>
            <span>
              Every wheat line carries a different combination of traits. We begin
              by tracing the genetic patterns that shape each candidate.
            </span>
          </p>
        </div>

        <div className={styles.geneticsActionOrbit}>
          <svg
            className={styles.geneticsActionRings}
            viewBox="0 0 140 140"
            aria-hidden="true"
          >
            <circle
              className={styles.geneticsActionOuterRing}
              cx="70"
              cy="70"
              r="66"
              pathLength="1"
              onAnimationEnd={handleIntroOuterRingComplete}
            />
            <circle
              className={styles.geneticsActionInnerRing}
              cx="70"
              cy="70"
              r="58"
              pathLength="1"
            />
            <circle
              className={styles.geneticsActionHighlight}
              cx="70"
              cy="70"
              r="66"
              pathLength="1"
            />
          </svg>
          <button
            ref={triggerRef}
            className={styles.geneticsAction}
            type="button"
            disabled={!controlsReady}
            onClick={openDetail}
          >
            <span>Explore the strands</span>
          </button>
        </div>
      </div>

      <div
        className={styles.geneticsDetail}
        data-intro-state={detailIntroState}
        aria-hidden={!geneticsDetailOpen}
        inert={!geneticsDetailOpen}
      >
        {/* The miniature helix duration is shared; orbit durations and matching
            phase delays live on their individual pulse rings. */}
        <div
          className={styles.geneticsDetailRings}
          aria-hidden="true"
          style={{
            '--genetics-core-signal-delay': `${CORE_SIGNAL_FIRST_DELAY_SECONDS.toFixed(3)}s`,
            '--genetics-core-signal-interval': `${CORE_SIGNAL_INTERVAL_SECONDS.toFixed(3)}s`,
            '--genetics-helix-spin': `${HELIX_SPIN_SECONDS}s`,
            '--genetics-pulse-duration': `${PULSE_DURATION_SECONDS}s`,
            // How far a point swings each way — the bond's half-length, so the
            // two stay welded together as the strand turns.
            '--genetics-helix-reach': `${HELIX_HALF_WIDTH}px`,
          }}
        >
          <span className={styles.geneticsDetailCoreRing} />
          {pulseOrbits.map((orbit, index) => (
            <span
              key={`connection-${index}`}
              className={styles.geneticsDetailConnectionAnchor}
              style={{
                '--genetics-signal-node-angle': `${
                  PULSE_NODES[orbit.highlightNodeIndex].angle
                }deg`,
              }}
            >
              <span
                className={styles.geneticsDetailConnectionOrbit}
                style={{
                  '--genetics-pulse-delay': getPulseDelay(index),
                  '--genetics-orbit-delay': orbit.delay,
                  '--genetics-orbit-direction': orbit.direction,
                  '--genetics-orbit-spin': orbit.duration,
                }}
              >
                <span className={styles.geneticsDetailConnectionLine} />
              </span>
            </span>
          ))}
          {pulseOrbits.map((orbit, index) => (
            <span
              key={index}
              className={styles.geneticsDetailPulseRing}
              style={{
                '--genetics-pulse-delay': getPulseDelay(index),
                '--genetics-orbit-delay': orbit.delay,
                '--genetics-orbit-direction': orbit.direction,
                '--genetics-orbit-spin': orbit.duration,
              }}
            >
              <svg
                className={styles.geneticsDetailPulseOrbit}
                viewBox="0 0 100 100"
              >
                {/* userSpaceOnUse (the default) resolves this against the
                    referencing element's space, so one circle at the origin
                    clips all three nodes in their own translated frames. */}
                <defs>
                  <clipPath id={`${helixClipId}-${index}`}>
                    <circle r={PULSE_NODE_RADIUS} />
                  </clipPath>
                </defs>
                {PULSE_ARCS.map((arc) => (
                  <path
                    key={arc}
                    className={styles.geneticsDetailPulseArc}
                    d={arc}
                  />
                ))}
                {PULSE_NODES.map((node, nodeIndex) => (
                  <g key={node.angle} transform={`translate(${node.x} ${node.y})`}>
                    <circle
                      className={[
                        styles.geneticsDetailPulseNode,
                        nodeIndex === orbit.highlightNodeIndex
                          ? styles.geneticsDetailPulseNodeAccent
                          : '',
                      ].filter(Boolean).join(' ')}
                      r={PULSE_NODE_RADIUS}
                    />
                    <g clipPath={`url(#${helixClipId}-${index})`}>
                      {HELIX_RUNGS.map((rung) => (
                        // Plain group: its only job is to hand one phase down
                        // to the bond and both points as an inherited variable.
                        <g
                          key={rung.y}
                          style={{ '--genetics-helix-delay': rung.delay }}
                        >
                          <line
                            className={styles.geneticsDetailHelixBond}
                            x1={-HELIX_HALF_WIDTH}
                            y1={rung.y}
                            x2={HELIX_HALF_WIDTH}
                            y2={rung.y}
                          />
                          <circle
                            className={styles.geneticsDetailHelixPoint}
                            cy={rung.y}
                            r={HELIX_POINT_RADIUS}
                          />
                          <circle
                            className={[
                              styles.geneticsDetailHelixPoint,
                              styles.geneticsDetailHelixPointBack,
                            ].join(' ')}
                            cy={rung.y}
                            r={HELIX_POINT_RADIUS}
                          />
                        </g>
                      ))}
                    </g>
                  </g>
                ))}
              </svg>
            </span>
          ))}
        </div>

        <div className={styles.geneticsDetailCopy}>
          <p className={styles.geneticsDetailEyebrow}>Candidate selection</p>
          <TitleParticleText
            ref={detailTitleParticles}
            as="h2"
            baseline={DETAIL_TITLE_BOX.baseline}
            className={styles.geneticsDetailTitle}
            effectsEnabled={detailIntroState === 'complete'}
            fontSize={BOLD_TITLE_FONT_SIZE}
            fontWeight={BOLD_TITLE_FONT_WEIGHT}
            headingId="genetics-detail-title"
            introState={detailIntroState}
            letterSpacing={BOLD_TITLE_LETTER_SPACING}
            lineHeight={BOLD_TITLE_LINE_HEIGHT}
            lines={DETAIL_TITLE_LINES}
            onIntroComplete={() => setDetailIntroState('complete')}
            outlineColor="rgb(255 255 255 / 72%)"
            outlineHighlights
            outlineWidth={0.8}
            seed={6947}
            style={{
              '--title-reveal-delay': '80ms',
              '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
            }}
            text="From many lines, one stands out."
            textAlign="left"
            textColor="#fff"
            viewBoxHeight={DETAIL_TITLE_BOX.viewBoxHeight}
            viewBoxWidth={DETAIL_TITLE_BOX.viewBoxWidth}
          />
          <p className={styles.geneticsDetailBody}>
            <span>
              Each candidate carries a distinct combination of traits. Comparing
              those patterns helps focus attention on the lines worth carrying
              forward.
            </span>
          </p>
        </div>

        <button
          ref={closeRef}
          className={styles.geneticsDetailClose}
          type="button"
          aria-label="Close genetics detail"
          onClick={closeDetail}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  )
}
