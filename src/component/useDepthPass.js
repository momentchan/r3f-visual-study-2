import { useMemo } from 'react'
import * as THREE from 'three'
import fullVS from '../shader/fullscreen.glsl'
import depthFS from '../shader/depth/fragment.glsl'
import { useTexture } from '@react-three/drei'

export default function useDepthPass({ depthTex, cfg, size, fbo,wave }) {
  const tex = useTexture('./Gradient.png')
  
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: fullVS,
    fragmentShader: depthFS,
    uniforms: {
      tDepth: { value: depthTex },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uCameraNear: { value: cfg.near },
      uCameraFar: { value: cfg.far },
      uDepthThres: { value: cfg.depthThres },
      uBlurNear: { value: cfg.blurNear },
      uBlurFar: { value: cfg.blurFar },
      uDepthRange: { value: new THREE.Vector2(cfg.depthMin, cfg.depthMax) },
      uColor: { value: new THREE.Color(cfg.tint) },
      uGradientTex: { value: tex },
      uColorNear: { value: new THREE.Color(cfg.colorNear) },
      uColorFar: { value: new THREE.Color(cfg.colorFar) },
      uDepthValue: { value: cfg.depthValue },
      uWave: { value: 0 }, // Initialize wave uniform
    },
    name: 'DepthPassMaterial'
  }), [depthTex])

  const quad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), [])
  const scene = useMemo(() => { const s = new THREE.Scene(); s.add(quad); return s }, [])
  const cam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

  const render = (renderer) => {
    const uni = mat.uniforms
    uni.uBlurNear.value = cfg.blurNear
    uni.uBlurFar.value = cfg.blurFar
    uni.uDepthRange.value.set(cfg.depthMin, cfg.depthMax)
    uni.uColor.value.set(cfg.tint)
    uni.uCameraNear.value = cfg.near
    uni.uCameraFar.value = cfg.far
    uni.uResolution.value.set(size.width, size.height)
    uni.uGradientTex.value = tex
    uni.uColorNear.value.set(cfg.colorNear)
    uni.uColorFar.value.set(cfg.colorFar)
    uni.uDepthThres.value = cfg.depthThres
    uni.uDepthValue.value = cfg.depthValue
    

    renderer.setRenderTarget(fbo)
    renderer.clear()
    renderer.render(scene, cam)
  }

  return { scene, camera: cam, material: mat, render }
}
