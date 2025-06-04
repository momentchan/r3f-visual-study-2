uniform sampler2D tDepth;
uniform vec2 uResolution;

uniform float uCameraNear; // Renamed
uniform float uCameraFar;  // Renamed
uniform float uBlurNear;
uniform float uBlurFar;

uniform vec2 uDepthRange;  // [minDepth, maxDepth] for remapping (Renamed)
uniform vec3 uColorNear;   // color at near depth
uniform vec3 uColorFar;    // color at far depth
uniform sampler2D uGradientTex;

varying vec2 vUv;

float linearizeDepth(float z) {
  float ndc = z * 2.0 - 1.0;
  return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - ndc * (uCameraFar - uCameraNear)); // Updated
}

void main() {
  // Read center pixel depth
  float centerZ = texture2D(tDepth, vUv).r;
  float centerDepth = linearizeDepth(centerZ);
  float normDepth = clamp(centerDepth / uCameraFar, 0.0, 1.0); // Updated

  // Determine blur radius
  float blurRadius = mix(uBlurNear, uBlurFar, normDepth);
  vec2 texelSize = 1.0 / uResolution;

  float total = 0.0;
  float sum = 0.0;

  // 3x3 blur kernel on depth texture
  for(int x = -1; x <= 1; x++) {
    for(int y = -1; y <= 1; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * blurRadius;
      float d = linearizeDepth(texture2D(tDepth, vUv + offset).r);
      sum += d;
      total += 1.0;
    }
  }

  float blurredDepth = sum / total;
  float normBlurredDepth = clamp(blurredDepth / uCameraFar, 0.0, 1.0); // Updated

  // Remap depth to 0-1 based on user range
  float mapped = clamp((normBlurredDepth - uDepthRange.x) / (uDepthRange.y - uDepthRange.x), 0.0, 1.0); // Updated

  // Blend colors based on depth
  vec3 finalColor = mix(uColorNear, uColorFar, mapped);

  gl_FragColor = vec4(finalColor, 1.0);
}
