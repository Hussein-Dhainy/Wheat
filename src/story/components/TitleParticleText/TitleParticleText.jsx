import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef } from 'react'
import styles from './TitleParticleText.module.css'

// Every radius/distance below was tuned by eye against a 127px title (the
// original landing title, at Inter's proportions). Deriving them from a
// single scale factor lets each instance pick its own font size while
// keeping the hover "hole" and particle spotlight proportional to it.
const EFFECT_TUNING_FONT_SIZE = 127
const BASE_EFFECT_RADIUS = 96
const BASE_ACTIVATION_MARGIN = 19
const BASE_OUTER_MARGIN = 6
const BASE_CLIP_MARGIN = 18
const BASE_INNER_RADIUS = 29
const BASE_INNER_CAPTURE_MARGIN = 11
const BASE_RING_SWITCH_HYSTERESIS = 7
// Each particle rests at its ring's radius plus its own fixed offset in
// this +/- range, so the ring reads as a scattered band instead of every
// particle lining up on the exact same circle.
const BASE_RADIAL_JITTER = 9
const BASE_LINK_SOURCE_DISTANCE = 54
const BASE_LINK_SNAP_DISTANCE = 96
const BASE_LINK_RELEASE_DISTANCE = 108
const MAX_PARTICLES = 410
const MAX_LINKS = 320

// Exponential-decay time constants approximating the old CSS transition
// durations (420ms position ease, 120-160ms opacity fade) without needing a
// real CSS transition — see the canvas draw loop below.
const POSITION_EASE_TAU = 0.1
const OPACITY_EASE_TAU = 0.045
const HOLD_RADIUS_EASE_TAU = 0.12
const HOLD_RADIUS_SCALE = 2
const HOLD_RADIUS_SETTLE_EPSILON = 0.002
const SETTLE_OPACITY_EPSILON = 0.003
const MAX_FRAME_DELTA_SECONDS = 0.1
const OUTLINE_HIGHLIGHT_DASH_LENGTH = 48
const OUTLINE_HIGHLIGHT_GAP_LENGTH = 260
const OUTLINE_HIGHLIGHT_SPEED = 30
const OUTLINE_HIGHLIGHT_STROKE_PX = 2.6
const OUTLINE_HIGHLIGHT_OPACITY = 0.88

function computeEffectConfig({
  baseline,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  text,
  viewBoxHeight,
  viewBoxWidth,
}) {
  const scale = fontSize / EFFECT_TUNING_FONT_SIZE
  const effectRadius = BASE_EFFECT_RADIUS * scale
  const outerRadius = effectRadius + BASE_OUTER_MARGIN * scale
  const clipRadius = outerRadius + BASE_CLIP_MARGIN * scale
  const activationRadius = effectRadius + BASE_ACTIVATION_MARGIN * scale
  const innerRadius = BASE_INNER_RADIUS * scale
  const outlineHighlightDashLength = OUTLINE_HIGHLIGHT_DASH_LENGTH * scale
  const outlineHighlightGapLength = OUTLINE_HIGHLIGHT_GAP_LENGTH * scale

  return {
    activationRadius,
    baseline,
    clipRadius,
    effectRadius,
    fontFamily,
    fontSize,
    fontWeight,
    innerCaptureRadius: innerRadius + BASE_INNER_CAPTURE_MARGIN * scale,
    innerRadius,
    letterSpacing,
    linkReleaseDistance: BASE_LINK_RELEASE_DISTANCE * scale,
    linkSnapDistance: BASE_LINK_SNAP_DISTANCE * scale,
    linkSourceDistance: BASE_LINK_SOURCE_DISTANCE * scale,
    outerRadius,
    outlineHighlightCycle: outlineHighlightDashLength + outlineHighlightGapLength,
    outlineHighlightDashPattern: [
      outlineHighlightDashLength,
      outlineHighlightGapLength,
    ],
    outlineHighlightSpeed: OUTLINE_HIGHLIGHT_SPEED * scale,
    parkedPointer: -clipRadius - activationRadius,
    radialJitter: BASE_RADIAL_JITTER * scale,
    ringSwitchHysteresis: BASE_RING_SWITCH_HYSTERESIS * scale,
    text,
    viewBoxHeight,
    viewBoxWidth,
  }
}

