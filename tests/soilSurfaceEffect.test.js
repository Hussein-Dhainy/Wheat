import assert from 'node:assert/strict'
import test from 'node:test'
import { Mesh, MeshStandardMaterial, PlaneGeometry, ShaderMaterial } from 'three'
import { PREDICTION_RENDER_CONFIG } from '../src/experience/scenes/prediction/predictionConfig.js'
import {
  createSoilSurfaceOverlay,
  estimateUvToWorldScale,
} from '../src/experience/scenes/prediction/soilSurfaceEffect.js'

test('UV metric compensates for differently scaled surface axes', () => {
  const geometry = new PlaneGeometry(2, 4)
  const scale = estimateUvToWorldScale(geometry, 1)

  assert.ok(Math.abs(scale.x - 2) < 0.001)
  assert.ok(Math.abs(scale.y - 4) < 0.001)

  geometry.dispose()
})

test('soil surface overlay leaves the hero material untouched', () => {
  const geometry = new PlaneGeometry(1, 1)
  const heroMaterial = new MeshStandardMaterial()
  const sourceMesh = new Mesh(geometry, heroMaterial)
  const originalCompileHook = heroMaterial.onBeforeCompile
  const { material, mesh, uniforms } = createSoilSurfaceOverlay(
    sourceMesh,
    PREDICTION_RENDER_CONFIG.weather.soil,
    1,
  )

  assert.equal(sourceMesh.material, heroMaterial)
  assert.equal(heroMaterial.onBeforeCompile, originalCompileHook)
  assert.ok(material instanceof ShaderMaterial)
  assert.equal(mesh.geometry, sourceMesh.geometry)
  assert.equal(mesh.visible, false)
  assert.match(material.vertexShader, /vSoilLocalPosition/)
  assert.match(material.vertexShader, /vSoilUv/)
  assert.match(material.fragmentShader, /vSoilUv \* uSoilUvToWorldScale/)
  assert.match(material.fragmentShader, /surfaceCoordinate\.y -= uSoilTime \* uSoilSpeed/)
  assert.equal(uniforms.uSoilMappingMode.value, 0)
  assert.ok(Math.abs(uniforms.uSoilUvToWorldScale.value.x - 1) < 0.001)
  assert.ok(Math.abs(uniforms.uSoilUvToWorldScale.value.y - 1) < 0.001)
  assert.equal(uniforms.uSoilStrength.value, 0)
  assert.equal(uniforms.uSoilTime.value, 0)

  geometry.dispose()
  heroMaterial.dispose()
  material.dispose()
})

test('soil surface overlay uses upward cylindrical flow for the wheat head', () => {
  const geometry = new PlaneGeometry(1, 1)
  const heroMaterial = new MeshStandardMaterial()
  const sourceMesh = new Mesh(geometry, heroMaterial)
  sourceMesh.name = 'plant1head1'
  const { material, uniforms } = createSoilSurfaceOverlay(
    sourceMesh,
    PREDICTION_RENDER_CONFIG.weather.soil,
    1,
  )

  assert.equal(uniforms.uSoilMappingMode.value, 1)
  assert.match(material.fragmentShader, /atan\(vSoilLocalPosition\.z, vSoilLocalPosition\.x\)/)
  assert.match(material.fragmentShader, /vSoilLocalPosition\.y \* uSoilModelScale/)

  geometry.dispose()
  heroMaterial.dispose()
  material.dispose()
})
