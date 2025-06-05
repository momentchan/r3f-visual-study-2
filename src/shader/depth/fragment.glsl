precision highp float;

uniform sampler2D tDepth;
uniform sampler2D uGradientTex;

uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uBlurNear;
uniform float uBlurFar;
uniform float uDepthThres;
uniform float uDepthValue;

uniform vec2 uDepthRange;
uniform vec3 uColorNear;
uniform vec3 uColorFar;
uniform float uGradientMix;

uniform float uWave;

varying vec2 vUv;

// 線性化 depth
float linearizeDepth(float z) {
  float ndc = z * 2.0 - 1.0;
  return (2.0 * uCameraNear * uCameraFar) /
    (uCameraFar + uCameraNear - ndc * (uCameraFar - uCameraNear));
}

void main() {
  vec2 texelSize = 1.0 / uResolution;

  // 取中心 pixel 深度
  float centerZ = texture2D(tDepth, vUv).r;
  float centerDepth = linearizeDepth(centerZ);
  float normDepth = clamp(centerDepth / uCameraFar, 0.0, 1.0);

  // 計算模糊半徑
  float blurRadius = mix(uBlurNear, uBlurFar, normDepth);

  // 3x3 模糊
  float sum = 0.0;
  float total = 0.0;

  for(int x = -1; x <= 1; x++) {
    for(int y = -1; y <= 1; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * blurRadius;
      float d = linearizeDepth(texture2D(tDepth, vUv + offset).r);
      sum += d;
      total += 1.0;
    }
  }

  float blurred = sum / total;
  float depth = clamp(blurred / uCameraFar, 0.0, 1.0);
  float normalizeDepth = clamp((depth - uDepthRange.x) / (uDepthRange.y - uDepthRange.x), 0.0, 1.0); // Updated

  float dTest = mix(uDepthRange.x, uDepthRange.y, uDepthThres);
  float segA = uDepthValue * (normalizeDepth - uDepthRange.x) / (dTest - uDepthRange.x);
  float segB = uDepthValue + (1.0 - uDepthValue) * (normalizeDepth - dTest) / (uDepthRange.y - dTest);
  float mapped = mix(segA, segB, step(dTest, normalizeDepth));
  mapped = clamp(mapped, 0.0, 1.0);

  float waveCount = 5.0;
  float waveWidth = 0.01; 
  float waveSpacing = 0.3; 

  float waveSum = 0.0;

  for(float i = 0.0; i < waveCount; i += 1.0) {
    float waveCenter = mod(uWave + i * waveSpacing, 1.0);
    waveSum += smoothstep(waveWidth, 0.0, abs(normalizeDepth - waveCenter));
  }

  waveSum = clamp(waveSum, 0.0, 1.0);
  mapped += waveSum;

  vec3 baseColor = mix(uColorNear, uColorFar, mapped);
  vec3 gradientColor = texture2D(uGradientTex, vec2(mapped, 0.5)).rgb;
  vec3 finalColor = mix(baseColor, gradientColor, uGradientMix);

  gl_FragColor = vec4(finalColor, 1.0);
}