function createSeededRandom(seed) {
  let value = seed >>> 0

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function step(edge, value) {
  return value < edge ? 0 : 1
}

// Canvas measurement needs the real web font already loaded, or it silently
// samples against whatever fallback is currently active.
function ensureFontLoaded(config) {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()

  return document.fonts
    .load(`${config.fontWeight} ${config.fontSize}px '${config.fontFamily}'`)
    .catch(() => {})
}

function configureContext(context, config) {
  context.font = `${config.fontWeight} ${config.fontSize}px '${config.fontFamily}', Inter, system-ui, sans-serif`
  context.fontKerning = 'none'
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  if ('letterSpacing' in context) {
    context.letterSpacing = `${config.letterSpacing}px`
  }
}

function drawOutlineHighlights(
  context,
  config,
  lines,
  lineHeight,
  textAlign,
  centerX,
  centerY,
  elapsedSeconds,
  radiusScale,
  unitsPerCssPixel,
  reducedMotion,
) {
  const textX = textAlign === 'left' ? 0 : config.viewBoxWidth / 2
  const firstOffset = reducedMotion
    ? 0
    : -(elapsedSeconds * config.outlineHighlightSpeed)
      % config.outlineHighlightCycle

  context.save()
  context.beginPath()
  context.arc(centerX, centerY, config.effectRadius * radiusScale, 0, Math.PI * 2)
  context.clip()
  configureContext(context, config)
  context.textAlign = textAlign
  context.fillStyle = 'transparent'
  context.strokeStyle = '#fff'
  context.globalAlpha = OUTLINE_HIGHLIGHT_OPACITY
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = OUTLINE_HIGHLIGHT_STROKE_PX * unitsPerCssPixel
  context.setLineDash(config.outlineHighlightDashPattern)

  context.lineDashOffset = firstOffset
  for (let index = 0; index < lines.length; index += 1) {
    context.strokeText(lines[index], textX, config.baseline + index * lineHeight)
  }

  context.lineDashOffset = firstOffset - config.outlineHighlightCycle * 0.5
  for (let index = 0; index < lines.length; index += 1) {
    context.strokeText(lines[index], textX, config.baseline + index * lineHeight)
  }

  context.restore()
}

function createLinks(particles, config) {
  const links = []
  const linkedIndices = new Set()

  for (let startIndex = 0; startIndex < particles.length; startIndex += 1) {
    if (links.length >= MAX_LINKS || startIndex % 2 !== 0 || linkedIndices.has(startIndex)) continue

    let closestIndex = -1
    let closestDistance = config.linkSourceDistance

    for (let endIndex = startIndex + 1; endIndex < particles.length; endIndex += 1) {
      if (linkedIndices.has(endIndex)) continue

      const deltaX = particles[startIndex].x - particles[endIndex].x
      const deltaY = particles[startIndex].y - particles[endIndex].y
      const distance = Math.hypot(deltaX, deltaY)

      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = endIndex
      }
    }

    if (closestIndex < 0) continue

    particles[startIndex].linked = true
    particles[closestIndex].linked = true
    linkedIndices.add(startIndex)
    linkedIndices.add(closestIndex)
    links.push({
      endIndex: closestIndex,
      startIndex,
    })
  }

  return links
}

