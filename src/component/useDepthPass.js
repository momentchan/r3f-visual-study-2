import { useMemo } from 'react'
import * as THREE from 'three'
import fullVS from '../shader/fullscreen.glsl'
import depthFS from '../shader/depth/fragment.glsl'

export default function useDepthPass({ depthTex, cfg, size, fbo }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: fullVS,
    fragmentShader: depthFS,
    uniforms: {
      tDepth: { value: depthTex },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      cameraNear: { value: cfg.near },
      cameraFar: { value: cfg.far },
      uBlurNear: { value: cfg.blurNear },
      uBlurFar: { value: cfg.blurFar },
      uColorRange: { value: new THREE.Vector2(cfg.colorMin, cfg.colorMax) },
      uColor: { value: new THREE.Color(cfg.tint) }
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
    uni.uColorRange.value.set(cfg.colorMin, cfg.colorMax)
    uni.uColor.value.set(cfg.tint)
    uni.cameraNear.value = cfg.near
    uni.cameraFar.value = cfg.far
    uni.uResolution.value.set(size.width, size.height)

    renderer.setRenderTarget(fbo)
    renderer.clear()
    renderer.render(scene, cam)
  }

  return { scene, camera: cam, material: mat, render }
}
