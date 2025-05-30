import { useFBO } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

/* ----------------------------- */
/* ① 你的深度後製 Shader（FBO B） */
/* ----------------------------- */
import depthFragment from '../shader/depth/fragment.glsl'
import { useControls } from 'leva'
const depthVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

/* ----------------------------- */
/* ② 最終合成 Shader（螢幕輸出）  */
/* ----------------------------- */
const finalFragment = /* glsl */ `
  uniform sampler2D tScene;   // from FBO A (color)
  uniform sampler2D tEffect;  // from FBO B
  uniform float uBlend;        // 混合比例
  varying vec2 vUv;
  void main() {
    vec3 sceneCol = texture2D(tScene,  vUv).rgb;
    vec3 fxCol    = texture2D(tEffect, vUv).rgb;
    gl_FragColor = vec4(mix(sceneCol, fxCol, uBlend), 1.0);
  }
`

export default function PostPipeline({ children, debug = false }) {
  const { size, gl, camera, scene: mainScene } = useThree()

 /* ------- ✨ Leva 參數 --------- */
  const { blurNear, blurFar, colorMin, colorMax, tint } = useControls('Depth FX', {
    blurNear: { value: 0.001, min: 0.0, max: 0.01, step: 0.0001 },
    blurFar:  { value: 0.01,  min: 0.0, max: 0.05, step: 0.0005 },
    colorMin: { value: 0.2,   min: 0.0, max: 1.0,   step: 0.01  },
    colorMax: { value: 0.8,   min: 0.0, max: 1.0,   step: 0.01  },
    tint:     '#ffffff'
  })


  const { blend } = useControls('Composite', {
    blend: { value: 0.0, min: 0.0, max: 1, step: 0.01 },
  })


  /* ---------- FBO A：場景 color+depth ---------- */
  const fboA = useFBO({
    depthTexture: new THREE.DepthTexture(),
    stencilBuffer: false
  })

  /* ---------- FBO B：深度後製 ---------- */
  const fboB = useFBO({ stencilBuffer: false })

  /* ---------- 全螢幕 Quad 幾何 ---------- */
  const quadGeo = useMemo(() => new THREE.PlaneGeometry(2, 2), [])

  /* ---------- ShaderMaterial：深度處理 ---------- */
  const depthMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: depthVertex,
        fragmentShader: depthFragment,
        uniforms: {
          tDepth:      { value: fboA.depthTexture },
          uResolution: { value: [size.width, size.height] },
          cameraNear:  { value: camera.near },
          cameraFar:   { value: camera.far },
          uBlurNear:   { value: blurNear },
          uBlurFar:    { value: blurFar },
          uColorRange: { value: new THREE.Vector2(colorMin, colorMax) },
          uColor:      { value: new THREE.Color(tint) }
        }
      }),
    [] // 一次建立，動態值在 useFrame 更新
  )

  /* ---------- ShaderMaterial：最終合成 ---------- */
  const finalMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: depthVertex,
        fragmentShader: finalFragment,
        uniforms: {
          tScene:  { value: fboA.texture },
          tEffect: { value: fboB.texture },
            uBlend:  { value: blend }
        }
      }),
    []
  )

  /* ---------- 兩個離屏 Scene（quadSceneA / quadSceneB） ---------- */
  const quadSceneA = useMemo(() => {
    const s = new THREE.Scene()
    s.add(new THREE.Mesh(quadGeo, depthMat))
    return s
  }, [quadGeo, depthMat])

  const quadSceneB = useMemo(() => {
    const s = new THREE.Scene()
    s.add(new THREE.Mesh(quadGeo, finalMat))
    return s
  }, [quadGeo, finalMat])

  /* ---------- 每幀渲染順序 ---------- */
  useFrame(() => {
    
 /* 動態更新 depthMat uniform（Leva 參數） */
    depthMat.uniforms.uBlurNear.value   = blurNear
    depthMat.uniforms.uBlurFar.value    = blurFar
    depthMat.uniforms.uColorRange.value.set(colorMin, colorMax)
    depthMat.uniforms.uColor.value.set(tint)


    finalMat.uniforms.uBlend.value = blend
    /* ① Render children → FBO A */
    gl.setRenderTarget(fboA)
    gl.clear()
    gl.render(mainScene, camera)

    /* ② Depth 處理 → FBO B */
    gl.setRenderTarget(fboB)
    gl.clear()
    gl.render(quadSceneA, camera)

    /* ③ 合成 → 螢幕 */
    gl.setRenderTarget(null)
    gl.render(quadSceneB, camera)
  }, 1) // 優先級設 1，確保在默認渲染之後

  /* ---------- Debug Overlay（可選） ---------- */
  return (
    <>
      {/* 把 children (你的 3D 物件) 掛進主 Scene */}
      <group layers={0}>{children}</group>

      {debug && (
        <mesh position={[-1.2, 1.2, -1]} scale={[0.4, 0.4, 0.4]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={fboA.texture} toneMapped={false} />
        </mesh>
      )}
    </>
  )
}