function sampleParticleData(config, seed, lines, lineHeight, textAlign) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const random = createSeededRandom(seed)
  const particles = []

  if (!context) return { links: [], particles: [] }

  canvas.width = config.viewBoxWidth
  canvas.height = config.viewBoxHeight
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#fff'
  configureContext(context, config)
  context.textAlign = textAlign
  const textX = textAlign === 'left' ? 0 : config.viewBoxWidth / 2
  lines.forEach((line, index) => {
    context.fillText(line, textX, config.baseline + index * lineHeight)
  })

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data

  // The 7px/5px grid and jitter below were tuned for the 127px reference
  // size. Scaling them with the instance's own font size keeps particle
  // density consistent — without this, a smaller (e.g. mobile-scaled)
  // instance samples the same coarse grid over a proportionally smaller
  // letterform, leaving visibly sparser, patchier coverage.
  const sampleScale = config.fontSize / EFFECT_TUNING_FONT_SIZE
  const gridStep = Math.max(3, Math.round(7 * sampleScale))
  const jitter = 5 * sampleScale

  for (let y = 6; y < canvas.height - 6; y += gridStep) {
    for (let x = 6; x < canvas.width - 6; x += gridStep) {
      const sampleX = Math.min(canvas.width - 1, Math.round(x + (random() - 0.5) * jitter))
      const sampleY = Math.min(canvas.height - 1, Math.round(y + (random() - 0.5) * jitter))
      const alpha = pixels[(sampleY * canvas.width + sampleX) * 4 + 3]

      if (alpha > 80 && random() > 0.42) {
        const sizeVariation = random()
        const shade = 218 + Math.round(random() * 37)

        particles.push({
          x: sampleX,
          y: sampleY,
          radius: 0.8 + Math.pow(sizeVariation, 1.45) * 3.8,
          color: `rgb(${shade} ${shade} ${shade})`,
          linked: false,
          phase: random() * Math.PI * 2,
          radialJitter: (random() - 0.5) * 2 * config.radialJitter,
          driftX: (random() - 0.5) * 18,
          driftY: (random() - 0.5) * 18,
          driftFrequency: 1 / (2.2 + random() * 2.4),
          driftPhaseOffset: random() * -4.6,
        })
      }
    }
  }

  for (let index = particles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const temporary = particles[index]
    particles[index] = particles[swapIndex]
    particles[swapIndex] = temporary
  }

  const sampledParticles = particles.slice(0, MAX_PARTICLES)

  return {
    links: createLinks(sampledParticles, config),
    particles: sampledParticles,
  }
}

function lerpTowards(current, target, dt, tau) {
  if (dt <= 0) return current
  const decay = 1 - Math.exp(-dt / tau)
  return current + (target - current) * decay
}

function clearParticleCanvas(context, width, height, padding) {
  context.clearRect(-padding, -padding, width + padding * 2, height + padding * 2)
}

function getReducedMotionQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia('(prefers-reduced-motion: reduce)')
}

