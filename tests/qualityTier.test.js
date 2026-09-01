import assert from 'node:assert/strict'
import test from 'node:test'

import {
  QUALITY_PROFILES,
  getRuntimeQualityTier,
  readQualityOverride,
  resolveInitialQualityTier,
  selectLowerQualityTier,
} from '../src/experience/qualityTier.js'
import {
  DNA_QUALITY_PROFILES,
  getDNAQualityProfile,
} from '../src/experience/scenes/dna/dnaConfig.js'

test('capable displays begin at high quality while expensive displays step down', () => {
  assert.equal(resolveInitialQualityTier({
    deviceMemory: 8,
    hardwareConcurrency: 8,
    pixelRatio: 1,
    viewportHeight: 1080,
    viewportWidth: 1920,
  }), 'high')

  assert.equal(resolveInitialQualityTier({
    deviceMemory: 8,
    hardwareConcurrency: 8,
    pixelRatio: 2,
    viewportHeight: 1440,
    viewportWidth: 2560,
  }), 'low')
})

test('memory, CPU and reduced-data pressure choose conservative initial tiers', () => {
  assert.equal(resolveInitialQualityTier({
    deviceMemory: 4,
    hardwareConcurrency: 8,
    viewportHeight: 800,
    viewportWidth: 1280,
  }), 'medium')
  assert.equal(resolveInitialQualityTier({ saveData: true }), 'low')
  assert.equal(resolveInitialQualityTier({
    deviceMemory: 2,
    hardwareConcurrency: 2,
  }), 'low')
})

test('quality overrides accept only supported tiers', () => {
  assert.equal(readQualityOverride('?quality=HIGH'), 'high')
  assert.equal(readQualityOverride('?chapter=2&quality=low'), 'low')
  assert.equal(readQualityOverride('?quality=ultra'), null)
})

test('automatic quality selection never upgrades a session', () => {
  assert.equal(selectLowerQualityTier('medium', 'high'), 'medium')
  assert.equal(selectLowerQualityTier('high', 'medium'), 'medium')
  assert.equal(selectLowerQualityTier('medium', 'low'), 'low')
})

test('sustained slow frame samples step quality down one tier at a time', () => {
  const slowSample = {
    averageFrameMs: 29,
    frameCount: 120,
    sampleDurationMs: 3000,
    slowFrameRatio: 0.4,
  }

  assert.equal(getRuntimeQualityTier('high', slowSample), 'medium')
  assert.equal(getRuntimeQualityTier('medium', slowSample), 'low')
  assert.equal(getRuntimeQualityTier('low', slowSample), 'low')
  assert.equal(getRuntimeQualityTier('high', {
    ...slowSample,
    frameCount: 15,
  }), 'medium')
  assert.equal(getRuntimeQualityTier('high', {
    ...slowSample,
    averageFrameMs: 16.7,
    slowFrameRatio: 0.02,
  }), 'high')
})

test('lower quality profiles reduce both DPR and compositor resolution', () => {
  assert.ok(QUALITY_PROFILES.high.canvasDpr[1] > QUALITY_PROFILES.medium.canvasDpr[1])
  assert.ok(QUALITY_PROFILES.medium.canvasDpr[1] > QUALITY_PROFILES.low.canvasDpr[1])
  assert.ok(
    QUALITY_PROFILES.high.compositorRenderScale
      > QUALITY_PROFILES.medium.compositorRenderScale,
  )
  assert.ok(
    QUALITY_PROFILES.medium.compositorRenderScale
      > QUALITY_PROFILES.low.compositorRenderScale,
  )
})

test('Scene 2 scales DNA geometry and every ambient particle layer by quality', () => {
  const keys = [
    'backgroundParticleCount',
    'bokehParticleCount',
    'particlesPerFiber',
    'segments',
    'strandCount',
    'trailDensity',
  ]

  keys.forEach((key) => {
    assert.ok(DNA_QUALITY_PROFILES.high[key] > DNA_QUALITY_PROFILES.medium[key])
    assert.ok(DNA_QUALITY_PROFILES.medium[key] > DNA_QUALITY_PROFILES.low[key])
  })

  assert.equal(getDNAQualityProfile('high'), DNA_QUALITY_PROFILES.high)
  assert.equal(getDNAQualityProfile('unsupported'), DNA_QUALITY_PROFILES.medium)
})

test('Scene 2 high quality is lighter than the previous fixed particle budget', () => {
  const high = DNA_QUALITY_PROFILES.high
  const embeddedParticleCount = high.strandCount * high.particlesPerFiber

  assert.ok(embeddedParticleCount < 30 * 48)
  assert.ok(high.backgroundParticleCount < 960)
  assert.ok(high.bokehParticleCount < 180)
  assert.ok(high.trailDensity < 1)
})
