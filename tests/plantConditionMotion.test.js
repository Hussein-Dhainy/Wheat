import test from 'node:test'
import assert from 'node:assert/strict'
import { MathUtils } from 'three'

import {
  getConditionTransitionActivity,
  getLeafConditionDroopProgress,
  getLeafConditionSway,
  getPlantSway,
  getStemConditionBend,
} from '../src/experience/scenes/prediction/plantConditionMotion.js'
import { PREDICTION_RENDER_CONFIG } from '../src/experience/scenes/prediction/predictionConfig.js'

const WEATHER = PREDICTION_RENDER_CONFIG.weather

test('disease droop stays milder than full drought damage', () => {
  const drought = getLeafConditionDroopProgress(
    1,
    0,
    0,
    WEATHER.drought.droopAmount,
    WEATHER.disease.droopAmount,
  )
  const disease = getLeafConditionDroopProgress(
    0,
    1,
    0,
    WEATHER.drought.droopAmount,
    WEATHER.disease.droopAmount,
  )

  assert.equal(drought, WEATHER.drought.droopAmount)
  assert.equal(disease, WEATHER.disease.droopAmount)
  assert.ok(disease < drought)
})

test('condition leaf sway is slow, visible, and inactive without damage', () => {
  const motion = WEATHER.conditionMotion
  assert.ok(motion.heroStructureSway < motion.heroLeafSway)
  assert.ok(motion.heroLeafSway < motion.leafSway)
  const atRest = getLeafConditionSway(
    1,
    0.4,
    0,
    0,
    motion.leafSway,
    motion.primaryFrequency,
    motion.secondaryFrequency,
  )
  const damagedAtStart = getLeafConditionSway(
    0,
    0.4,
    1,
    0,
    motion.leafSway,
    motion.primaryFrequency,
    motion.secondaryFrequency,
  )
  const damagedLater = getLeafConditionSway(
    1,
    0.4,
    1,
    0,
    motion.leafSway,
    motion.primaryFrequency,
    motion.secondaryFrequency,
  )

  assert.equal(atRest, 0)
  assert.notEqual(damagedAtStart, damagedLater)
  assert.ok(Math.abs(damagedLater) > 0.03)
})

test('ambient breeze is always active and moves the field more than the hero', () => {
  const ambient = WEATHER.ambientMotion
  const heroSway = getPlantSway(
    1,
    0.4,
    ambient.heroSway,
    ambient.primaryFrequency,
    ambient.secondaryFrequency,
  )
  const fieldSway = getPlantSway(
    1,
    0.4,
    ambient.fieldSway,
    ambient.primaryFrequency,
    ambient.secondaryFrequency,
  )

  assert.notEqual(heroSway, 0)
  assert.ok(Math.abs(fieldSway) > Math.abs(heroSway) * 5)
  assert.ok(ambient.fieldSway < WEATHER.wind.fieldSway)
})

test('condition transition shake peaks in motion and settles at endpoints', () => {
  assert.equal(getConditionTransitionActivity(0, 0), 0)
  assert.equal(getConditionTransitionActivity(1, 0), 0)
  assert.equal(getConditionTransitionActivity(0, 1), 0)
  assert.equal(getConditionTransitionActivity(0.5, 0), 1)
  assert.equal(getConditionTransitionActivity(0.5, 0.5), 1)
  assert.ok(WEATHER.conditionMotion.leafTransitionShake > 0)
  assert.ok(WEATHER.conditionMotion.transitionStagger > 0)
  assert.ok(
    WEATHER.conditionMotion.leafTransitionShake
      > WEATHER.conditionMotion.heroLeafTransitionShake,
  )
})

test('condition cross-fades move directly between leaf poses', () => {
  const samples = [
    [1, 0],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0, 1],
  ].map(([drought, disease]) => getLeafConditionDroopProgress(
    drought,
    disease,
    0.2,
    WEATHER.drought.droopAmount,
    WEATHER.disease.droopAmount,
  ))

  assert.equal(samples[0], WEATHER.drought.droopAmount)
  assert.equal(samples.at(-1), WEATHER.disease.droopAmount)
  samples.slice(1).forEach((sample, index) => {
    assert.ok(sample < samples[index])
  })
})

test('actual damped drought and disease handoffs never reverse direction', () => {
  const frameTime = 1 / 60
  const assertMonotonicHandoff = ({
    drought,
    disease,
    droughtTarget,
    diseaseTarget,
    direction,
  }) => {
    let previous = getLeafConditionDroopProgress(
      drought,
      disease,
      0.24,
      WEATHER.drought.droopAmount,
      WEATHER.disease.droopAmount,
    )

    for (let frame = 0; frame < 360; frame += 1) {
      drought = MathUtils.damp(
        drought,
        droughtTarget,
        WEATHER.drought.transitionDamping,
        frameTime,
      )
      disease = MathUtils.damp(
        disease,
        diseaseTarget,
        WEATHER.disease.transitionDamping,
        frameTime,
      )
      const current = getLeafConditionDroopProgress(
        drought,
        disease,
        0.24,
        WEATHER.drought.droopAmount,
        WEATHER.disease.droopAmount,
      )

      if (direction === 'down') assert.ok(current <= previous + 0.0000001)
      else assert.ok(current >= previous - 0.0000001)
      previous = current
    }
  }

  assertMonotonicHandoff({
    disease: 0,
    diseaseTarget: 1,
    direction: 'down',
    drought: 1,
    droughtTarget: 0,
  })
  assertMonotonicHandoff({
    disease: 1,
    diseaseTarget: 0,
    direction: 'up',
    drought: 0,
    droughtTarget: 1,
  })
})

test('stem bend blends monotonically between drought and disease', () => {
  const drought = getStemConditionBend(
    1,
    0,
    WEATHER.drought.stemBend,
    WEATHER.disease.stemBend,
  )
  const disease = getStemConditionBend(
    0,
    1,
    WEATHER.drought.stemBend,
    WEATHER.disease.stemBend,
  )
  const midpoint = getStemConditionBend(
    0.5,
    0.5,
    WEATHER.drought.stemBend,
    WEATHER.disease.stemBend,
  )

  assert.equal(drought, WEATHER.drought.stemBend)
  assert.equal(disease, WEATHER.disease.stemBend)
  assert.ok(disease < drought)
  assert.equal(
    midpoint,
    (WEATHER.drought.stemBend + WEATHER.disease.stemBend) * 0.5,
  )
  assert.ok(midpoint < drought)
  assert.ok(midpoint > disease)
})
