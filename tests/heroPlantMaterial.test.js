import test from 'node:test'
import assert from 'node:assert/strict'
import { Color, MeshPhysicalMaterial, Texture } from 'three'

import {
  applyHeroConditionTint,
  configureHeroPlantMaterial,
} from '../src/experience/scenes/prediction/heroPlantMaterial.js'
import { PREDICTION_RENDER_CONFIG } from '../src/experience/scenes/prediction/predictionConfig.js'

test('hero plant material is matte, non-metallic, and keeps stronger normal detail', () => {
  const material = new MeshPhysicalMaterial({
    metalness: 1,
    normalMap: new Texture(),
    roughness: 0.25,
  })
  material.metalnessMap = new Texture()
  material.roughnessMap = new Texture()

  configureHeroPlantMaterial(
    material,
    PREDICTION_RENDER_CONFIG.heroMaterial,
    PREDICTION_RENDER_CONFIG.weather.drought,
  )

  assert.equal(material.roughness, 0.85)
  assert.equal(material.roughnessMap, null)
  assert.equal(material.metalness, 0)
  assert.equal(material.metalnessMap, null)
  assert.equal(material.specularIntensity, 0.18)
  assert.equal(material.ior, 1.4)
  assert.equal(material.normalScale.x, 1.7)
  assert.equal(material.normalScale.y, 1.7)

  const shader = {
    fragmentShader: '#include <common>\n#include <map_fragment>',
    uniforms: {},
  }
  material.onBeforeCompile(shader)
  assert.match(shader.fragmentShader, /predictionHeroDroughtStrength/)
  assert.equal(
    shader.uniforms.uHeroDroughtColor.value.getHexString(),
    new Color(PREDICTION_RENDER_CONFIG.weather.drought.heroTint).getHexString(),
  )

  material.dispose()
})

test('hero plant transitions to its golden-brown drought tint', () => {
  const material = new MeshPhysicalMaterial({ color: '#ffffff' })
  configureHeroPlantMaterial(
    material,
    PREDICTION_RENDER_CONFIG.heroMaterial,
    PREDICTION_RENDER_CONFIG.weather.drought,
  )
  const state = {
    baseColor: material.color.clone(),
    droughtColor: new Color(PREDICTION_RENDER_CONFIG.weather.drought.heroTint),
    material,
  }

  applyHeroConditionTint(state, 1)
  assert.equal(material.color.getHexString(), state.droughtColor.getHexString())
  assert.equal(
    material.userData.predictionHeroDroughtUniforms.uHeroDrought.value,
    1,
  )

  applyHeroConditionTint(state, 0, 1)
  assert.equal(material.color.getHexString(), state.baseColor.getHexString())
  assert.equal(
    material.userData.predictionHeroDroughtUniforms.uHeroDrought.value,
    0,
  )

  material.dispose()
})

test('hero plant stays healthy when the field disease condition is active', () => {
  const material = new MeshPhysicalMaterial({ color: '#ffffff' })
  const state = {
    baseColor: material.color.clone(),
    droughtColor: new Color(PREDICTION_RENDER_CONFIG.weather.drought.heroTint),
    material,
  }

  applyHeroConditionTint(state, 0, 1)
  assert.equal(material.color.getHexString(), state.baseColor.getHexString())

  material.dispose()
})
