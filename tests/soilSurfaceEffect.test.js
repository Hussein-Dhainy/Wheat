import assert from 'node:assert/strict'
import test from 'node:test'
import { Mesh, MeshStandardMaterial, PlaneGeometry, ShaderMaterial } from 'three'
import { PREDICTION_RENDER_CONFIG } from '../src/experience/scenes/prediction/predictionConfig.js'
import { createSoilSurfaceOverlay } from '../src/experience/scenes/prediction/soilSurfaceEffect.js'

test('soil surface overlay leaves the hero material untouched', () => {
  const geometry = new PlaneGeometry(1, 1)
  const heroMaterial = new MeshStandardMaterial()
  const sourceMesh = new Mesh(geometry, heroMaterial)
  const originalCompileHook = heroMaterial.onBeforeCompile
  const { material, mesh, uniforms } = createSoilSurfaceOverlay(
    sourceMesh,
    PREDICTION_RENDER_CONFIG.weather.soil,
  )

  assert.equal(sourceMesh.material, heroMaterial)
  assert.equal(heroMaterial.onBeforeCompile, originalCompileHook)
  assert.ok(material instanceof ShaderMaterial)
  assert.equal(mesh.geometry, sourceMesh.geometry)
  assert.equal(mesh.visible, false)
  assert.match(material.vertexShader, /vSoilWorldY = worldPosition\.y/)
  assert.match(material.fragmentShader, /gl_FragCoord\.x/)
  assert.match(
    material.fragmentShader,
    /vSoilWorldY \* uSoilPixelsPerWorldUnit/,
  )
  assert.match(
    material.fragmentShader,
    /flowCoordinate\.y -= uSoilTime\s*\* uSoilSpeed/,
  )
  assert.doesNotMatch(material.fragmentShader, /vSoilUv/)
  assert.doesNotMatch(material.fragmentShader, /vSoilLocalPosition/)
  assert.equal(uniforms.uSoilParticleSpacing.value, 22)
  assert.equal(uniforms.uSoilPixelRatio.value, 1)
  assert.equal(uniforms.uSoilPixelsPerWorldUnit.value, 1)
  assert.equal(uniforms.uSoilStrength.value, 0)
  assert.equal(uniforms.uSoilTime.value, 0)
  assert.equal(uniforms.uSoilSpeed.value, 40)

  geometry.dispose()
  heroMaterial.dispose()
  material.dispose()
})

test('the wheat head uses the same screen-vertical flow as every other part', () => {
  const geometry = new PlaneGeometry(1, 1)
  const heroMaterial = new MeshStandardMaterial()
  const sourceMesh = new Mesh(geometry, heroMaterial)
  sourceMesh.name = 'plant1head1'
  const { material, uniforms } = createSoilSurfaceOverlay(
    sourceMesh,
    PREDICTION_RENDER_CONFIG.weather.soil,
  )

  assert.equal(uniforms.uSoilParticleSpacing.value, 22)
  assert.match(material.fragmentShader, /gl_FragCoord\.x/)
  assert.match(material.fragmentShader, /vSoilWorldY/)
  assert.doesNotMatch(material.fragmentShader, /atan\(/)

  geometry.dispose()
  heroMaterial.dispose()
  material.dispose()
})
