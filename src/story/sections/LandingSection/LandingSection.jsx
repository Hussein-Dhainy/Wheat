import { useEffect, useRef, useState } from 'react'
import { LANDING_INTRO } from '../../../config/landingIntro.js'
import { LANDING_TITLE } from '../../content.js'
import styles from './LandingSection.module.css'

const TITLE_VIEWBOX_WIDTH = 1080
const TITLE_VIEWBOX_HEIGHT = 220
const TITLE_TEXT = LANDING_TITLE
const TITLE_FONT_SIZE = 127
const TITLE_BASELINE = 153
const TITLE_LETTER_SPACING = -9
const TITLE_EFFECT_RADIUS = 96
const TITLE_PARTICLE_ACTIVATION_RADIUS = TITLE_EFFECT_RADIUS + 19
const TITLE_PARTICLE_OUTER_RADIUS = TITLE_EFFECT_RADIUS + 6
const TITLE_PARTICLE_CLIP_RADIUS = TITLE_PARTICLE_OUTER_RADIUS + 18
const TITLE_PARKED_POINTER = -TITLE_PARTICLE_CLIP_RADIUS - TITLE_PARTICLE_ACTIVATION_RADIUS
const TITLE_INNER_RADIUS = 29
const INNER_RING_CAPTURE_RADIUS = TITLE_INNER_RADIUS + 11
const RING_SWITCH_HYSTERESIS = 7
const MAX_TITLE_PARTICLES = 410
const MAX_TITLE_LINKS = 198
const TITLE_LINK_SOURCE_DISTANCE = 42
const TITLE_LINK_SNAP_DISTANCE = 96
const TITLE_LINK_RELEASE_DISTANCE = 108

