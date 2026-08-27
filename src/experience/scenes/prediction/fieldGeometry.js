import {
  LinearFilter,
  Mesh,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three'
import fieldBlurFragmentShader from './fieldBlurFragment.glsl?raw'
import fieldBlurVertexShader from './fieldBlurVertex.glsl?raw'

export function createRenderTarget(depthBuffer) {
  const target = new WebGLRenderTarget(1, 1, {
    depthBuffer,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    stencilBuffer: false,
  })
  target.texture.generateMipmaps = false
  return target
}

export function createBlurPass(sourceTexture, blurRadius) {
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2)
  camera.position.z = 1
  const geometry = new PlaneGeometry(2, 2)
  const material = new ShaderMaterial({
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: fieldBlurFragmentShader,
    toneMapped: false,
    transparent: true,
    uniforms: {
      uBlurRadius: { value: blurRadius },
      uDirection: { value: new Vector2(1, 0) },
      uFieldTexture: { value: sourceTexture },
      uTexelSize: { value: new Vector2(1, 1) },
    },
    vertexShader: fieldBlurVertexShader,
  })
  scene.add(new Mesh(geometry, material))
  return { camera, geometry, material, scene }
}
