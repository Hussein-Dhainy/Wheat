import assert from 'node:assert/strict'
import test from 'node:test'
import {
  crossedIntoGeneticsIntro,
  GENETICS_BRIDGE_TIMING,
  GENETICS_INTRO_TIMING,
  GENETICS_GROWTH_TIMING,
  getGeneticsAmbientParticleOpacity,
  isGeneticsBridgeActive,
  isGeneticsIntroActive,
} from '../src/config/geneticsSeeds.js'

test('the DNA intro becomes active again below its reverse-scroll boundary', () => {
  const [, introEnd] = GENETICS_INTRO_TIMING.activeRange

  assert.equal(isGeneticsIntroActive(introEnd + 0.001), false)
  assert.equal(isGeneticsIntroActive(introEnd), false)
  assert.equal(isGeneticsIntroActive(introEnd - 0.001), true)
  assert.equal(
    crossedIntoGeneticsIntro(introEnd + 0.001, introEnd - 0.001),
    true,
  )
  assert.equal(
    crossedIntoGeneticsIntro(introEnd - 0.001, introEnd + 0.001),
    false,
  )
  assert.equal(crossedIntoGeneticsIntro(Number.NaN, introEnd - 0.001), false)
})

test('ambient genetics particles fade by ninety percent for seedling growth', () => {
  const [fadeStart, fadeEnd] = GENETICS_GROWTH_TIMING.ambientParticleFadeRange

  assert.equal(getGeneticsAmbientParticleOpacity(fadeStart), 1)
  assert.ok(Math.abs(getGeneticsAmbientParticleOpacity(fadeEnd) - 0.1) < 1e-9)
  assert.ok(Math.abs(getGeneticsAmbientParticleOpacity(1) - 0.1) < 1e-9)
  assert.ok(getGeneticsAmbientParticleOpacity((fadeStart + fadeEnd) / 2) < 1)
})

test('the Scene 2 editorial title hands off to seedling growth', () => {
  const [bridgeStart, bridgeEnd] = GENETICS_BRIDGE_TIMING.activeRange
  const [entryStart, entryEnd] = GENETICS_GROWTH_TIMING.entryRange
  const [growthStart, growthEnd] = GENETICS_GROWTH_TIMING.revealRange

  assert.ok(bridgeStart < bridgeEnd)
  assert.ok(bridgeStart < 0.4)
  assert.ok(bridgeEnd <= 0.7)
  assert.ok(bridgeEnd <= growthStart)
  assert.ok(entryStart < entryEnd)
  assert.equal(entryStart, 0.75)
  assert.ok(entryStart <= growthStart)
  assert.equal(entryEnd, 0.98)
  assert.ok(growthStart < growthEnd)
  assert.ok(GENETICS_BRIDGE_TIMING.fadeDurationMs >= 400)
  assert.equal(isGeneticsBridgeActive(bridgeStart - 0.001), false)
  assert.equal(isGeneticsBridgeActive(bridgeStart), true)
  assert.equal(isGeneticsBridgeActive((bridgeStart + bridgeEnd) / 2), true)
  assert.equal(isGeneticsBridgeActive(bridgeEnd), false)
})
