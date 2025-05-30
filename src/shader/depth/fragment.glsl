uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;
varying vec2 vUv;

float linearizeDepth(float z) {
  float ndc = z * 2.0 - 1.0;
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - ndc * (cameraFar - cameraNear));
}

void main() {
  float z = texture2D(tDepth, vUv).r;
  float depth = linearizeDepth(z);
  float normalized = depth / cameraFar;
  gl_FragColor = vec4(vec3(normalized), 1.0);
}