import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec3 cameraPos;
uniform mat4 projectionMatrix;
uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uMaxDistance;

float sceneSDF(vec3 p) {
  return length(p) - 1.0;
}

float raymarch(vec3 ro, vec3 rd, out float tHit) {
  float t = 0.0;
  for (int i = 0; i < 100; i++) {
    vec3 p = ro + rd * t;
    float d = sceneSDF(p);
    if (d < 0.001) {
      tHit = t;
      return 1.0;
    }
    if (t > uMaxDistance) break;
    t += d;
  }
  return 0.0;
}

float linearDepthToGL(float t) {
  float z = t / uCameraFar;
  return (uCameraFar + uCameraNear - (2.0 * uCameraNear * uCameraFar) / t) / (uCameraFar - uCameraNear);
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uResolution.x / uResolution.y;

  vec4 rayClip = vec4(uv, -1.0, 1.0);
  vec4 rayEye = inverse(projectionMatrix) * rayClip;
  rayEye = vec4(rayEye.xy, -1.0, 0.0);
  vec3 rayDir = normalize((inverse(viewMatrix) * rayEye).xyz);
  vec3 rayOrigin = cameraPos;

  float tHit;
  float hit = raymarch(rayOrigin, rayDir, tHit);

  if (hit > 0.5) {
    gl_FragColor = vec4(vec3(1.0), 1.0);
    gl_FragDepth = linearDepthToGL(tHit);
  } else {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // debug 用
  }
}
`

export default function RaymarchMesh() {
  const matRef = useRef()
  const { size, camera } = useThree()

  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.cameraPos.value.copy(camera.position)
      matRef.current.uniforms.viewMatrix.value.copy(camera.matrixWorldInverse)
    }
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthWrite={true}
        depthTest={true}
        transparent={true}
        uniforms={{
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          cameraPos: { value: camera.position.clone() },
          viewMatrix: { value: camera.matrixWorldInverse.clone() },
          projectionMatrix: { value: camera.projectionMatrix.clone() },
          uCameraNear: { value: camera.near },
          uCameraFar: { value: camera.far },
          uMaxDistance: { value: 20.0 }
        }}
      />
    </mesh>
  )
}