function createSeededRandom(seed = 6197) {
  let value = seed >>> 0

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function step(edge, value) {
  return value < edge ? 0 : 1
}

function configureTitleContext(context) {
  context.font = `500 ${TITLE_FONT_SIZE}px Inter, system-ui, sans-serif`
  context.fontKerning = 'none'
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  if ('letterSpacing' in context) {
    context.letterSpacing = `${TITLE_LETTER_SPACING}px`
  }
}

function createTitleLinks(particles) {
  const links = []
  const linkedIndices = new Set()

  for (let startIndex = 0; startIndex < particles.length; startIndex += 1) {
    if (links.length >= MAX_TITLE_LINKS || startIndex % 3 !== 0 || linkedIndices.has(startIndex)) continue

    let closestIndex = -1
    let closestDistance = TITLE_LINK_SOURCE_DISTANCE

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

function sampleTitleData() {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const random = createSeededRandom()
  const particles = []

  if (!context) return { links: [], particles }

  canvas.width = TITLE_VIEWBOX_WIDTH
  canvas.height = TITLE_VIEWBOX_HEIGHT
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#fff'
  configureTitleContext(context)
  context.fillText(
    TITLE_TEXT,
    TITLE_VIEWBOX_WIDTH / 2,
    TITLE_BASELINE,
  )

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data

  for (let y = 6; y < canvas.height - 6; y += 7) {
    for (let x = 6; x < canvas.width - 6; x += 7) {
      const sampleX = Math.min(canvas.width - 1, Math.round(x + (random() - 0.5) * 5))
      const sampleY = Math.min(canvas.height - 1, Math.round(y + (random() - 0.5) * 5))
      const alpha = pixels[(sampleY * canvas.width + sampleX) * 4 + 3]

      if (alpha > 80 && random() > 0.32) {
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

  const sampledParticles = particles.slice(0, MAX_TITLE_PARTICLES)

  return {
    links: createTitleLinks(sampledParticles),
    particles: sampledParticles,
  }
}

export function LandingSection({ entered }) {
  const title = useRef()
  const titleReveal = useRef()
  const particleClip = useRef()
  const particleElements = useRef([])
  const particleLinkElements = useRef([])
  const particleTargets = useRef([])
  const pendingPointer = useRef(null)
  const pointerFrame = useRef(null)
  const [titleLinks, setTitleLinks] = useState([])
  const [titleParticles, setTitleParticles] = useState([])

  useEffect(() => {
    const titleData = sampleTitleData()
    particleTargets.current = titleData.particles.map((particle) => ({
      ring: null,
      visible: false,
      x: particle.x,
      y: particle.y,
    }))
    setTitleLinks(titleData.links)
    setTitleParticles(titleData.particles)

    return () => {
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current)
    }
  }, [])

  const positionTitleParticles = (centerX, centerY) => {
    titleParticles.forEach((particle, index) => {
      const element = particleElements.current[index]
      const target = particleTargets.current[index]
      if (!element || !target) return

      const deltaX = particle.x - centerX
      const deltaY = particle.y - centerY
      const distance = Math.hypot(deltaX, deltaY)

      if (distance >= TITLE_PARTICLE_ACTIVATION_RADIUS) {
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
      const outerRadius = TITLE_PARTICLE_OUTER_RADIUS - particle.radius
      const previousRing = element.dataset.ring
      const prefersOuterRing = step(INNER_RING_CAPTURE_RADIUS, distance)
      let nextRing = prefersOuterRing ? 'outer' : 'inner'

      if (previousRing === 'inner' && distance < INNER_RING_CAPTURE_RADIUS + RING_SWITCH_HYSTERESIS) {
        nextRing = 'inner'
      } else if (previousRing === 'outer' && distance > INNER_RING_CAPTURE_RADIUS - RING_SWITCH_HYSTERESIS) {
        nextRing = 'outer'
      }

      element.dataset.ring = nextRing
      const targetRadius = nextRing === 'inner' ? TITLE_INNER_RADIUS : outerRadius
      const targetX = centerX + Math.cos(angle) * targetRadius
      const targetY = centerY + Math.sin(angle) * targetRadius
      const overlap = 1 - distance / TITLE_PARTICLE_ACTIVATION_RADIUS

      element.setAttribute('cx', targetX)
      element.setAttribute('cy', targetY)
      element.style.opacity = Math.min(1, 0.3 + overlap * 1.45)
      target.ring = nextRing
      target.visible = true
      target.x = targetX
      target.y = targetY
    })

    titleLinks.forEach((link, index) => {
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
      const distanceLimit = wasLinked ? TITLE_LINK_RELEASE_DISTANCE : TITLE_LINK_SNAP_DISTANCE

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
      const proximity = 1 - Math.min(linkDistance, TITLE_LINK_RELEASE_DISTANCE) / TITLE_LINK_RELEASE_DISTANCE
      element.style.opacity = 0.18 + proximity * 0.38
    })
  }

  const applyPointerPosition = (svgX, svgY) => {
    if (!particleClip.current) return

    titleReveal.current?.setAttribute('cx', svgX)
    titleReveal.current?.setAttribute('cy', svgY)
    particleClip.current.setAttribute('cx', svgX)
    particleClip.current.setAttribute('cy', svgY)
    positionTitleParticles(svgX, svgY)

    // Particle drift is transform-based (cheap), but there's no reason to
    // keep it animating while the cursor is nowhere near the title.
    const isWithinTitleBounds = svgX >= 0 && svgX <= TITLE_VIEWBOX_WIDTH
      && svgY >= 0 && svgY <= TITLE_VIEWBOX_HEIGHT
    title.current?.classList.toggle(styles.spotlightActive, isWithinTitleBounds)
  }

  const updateLocalPointer = (event) => {
    if (!title.current) return

    const bounds = title.current.getBoundingClientRect()
    const svgX = ((event.clientX - bounds.left) / bounds.width) * TITLE_VIEWBOX_WIDTH
    const svgY = ((event.clientY - bounds.top) / bounds.height) * TITLE_VIEWBOX_HEIGHT

    pendingPointer.current = { x: svgX, y: svgY }
    if (pointerFrame.current) return

    pointerFrame.current = requestAnimationFrame(() => {
      const point = pendingPointer.current
      applyPointerPosition(point.x, point.y)
      pointerFrame.current = null
    })
  }

  useEffect(() => {
    if (!titleParticles.length) return

    applyPointerPosition(TITLE_PARKED_POINTER, TITLE_PARKED_POINTER)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleParticles])

  return (
    <section
      className={`${styles.landing} ${entered ? styles.entered : ''}`}
      style={{
        '--interaction-hint-delay': `${LANDING_INTRO.interactionHintDelayMs}ms`,
        '--supporting-content-delay': `${LANDING_INTRO.supportingContentDelayMs}ms`,
        '--supporting-content-duration': `${LANDING_INTRO.supportingContentDurationMs}ms`,
        '--title-reveal-delay': `${LANDING_INTRO.titleDelayMs}ms`,
        '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
      }}
      aria-labelledby="landing-title"
      onPointerMove={updateLocalPointer}
      onPointerDown={updateLocalPointer}
      onPointerLeave={() => applyPointerPosition(TITLE_PARKED_POINTER, TITLE_PARKED_POINTER)}
    >
      <div className={styles.copy}>
        <div
          ref={title}
          className={styles.titleInteraction}
        >
          <h1 id="landing-title" className={styles.visuallyHidden}>
            {TITLE_TEXT}
          </h1>

          <svg
            className={styles.titleGraphic}
            viewBox={`0 0 ${TITLE_VIEWBOX_WIDTH} ${TITLE_VIEWBOX_HEIGHT}`}
            aria-hidden="true"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <mask id="title-fill-mask" maskUnits="userSpaceOnUse">
                <rect
                  width={TITLE_VIEWBOX_WIDTH}
                  height={TITLE_VIEWBOX_HEIGHT}
                  fill="#fff"
                />
                <text
                  className={styles.titleMaskText}
                  x={TITLE_VIEWBOX_WIDTH / 2}
                  y={TITLE_BASELINE}
                  textAnchor="middle"
                >
                  <tspan fill="#fff">{TITLE_TEXT}</tspan>
                </text>
                <circle
                  ref={titleReveal}
                  cx={TITLE_PARKED_POINTER}
                  cy={TITLE_PARKED_POINTER}
                  r={TITLE_EFFECT_RADIUS}
                  fill="#000"
                />
              </mask>
              <clipPath id="title-particle-clip" clipPathUnits="userSpaceOnUse">
                <circle
                  ref={particleClip}
                  cx={TITLE_PARKED_POINTER}
                  cy={TITLE_PARKED_POINTER}
                  r={TITLE_PARTICLE_CLIP_RADIUS}
                />
              </clipPath>
            </defs>

            <g className={styles.titleFill} mask="url(#title-fill-mask)">
              <text
                x={TITLE_VIEWBOX_WIDTH / 2}
                y={TITLE_BASELINE}
                textAnchor="middle"
              >
                {TITLE_TEXT}
              </text>
            </g>

            <g className={styles.titleParticleLinks} clipPath="url(#title-particle-clip)">
              {titleLinks.map((link, index) => (
                <line
                  key={link.key}
                  ref={(element) => {
                    particleLinkElements.current[index] = element
                  }}
                  x1={titleParticles[link.startIndex]?.x ?? 0}
                  y1={titleParticles[link.startIndex]?.y ?? 0}
                  x2={titleParticles[link.endIndex]?.x ?? 0}
                  y2={titleParticles[link.endIndex]?.y ?? 0}
                />
              ))}
            </g>

            <g className={styles.titleParticles} clipPath="url(#title-particle-clip)">
              {titleParticles.map((particle, index) => (
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

        <p className={styles.body}>
          From grain to field, discover how science shapes the future of wheat.
        </p>
      </div>

      <p id="landing-interaction-hint" className={styles.hint}>
        <span className={styles.hintLine} aria-hidden="true" />
        Move to explore
      </p>
    </section>
  )
}
