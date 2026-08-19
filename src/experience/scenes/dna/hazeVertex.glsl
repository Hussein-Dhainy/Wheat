varying vec2 vUv;

void main() {
  vUv = uv;

  // The haze is a screen-space layer, independent of the scene camera and
  // DNA motion. Plane positions already span the full clip-space viewport.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
