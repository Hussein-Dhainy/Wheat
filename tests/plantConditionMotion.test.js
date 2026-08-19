import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getLeafConditionDroopProgress,
  getStemConditionBend,
} from '../src/experience/scenes/prediction/plantConditionMotion.js'

test('disease droop stays milder than full drought damage', () => {
  const drought = getLeafConditionDroopProgress(1, 0, 0, 0.68, 0.38)
  const disease = getLeafConditionDroopProgress(0, 1, 0, 0.68, 0.38)

  assert.equal(drought, 0.68)
  assert.equal(disease, 0.38)
  assert.ok(disease < drought)
})

test('condition cross-fades never add into an exaggerated droop', () => {
  const droughtOnly = getLeafConditionDroopProgress(0.7, 0, 0, 0.68, 0.38)
  const droop = getLeafConditionDroopProgress(0.7, 1, 0, 0.68, 0.38)

  assert.equal(droop, droughtOnly)
})

test('disease bends stems less than drought without additive overlap', () => {
  const drought = getStemConditionBend(1, 0, 0.065, 0.032)
  const disease = getStemConditionBend(0, 1, 0.065, 0.032)
  const overlap = getStemConditionBend(0.8, 1, 0.065, 0.032)

  assert.equal(drought, 0.065)
  assert.equal(disease, 0.032)
  assert.ok(disease < drought)
  assert.equal(overlap, 0.8 * 0.065)
})
