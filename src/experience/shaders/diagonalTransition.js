export const diagonalTransitionVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const diagonalTransitionFragmentShader = /* glsl */ `
  uniform sampler2D uSceneA;
  uniform sampler2D uSceneB;
  uniform float uProgress;
  uniform float uSlope;
  uniform float uOverscan;

  varying vec2 vUv;

  void main() {
    vec4 sceneA = texture2D(uSceneA, vUv);
    vec4 sceneB = texture2D(uSceneB, vUv);
    float progress = clamp(uProgress, 0.0, 1.0);
    float overscan = max(uOverscan, 0.0);
    float startLeft = -overscan - max(0.0, uSlope);
    float travel = 1.0 + abs(uSlope) + overscan * 2.0;
    float boundary = startLeft + travel * progress + vUv.x * uSlope;
    float sceneBMask = 1.0 - step(boundary, vUv.y);

    gl_FragColor = mix(sceneA, sceneB, sceneBMask);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
