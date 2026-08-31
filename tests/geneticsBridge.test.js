import assert from 'node:assert/strict'
import test from 'node:test'
import {
  crossedIntoGeneticsIntro,
  GENETICS_BRIDGE_TIMING,
  GENETICS_INTRO_TIMING,
  GENETICS_SEED_TIMING,
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

test('the Scene 2 editorial title owns the space between DNA and seeds', () => {
  const [bridgeStart, bridgeEnd] = GENETICS_BRIDGE_TIMING.activeRange
  const [seedStart] = GENETICS_SEED_TIMING.carouselRevealRange

  assert.ok(bridgeStart < bridgeEnd)
  assert.ok(bridgeStart < 0.4)
  assert.ok(bridgeEnd < seedStart)
  assert.equal(isGeneticsBridgeActive(bridgeStart - 0.001), false)
  assert.equal(isGeneticsBridgeActive(bridgeStart), true)
  assert.equal(isGeneticsBridgeActive((bridgeStart + bridgeEnd) / 2), true)
  assert.equal(isGeneticsBridgeActive(bridgeEnd), false)
})