export const TitleParticleText = forwardRef(function TitleParticleText({
  as: HeadingTag = 'h2',
  baseline,
  className = '',
  fontFamily = 'Inter',
  fontSize,
  fontWeight = 400,
  effectsEnabled = true,
  headingId,
  // When false, this instance doesn't attach its own pointer listeners —
  // a parent that wants a larger hover area (e.g. reacting to the whole
  // section, not just the tight title bounds) drives it instead via the
  // imperative handle (applyPointerPosition/park/element) exposed below.
  interactive = true,
  letterSpacing = -2,
  // Multi-line mode: pass `lines` (the strings actually drawn/sampled,
  // e.g. already-uppercased display text) alongside `text` (the full
  // sentence used only for the accessible heading). Single-line callers
  // just pass `text` and lines defaults to that one line, unchanged from
  // before.
  lineHeight,
  lines,
  introState = 'complete',
  onIntroComplete,
  outlineColor = 'rgb(245 241 231 / 72%)',
  outlineHighlights = false,
  outlineWidth = 0,
  seed = 6197,
  style,
  text,
  textAlign = 'center',
  textColor = '#f5f1e7',
  viewBoxHeight,
  viewBoxWidth,
}, forwardedRef) {
  const config = computeEffectConfig({
    baseline,
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    text,
    viewBoxHeight,
    viewBoxWidth,
  })
  const particleCanvasPadding = config.clipRadius * HOLD_RADIUS_SCALE
  const particleCanvasWidth = viewBoxWidth + particleCanvasPadding * 2
  const particleCanvasHeight = viewBoxHeight + particleCanvasPadding * 2
  const displayLines = useMemo(() => lines ?? [text], [lines, text])
  const resolvedLineHeight = lineHeight ?? fontSize

  const uid = useId()
  const wrapper = useRef()
  const reveal = useRef()
  const outlineReveal = useRef()
  const canvas = useRef()
  const particlesData = useRef([])
  const linksData = useRef([])
  const renderState = useRef([])
  const linkOpacity = useRef([])
  const pointer = useRef({ x: config.parkedPointer, y: config.parkedPointer })
  const radiusScale = useRef(1)
  const targetRadiusScale = useRef(1)
  const rafId = useRef(null)
  const lastFrameTime = useRef(0)
  const reducedMotion = useRef(false)
  const unitsPerCssPixel = useRef(1)

  // Sampling (drawing the text to an offscreen canvas and reading alpha to
  // seed particle positions) only needs to happen once per text/font change —
  // it isn't part of the per-frame cost this component cares about.
  useEffect(() => {
    let cancelled = false

    ensureFontLoaded(config).then(() => {
      if (cancelled) return

      const sampled = sampleParticleData(config, seed, displayLines, resolvedLineHeight, textAlign)
      particlesData.current = sampled.particles
      linksData.current = sampled.links
      renderState.current = sampled.particles.map((particle) => ({
        opacity: 0,
        ring: null,
        x: particle.x,
        y: particle.y,
      }))
      linkOpacity.current = sampled.links.map(() => 0)
      drawFrame(0)
    })

    return () => {
      cancelled = true
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline, displayLines, fontFamily, fontSize, fontWeight, letterSpacing, resolvedLineHeight, seed, text, textAlign, viewBoxHeight, viewBoxWidth])

  useEffect(() => {
    const query = getReducedMotionQuery()
    if (!query) return undefined

    const updatePreference = () => {
      reducedMotion.current = query.matches
    }

    updatePreference()
    query.addEventListener('change', updatePreference)
    return () => query.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (introState !== 'playing' || !getReducedMotionQuery()?.matches) return undefined

    const frameId = requestAnimationFrame(() => onIntroComplete?.())
    return () => cancelAnimationFrame(frameId)
  }, [introState, onIntroComplete])

  useEffect(() => {
    if (effectsEnabled) return

    pointer.current.x = config.parkedPointer
    pointer.current.y = config.parkedPointer
    radiusScale.current = 1
    targetRadiusScale.current = 1
    reveal.current?.setAttribute('cx', config.parkedPointer)
    reveal.current?.setAttribute('cy', config.parkedPointer)
    reveal.current?.setAttribute('r', config.effectRadius)
    outlineReveal.current?.setAttribute('cx', config.parkedPointer)
    outlineReveal.current?.setAttribute('cy', config.parkedPointer)
    outlineReveal.current?.setAttribute('r', config.effectRadius)

    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }

    renderState.current.forEach((state, index) => {
      const particle = particlesData.current[index]
      state.opacity = 0
      state.ring = null
      if (particle) {
        state.x = particle.x
        state.y = particle.y
      }
    })
    linkOpacity.current.fill(0)
    const context = canvas.current?.getContext('2d')
    if (context) {
      clearParticleCanvas(
        context,
        viewBoxWidth,
        viewBoxHeight,
        particleCanvasPadding,
      )
    }
    wrapper.current?.classList.remove(styles.spotlightActive)
  }, [config.parkedPointer, effectsEnabled, particleCanvasPadding, viewBoxHeight, viewBoxWidth])

  // Resizes the canvas backing store to the element's actual on-screen
  // pixels (capped, in line with the WebGL canvas's own dpr cap) so drawing
  // stays crisp without paying for resolution nobody can see.
  useEffect(() => {
    const canvasElement = canvas.current
    if (!canvasElement) return undefined

    const applySize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const renderedWidth = wrapper.current?.getBoundingClientRect().width ?? 0
      unitsPerCssPixel.current = renderedWidth > 0
        ? viewBoxWidth / renderedWidth
        : 1
      canvasElement.width = Math.max(1, Math.round(particleCanvasWidth * dpr))
      canvasElement.height = Math.max(1, Math.round(particleCanvasHeight * dpr))
      const context = canvasElement.getContext('2d')
      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        particleCanvasPadding * dpr,
        particleCanvasPadding * dpr,
      )
      drawFrame(0)
    }

    applySize()
    window.addEventListener('resize', applySize)
    return () => window.removeEventListener('resize', applySize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleCanvasHeight, particleCanvasPadding, particleCanvasWidth, viewBoxHeight, viewBoxWidth])

  function drawFrame(deltaSeconds) {
    const context = canvas.current?.getContext('2d')
    if (!context) return true

    if (!effectsEnabled) {
      clearParticleCanvas(context, viewBoxWidth, viewBoxHeight, particleCanvasPadding)
      return false
    }

    const centerX = pointer.current.x
    const centerY = pointer.current.y
    radiusScale.current = reducedMotion.current
      ? targetRadiusScale.current
      : lerpTowards(
        radiusScale.current,
        targetRadiusScale.current,
        deltaSeconds,
        HOLD_RADIUS_EASE_TAU,
      )
    if (Math.abs(radiusScale.current - targetRadiusScale.current) <= HOLD_RADIUS_SETTLE_EPSILON) {
      radiusScale.current = targetRadiusScale.current
    }
    const currentRadiusScale = radiusScale.current
    const revealRadius = config.effectRadius * currentRadiusScale
    const radiusIsSettling = currentRadiusScale !== targetRadiusScale.current

    reveal.current?.setAttribute('r', revealRadius)
    outlineReveal.current?.setAttribute('r', revealRadius)

    const isWithinBounds = centerX >= 0 && centerX <= viewBoxWidth
      && centerY >= 0 && centerY <= viewBoxHeight
    const particles = particlesData.current
    const states = renderState.current
    let anyVisible = false

    clearParticleCanvas(context, viewBoxWidth, viewBoxHeight, particleCanvasPadding)
    context.save()
    context.beginPath()
    context.arc(centerX, centerY, config.clipRadius * currentRadiusScale, 0, Math.PI * 2)
    context.clip()

    if (outlineHighlights && isWithinBounds) {
      drawOutlineHighlights(
        context,
        config,
        displayLines,
        resolvedLineHeight,
        textAlign,
        centerX,
        centerY,
        lastFrameTime.current / 1000,
        currentRadiusScale,
        unitsPerCssPixel.current,
        reducedMotion.current,
      )
    }

    context.globalCompositeOperation = 'lighter'

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index]
      const renderedState = states[index]
      const deltaX = particle.x - centerX
      const deltaY = particle.y - centerY
      const distance = Math.hypot(deltaX, deltaY)
      const activationRadius = config.activationRadius * currentRadiusScale

      let targetX = particle.x
      let targetY = particle.y
      let targetOpacity = 0
      let targetRing = null

      if (distance < activationRadius) {
        const fallbackAngle = particle.phase
        const baseAngle = distance > 0.001 ? Math.atan2(deltaY, deltaX) : fallbackAngle
        const angle = baseAngle + Math.sin(particle.phase) * 0.035
        const outerRadius = config.outerRadius * currentRadiusScale - particle.radius
        const innerCaptureRadius = config.innerCaptureRadius
        const ringSwitchHysteresis = config.ringSwitchHysteresis
        const prefersOuterRing = step(innerCaptureRadius, distance)
        targetRing = prefersOuterRing ? 'outer' : 'inner'

        if (renderedState.ring === 'inner' && distance < innerCaptureRadius + ringSwitchHysteresis) {
          targetRing = 'inner'
        } else if (renderedState.ring === 'outer' && distance > innerCaptureRadius - ringSwitchHysteresis) {
          targetRing = 'outer'
        }

        const targetRadius = (targetRing === 'inner'
          ? config.innerRadius * currentRadiusScale
          : outerRadius)
          + particle.radialJitter
        targetX = centerX + Math.cos(angle) * targetRadius
        targetY = centerY + Math.sin(angle) * targetRadius
        const overlap = 1 - distance / activationRadius
        targetOpacity = Math.min(1, 0.3 + overlap * 1.45)
      }

      renderedState.ring = targetRing
      if (reducedMotion.current) {
        renderedState.x = targetX
        renderedState.y = targetY
      } else {
        renderedState.x = lerpTowards(renderedState.x, targetX, deltaSeconds, POSITION_EASE_TAU)
        renderedState.y = lerpTowards(renderedState.y, targetY, deltaSeconds, POSITION_EASE_TAU)
      }
      renderedState.opacity = lerpTowards(renderedState.opacity, targetOpacity, deltaSeconds, OPACITY_EASE_TAU)

      if (renderedState.opacity <= SETTLE_OPACITY_EPSILON) continue

      anyVisible = true

      // Drift only matters for particles that are actually visible right
      // now, so idle/off-screen particles skip the trig entirely.
      let drawX = renderedState.x
      let drawY = renderedState.y
      if (!particle.linked && !reducedMotion.current) {
        const driftPhase = (lastFrameTime.current / 1000 + particle.driftPhaseOffset)
          * particle.driftFrequency * Math.PI * 2 + particle.phase
        const driftFactor = Math.sin(driftPhase)
        drawX += particle.driftX * driftFactor
        drawY += particle.driftY * driftFactor
      }

      context.globalAlpha = renderedState.opacity
      context.fillStyle = particle.color
      context.beginPath()
      context.arc(drawX, drawY, particle.radius, 0, Math.PI * 2)
      context.fill()
    }

    const links = linksData.current
    const opacities = linkOpacity.current
    context.lineCap = 'round'
    context.strokeStyle = 'rgb(255 255 255 / 72%)'
    context.lineWidth = 0.85

    for (let index = 0; index < links.length; index += 1) {
      const link = links[index]
      const start = states[link.startIndex]
      const end = states[link.endIndex]
      const startVisible = start.opacity > SETTLE_OPACITY_EPSILON
      const endVisible = end.opacity > SETTLE_OPACITY_EPSILON
      let targetOpacity = 0

      if (startVisible && endVisible) {
        const linkDistance = Math.hypot(start.x - end.x, start.y - end.y)
        const wasLinked = opacities[index] > SETTLE_OPACITY_EPSILON
        const distanceLimit = (wasLinked ? config.linkReleaseDistance : config.linkSnapDistance)
          * currentRadiusScale

        if (linkDistance <= distanceLimit) {
          const releaseDistance = config.linkReleaseDistance * currentRadiusScale
          const proximity = 1 - Math.min(linkDistance, releaseDistance) / releaseDistance
          targetOpacity = 0.18 + proximity * 0.38
        }
      }

      opacities[index] = reducedMotion.current
        ? targetOpacity
        : lerpTowards(opacities[index], targetOpacity, deltaSeconds, OPACITY_EASE_TAU)

      if (opacities[index] <= SETTLE_OPACITY_EPSILON) continue

      anyVisible = true
      context.globalAlpha = opacities[index]
      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, end.y)
      context.stroke()
    }

    context.restore()

    return isWithinBounds || anyVisible || radiusIsSettling
  }

  function startLoop() {
    if (!effectsEnabled || rafId.current) return

    wrapper.current?.classList.add(styles.spotlightActive)
    lastFrameTime.current = performance.now()

    const tick = (time) => {
      const deltaSeconds = Math.min(
        MAX_FRAME_DELTA_SECONDS,
        Math.max(0, (time - lastFrameTime.current) / 1000),
      )
      lastFrameTime.current = time

      const shouldContinue = drawFrame(deltaSeconds)

      if (shouldContinue) {
        rafId.current = requestAnimationFrame(tick)
      } else {
        rafId.current = null
        wrapper.current?.classList.remove(styles.spotlightActive)
      }
    }

    rafId.current = requestAnimationFrame(tick)
  }

  const applyPointerPosition = (svgX, svgY) => {
    if (!effectsEnabled) return

    pointer.current.x = svgX
    pointer.current.y = svgY
    reveal.current?.setAttribute('cx', svgX)
    reveal.current?.setAttribute('cy', svgY)
    outlineReveal.current?.setAttribute('cx', svgX)
    outlineReveal.current?.setAttribute('cy', svgY)
    startLoop()
  }

  const setHoldActive = (active) => {
    if (!effectsEnabled) return

    targetRadiusScale.current = active ? HOLD_RADIUS_SCALE : 1
    startLoop()
  }

  const park = () => {
    setHoldActive(false)
    applyPointerPosition(config.parkedPointer, config.parkedPointer)
  }

  const updateExpandedPointer = (event) => {
    const element = wrapper.current
    if (!element || element.closest('[inert]')) return false

    const computedStyle = window.getComputedStyle(element)
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return false
    }

    const bounds = element.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return false

    const svgX = ((event.clientX - bounds.left) / bounds.width) * viewBoxWidth
    const svgY = ((event.clientY - bounds.top) / bounds.height) * viewBoxHeight
    applyPointerPosition(svgX, svgY)
    return true
  }

  const handleExpandedPointerDown = (event) => {
    if (event.button !== 0) return
    if (updateExpandedPointer(event)) setHoldActive(true)
  }

  const handleExpandedPointerEnd = () => setHoldActive(false)

  useEffect(() => {
    if (!interactive || !effectsEnabled) return undefined

    const handlePointerOut = (event) => {
      if (event.relatedTarget === null) park()
    }

    // Listen beyond the wrapper so the circular spotlight can keep following
    // the pointer after its centre crosses a title edge. Coordinates remain
    // relative to this title, matching the landing page's interaction model.
    window.addEventListener('pointercancel', handleExpandedPointerEnd)
    window.addEventListener('pointerdown', handleExpandedPointerDown)
    window.addEventListener('pointermove', updateExpandedPointer)
    window.addEventListener('pointerout', handlePointerOut)
    window.addEventListener('pointerup', handleExpandedPointerEnd)

    return () => {
      window.removeEventListener('pointercancel', handleExpandedPointerEnd)
      window.removeEventListener('pointerdown', handleExpandedPointerDown)
      window.removeEventListener('pointermove', updateExpandedPointer)
      window.removeEventListener('pointerout', handlePointerOut)
      window.removeEventListener('pointerup', handleExpandedPointerEnd)
      handleExpandedPointerEnd()
      park()
    }
  }, [effectsEnabled, interactive, viewBoxHeight, viewBoxWidth])

  useImperativeHandle(forwardedRef, () => ({
    applyPointerPosition,
    element: wrapper.current,
    park,
    setHoldActive,
  }))

  const fillMaskId = `${uid}-fill-mask`
  const outlineMaskId = `${uid}-outline-mask`
  const textX = textAlign === 'left' ? 0 : viewBoxWidth / 2
  const introClass = introState === 'waiting'
    ? styles.introWaiting
    : introState === 'playing'
      ? styles.introPlaying
      : styles.introComplete

  const handleIntroAnimationEnd = (event) => {
    if (event.target !== event.currentTarget || introState !== 'playing') return
    onIntroComplete?.()
  }

  return (
    <div
      className={`${styles.interaction} ${introClass} ${className}`}
      ref={wrapper}
      style={style}
    >
      {headingId ? (
        <HeadingTag id={headingId} className={styles.visuallyHidden}>
          {text}
        </HeadingTag>
      ) : null}

      <svg
        aria-hidden="true"
        className={styles.graphic}
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      >
        <defs>
          <mask id={fillMaskId} maskUnits="userSpaceOnUse">
            <rect fill="#fff" height={viewBoxHeight} width={viewBoxWidth} />
            <text
              style={{
                fontFamily: `'${fontFamily}', Inter, ui-sans-serif, system-ui, sans-serif`,
                fontSize: `${fontSize}px`,
                fontKerning: 'none',
                fontWeight,
                letterSpacing: `${letterSpacing}px`,
              }}
              textAnchor={textAlign === 'left' ? 'start' : 'middle'}
              x={textX}
              y={baseline}
            >
              {displayLines.map((line, index) => (
                <tspan
                  key={line}
                  dy={index === 0 ? 0 : resolvedLineHeight}
                  fill="#fff"
                  x={textX}
                >
                  {line}
                </tspan>
              ))}
            </text>
            <circle
              cx={config.parkedPointer}
              cy={config.parkedPointer}
              fill="#000"
              r={config.effectRadius}
              ref={reveal}
            />
          </mask>
          {outlineWidth > 0 ? (
            <mask id={outlineMaskId} maskUnits="userSpaceOnUse">
              <rect fill="#000" height={viewBoxHeight} width={viewBoxWidth} />
              <circle
                cx={config.parkedPointer}
                cy={config.parkedPointer}
                fill="#fff"
                r={config.effectRadius}
                ref={outlineReveal}
              />
            </mask>
          ) : null}
        </defs>

        {introState !== 'complete' ? (
          <g
            aria-hidden="true"
            className={styles.introOutline}
          >
            <text
              style={{
                fontFamily: `'${fontFamily}', Inter, ui-sans-serif, system-ui, sans-serif`,
                fontSize: `${fontSize}px`,
                fontKerning: 'none',
                fontWeight,
                letterSpacing: `${letterSpacing}px`,
              }}
              textAnchor={textAlign === 'left' ? 'start' : 'middle'}
              vectorEffect="non-scaling-stroke"
              x={textX}
              y={baseline}
            >
              {displayLines.map((line, index) => (
                <tspan key={line} dy={index === 0 ? 0 : resolvedLineHeight} x={textX}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ) : null}

        {outlineWidth > 0 ? (
          <g
            className={styles.outline}
            mask={`url(#${outlineMaskId})`}
            style={{
              fill: 'none',
              stroke: outlineColor,
              strokeWidth: outlineWidth,
            }}
          >
            <text
              style={{
                fontFamily: `'${fontFamily}', Inter, ui-sans-serif, system-ui, sans-serif`,
                fontSize: `${fontSize}px`,
                fontKerning: 'none',
                fontWeight,
                letterSpacing: `${letterSpacing}px`,
              }}
              textAnchor={textAlign === 'left' ? 'start' : 'middle'}
              vectorEffect="non-scaling-stroke"
              x={textX}
              y={baseline}
            >
              {displayLines.map((line, index) => (
                <tspan key={line} dy={index === 0 ? 0 : resolvedLineHeight} x={textX}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ) : null}

        <g
          className={styles.fill}
          mask={`url(#${fillMaskId})`}
          onAnimationEnd={handleIntroAnimationEnd}
          style={{ fill: textColor }}
        >
          <text
            style={{
              fontFamily: `'${fontFamily}', Inter, ui-sans-serif, system-ui, sans-serif`,
              fontSize: `${fontSize}px`,
              fontKerning: 'none',
              fontWeight,
              letterSpacing: `${letterSpacing}px`,
            }}
            textAnchor={textAlign === 'left' ? 'start' : 'middle'}
            x={textX}
            y={baseline}
          >
            {displayLines.map((line, index) => (
              <tspan key={line} dy={index === 0 ? 0 : resolvedLineHeight} x={textX}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      </svg>

      <canvas
        aria-hidden="true"
        className={styles.particleCanvas}
        ref={canvas}
        style={{
          height: `${(particleCanvasHeight / viewBoxHeight) * 100}%`,
          left: `${(-particleCanvasPadding / viewBoxWidth) * 100}%`,
          top: `${(-particleCanvasPadding / viewBoxHeight) * 100}%`,
          width: `${(particleCanvasWidth / viewBoxWidth) * 100}%`,
        }}
      />
    </div>
  )
})
