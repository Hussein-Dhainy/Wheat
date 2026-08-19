import { useEffect, useId, useRef, useState } from 'react'
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
const BASE_LINK_SOURCE_DISTANCE = 54
const BASE_LINK_SNAP_DISTANCE = 96
const BASE_LINK_RELEASE_DISTANCE = 108
const MAX_PARTICLES = 410
const MAX_LINKS = 320

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
    parkedPointer: -clipRadius - activationRadius,
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
      key: `${startIndex}-${closestIndex}`,
      startIndex,
    })
  }

  return links
}

function sampleParticleData(config, seed) {
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
  context.fillText(config.text, config.viewBoxWidth / 2, config.baseline)

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data

  // The 7px/5px grid and jitter below were tuned for the 127px reference
  // size. Scaling them with the instance's own font size keeps particle
  // density consistent — without this, a smaller (e.g. mobile-scaled)
  // instance samples the same coarse grid over a proportionally smaller
  // letterform, leaving visibly sparser, patchier coverage.
  const sampleScale = config.fontSize / EFFECT_TUNING_FONT_SIZE
  const step = Math.max(3, Math.round(7 * sampleScale))
  const jitter = 5 * sampleScale

  for (let y = 6; y < canvas.height - 6; y += step) {
    for (let x = 6; x < canvas.width - 6; x += step) {
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
          phase: random() * Math.PI * 2,
          driftX: (random() - 0.5) * 18,
          driftY: (random() - 0.5) * 18,
          driftDuration: 2.2 + random() * 2.4,
          driftDelay: -random() * 4.6,
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

export function TitleParticleText({
  as: HeadingTag = 'h2',
  baseline,
  className = '',
  fontFamily = 'Inter',
  fontSize,
  fontWeight = 400,
  headingId,
  letterSpacing = -2,
  seed = 6197,
  style,
  text,
  textColor = '#f5f1e7',
  viewBoxHeight,
  viewBoxWidth,
}) {
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

  const uid = useId()
  const wrapper = useRef()
  const reveal = useRef()
  const particleClip = useRef()
  const particleElements = useRef([])
  const particleLinkElements = useRef([])
  const particleTargets = useRef([])
  const pendingPointer = useRef(null)
  const pointerFrame = useRef(null)
  const [links, setLinks] = useState([])
  const [particles, setParticles] = useState([])

  useEffect(() => {
    let cancelled = false

    ensureFontLoaded(config).then(() => {
      if (cancelled) return

      const sampled = sampleParticleData(config, seed)
      particleTargets.current = sampled.particles.map((particle) => ({
        ring: null,
        visible: false,
        x: particle.x,
        y: particle.y,
      }))
      setLinks(sampled.links)
      setParticles(sampled.particles)
    })

    return () => {
      cancelled = true
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current)
    }
  }, [
    baseline,
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    seed,
    text,
    viewBoxHeight,
    viewBoxWidth,
  ])

  const positionParticles = (centerX, centerY) => {
    particles.forEach((particle, index) => {
      const element = particleElements.current[index]
      const target = particleTargets.current[index]
      if (!element || !target) return

      const deltaX = particle.x - centerX
      const deltaY = particle.y - centerY
      const distance = Math.hypot(deltaX, deltaY)

      if (distance >= config.activationRadius) {
        element.setAttribute('cx', particle.x)
        element.setAttribute('cy', particle.y)
        delete element.dataset.ring
        element.style.opacity = 0
        target.ring = null
        target.visible = false
        target.x = particle.x
        target.y = particle.y
        return
      }

      const fallbackAngle = particle.phase
      const baseAngle = distance > 0.001
        ? Math.atan2(deltaY, deltaX)
        : fallbackAngle
      const angle = baseAngle + Math.sin(particle.phase) * 0.035
      const outerRadius = config.outerRadius - particle.radius
      const previousRing = element.dataset.ring
      const prefersOuterRing = step(config.innerCaptureRadius, distance)
      let nextRing = prefersOuterRing ? 'outer' : 'inner'

      if (previousRing === 'inner' && distance < config.innerCaptureRadius + config.ringSwitchHysteresis) {
        nextRing = 'inner'
      } else if (previousRing === 'outer' && distance > config.innerCaptureRadius - config.ringSwitchHysteresis) {
        nextRing = 'outer'
      }

      element.dataset.ring = nextRing
      const targetRadius = nextRing === 'inner' ? config.innerRadius : outerRadius
      const targetX = centerX + Math.cos(angle) * targetRadius
      const targetY = centerY + Math.sin(angle) * targetRadius
      const overlap = 1 - distance / config.activationRadius

      element.setAttribute('cx', targetX)
      element.setAttribute('cy', targetY)
      element.style.opacity = Math.min(1, 0.3 + overlap * 1.45)
      target.ring = nextRing
      target.visible = true
      target.x = targetX
      target.y = targetY
    })

    links.forEach((link, index) => {
      const element = particleLinkElements.current[index]
      const start = particleTargets.current[link.startIndex]
      const end = particleTargets.current[link.endIndex]

      if (!element || !start?.visible || !end?.visible) {
        if (element) {
          element.dataset.linked = 'false'
          element.style.opacity = 0
        }
        return
      }

      const linkDistance = Math.hypot(start.x - end.x, start.y - end.y)
      const wasLinked = element.dataset.linked === 'true'
      const distanceLimit = wasLinked ? config.linkReleaseDistance : config.linkSnapDistance

      if (linkDistance > distanceLimit) {
        element.dataset.linked = 'false'
        element.style.opacity = 0
        return
      }

      element.dataset.linked = 'true'
      element.setAttribute('x1', start.x)
      element.setAttribute('y1', start.y)
      element.setAttribute('x2', end.x)
      element.setAttribute('y2', end.y)
      const proximity = 1 - Math.min(linkDistance, config.linkReleaseDistance) / config.linkReleaseDistance
      element.style.opacity = 0.18 + proximity * 0.38
    })
  }

  const applyPointerPosition = (svgX, svgY) => {
    if (!particleClip.current) return

    reveal.current?.setAttribute('cx', svgX)
    reveal.current?.setAttribute('cy', svgY)
    particleClip.current.setAttribute('cx', svgX)
    particleClip.current.setAttribute('cy', svgY)
    positionParticles(svgX, svgY)

    const isWithinBounds = svgX >= 0 && svgX <= viewBoxWidth
      && svgY >= 0 && svgY <= viewBoxHeight
    wrapper.current?.classList.toggle(styles.spotlightActive, isWithinBounds)
  }

  const updateLocalPointer = (event) => {
    if (!wrapper.current) return

    const bounds = wrapper.current.getBoundingClientRect()
    const svgX = ((event.clientX - bounds.left) / bounds.width) * viewBoxWidth
    const svgY = ((event.clientY - bounds.top) / bounds.height) * viewBoxHeight

    pendingPointer.current = { x: svgX, y: svgY }
    if (pointerFrame.current) return

    pointerFrame.current = requestAnimationFrame(() => {
      const point = pendingPointer.current
      applyPointerPosition(point.x, point.y)
      pointerFrame.current = null
    })
  }

  useEffect(() => {
    if (!particles.length) return

    applyPointerPosition(config.parkedPointer, config.parkedPointer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particles])

  const fillMaskId = `${uid}-fill-mask`
  const particleClipId = `${uid}-particle-clip`

  return (
    <div
      className={`${styles.interaction} ${className}`}
      onPointerDown={updateLocalPointer}
      onPointerLeave={() => applyPointerPosition(config.parkedPointer, config.parkedPointer)}
      onPointerMove={updateLocalPointer}
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
              textAnchor="middle"
              x={viewBoxWidth / 2}
              y={baseline}
            >
              <tspan fill="#fff">{text}</tspan>
            </text>
            <circle
              cx={config.parkedPointer}
              cy={config.parkedPointer}
              fill="#000"
              r={config.effectRadius}
              ref={reveal}
            />
          </mask>
          <clipPath clipPathUnits="userSpaceOnUse" id={particleClipId}>
            <circle
              cx={config.parkedPointer}
              cy={config.parkedPointer}
              r={config.clipRadius}
              ref={particleClip}
            />
          </clipPath>
        </defs>

        <g className={styles.fill} mask={`url(#${fillMaskId})`} style={{ fill: textColor }}>
          <text
            style={{
              fontFamily: `'${fontFamily}', Inter, ui-sans-serif, system-ui, sans-serif`,
              fontSize: `${fontSize}px`,
              fontKerning: 'none',
              fontWeight,
              letterSpacing: `${letterSpacing}px`,
            }}
            textAnchor="middle"
            x={viewBoxWidth / 2}
            y={baseline}
          >
            {text}
          </text>
        </g>

        <g className={styles.particleLinks} clipPath={`url(#${particleClipId})`}>
          {links.map((link, index) => (
            <line
              key={link.key}
              ref={(element) => {
                particleLinkElements.current[index] = element
              }}
              x1={particles[link.startIndex]?.x ?? 0}
              y1={particles[link.startIndex]?.y ?? 0}
              x2={particles[link.endIndex]?.x ?? 0}
              y2={particles[link.endIndex]?.y ?? 0}
            />
          ))}
        </g>

        <g className={styles.particles} clipPath={`url(#${particleClipId})`}>
          {particles.map((particle, index) => (
            <circle
              key={`${particle.x}-${particle.y}`}
              ref={(element) => {
                particleElements.current[index] = element
              }}
              cx={particle.x}
              cy={particle.y}
              r={particle.radius}
              fill={particle.color}
              className={particle.linked ? styles.linkedParticle : undefined}
              style={{
                '--particle-drift-start-x': `${-particle.driftX}px`,
                '--particle-drift-start-y': `${-particle.driftY}px`,
                '--particle-drift-x': `${particle.driftX}px`,
                '--particle-drift-y': `${particle.driftY}px`,
                '--particle-drift-duration': `${particle.driftDuration}s`,
                '--particle-drift-delay': `${particle.driftDelay}s`,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
