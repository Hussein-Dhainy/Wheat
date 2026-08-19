precision highp float;

uniform sampler2D uFieldTexture;
uniform vec2 uTexelSize;
uniform float uBlurRadius;
uniform vec2 uDirection;

varying vec2 vUv;

void main() {
  vec2 blurDirection = uDirection * uTexelSize * uBlurRadius;
  vec2 nearOffset = blurDirection * 1.3846153846;
  vec2 farOffset = blurDirection * 3.2307692308;
  vec4 color = vec4(0.0);
  vec4 sampleColor = texture2D(uFieldTexture, vUv);

  color.rgb += sampleColor.rgb * sampleColor.a * 0.2270270270;
  color.a += sampleColor.a * 0.2270270270;

  sampleColor = texture2D(uFieldTexture, vUv + nearOffset);
  color.rgb += sampleColor.rgb * sampleColor.a * 0.3162162162;
  color.a += sampleColor.a * 0.3162162162;
  sampleColor = texture2D(uFieldTexture, vUv - nearOffset);
  color.rgb += sampleColor.rgb * sampleColor.a * 0.3162162162;
  color.a += sampleColor.a * 0.3162162162;
  sampleColor = texture2D(uFieldTexture, vUv + farOffset);
  color.rgb += sampleColor.rgb * sampleColor.a * 0.0702702703;
  color.a += sampleColor.a * 0.0702702703;
  sampleColor = texture2D(uFieldTexture, vUv - farOffset);
  color.rgb += sampleColor.rgb * sampleColor.a * 0.0702702703;
  color.a += sampleColor.a * 0.0702702703;

  if (color.a < 0.001) discard;

  color.rgb /= max(color.a, 0.001);
  gl_FragColor = color;
}
