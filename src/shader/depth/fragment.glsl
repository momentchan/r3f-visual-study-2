uniform sampler2D tDepth;
uniform vec2 uResolution;

uniform float cameraNear;
uniform float cameraFar;
uniform float uBlurNear;
uniform float uBlurFar;

uniform vec2 uColorRange;  // [minDepth, maxDepth] for remapping
uniform vec3 uColor;       // final color tint

varying vec2 vUv;

float linearizeDepth(float z) {
  float ndc = z * 2.0 - 1.0;
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - ndc * (cameraFar - cameraNear));
}

void main() {
  // Read center pixel depth
  float centerZ = texture2D(tDepth, vUv).r;
  float centerDepth = linearizeDepth(centerZ);
  float normDepth = clamp(centerDepth / cameraFar, 0.0, 1.0);

  // Determine blur radius
  float blurRadius = mix(uBlurNear, uBlurFar, normDepth);
  vec2 texelSize = 1.0 / uResolution;

  float total = 0.0;
  float sum = 0.0;

  // 3x3 blur kernel on depth texture
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * blurRadius;
      float d = linearizeDepth(texture2D(tDepth, vUv + offset).r);
      sum += d;
      total += 1.0;
    }
  }

  float blurredDepth = sum / total;

  // Remap depth to 0-1 based on user range
  float mapped = clamp((blurredDepth - uColorRange.x) / (uColorRange.y - uColorRange.x), 0.0, 1.0);

  // Final output color
  vec3 finalColor = mapped * uColor;

  gl_FragColor = vec4(finalColor, 1.0);
}
