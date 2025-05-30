import { useThree, useFrame } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useMemo } from 'react'
import { useControls } from 'leva'
import * as THREE from 'three'

/* 全螢幕 VS */
const fullVS = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }
`;

/* 深度後製 FS（請替換成自己的） */
import depthFS from '../shader/depth/fragment.glsl'

/* 合成 FS：把場景與深度特效 mix，可自行改 blend 方式 */
const mixFS = /* glsl */`
  uniform sampler2D tScene;
  uniform sampler2D tEffect;
  uniform float uBlend;
  varying vec2 vUv;
  void main(){
    vec3 a = texture2D(tScene ,vUv).rgb;
    vec3 b = texture2D(tEffect,vUv).rgb;
    gl_FragColor = vec4(mix(a,b,uBlend),1.0);
  }
`;

export default function PostPipeline({
    children,
    debug = true,    // 是否顯示左上縮圖
    sizePx = 180,     // 縮圖邊長
    useEffectMaterial = false  // 是否啟用深度特效 (FBO B) 與最終合成
}) {
    const { gl, size, camera, scene: mainScene } = useThree()

    /* Leva 控制 */
    const dCfg = useControls('Depth FX', {
        blurNear: { value: 0.001, min: 0, max: 0.01, step: 0.0001 },
        blurFar: { value: 0.01, min: 0, max: 0.05, step: 0.0005 },
        colorMin: { value: 0.2, min: 0, max: 1, step: 0.01 },
        colorMax: { value: 0.8, min: 0, max: 1, step: 0.01 },
        tint: '#ffffff'
    })
    const { blend } = useControls('Composite', { blend: { value: 0, min: 0, max: 1, step: 0.01 } })

    /* FBO A（場景） & FBO B（深度特效） */
    const fboA = useFBO({ depthTexture: new THREE.DepthTexture(), stencilBuffer: false })
    const fboB = useEffectMaterial ? useFBO({ stencilBuffer: false }) : null

    /* 幾何 */
    const plane2 = useMemo(() => new THREE.PlaneGeometry(2, 2), [])

    /* 深度 ShaderMaterial (→ FBO B) */
    const depthMat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: fullVS,
        fragmentShader: depthFS,
        uniforms: {
            tDepth: { value: fboA.depthTexture },
            uResolution: { value: [size.width, size.height] },
            cameraNear: { value: camera.near },
            cameraFar: { value: camera.far },
            uBlurNear: { value: dCfg.blurNear },
            uBlurFar: { value: dCfg.blurFar },
            uColorRange: { value: new THREE.Vector2(dCfg.colorMin, dCfg.colorMax) },
            uColor: { value: new THREE.Color(dCfg.tint) }
        }
    }), [])

    /* Full-screen Material：若啟用後製則用 mixFS，否則直接貼 fboA.texture */
    const screenMat = useMemo(() => (
        useEffectMaterial
            ? new THREE.ShaderMaterial({
                vertexShader: fullVS,
                fragmentShader: mixFS,
                uniforms: {
                    tScene: { value: fboA.texture },
                    tEffect: { value: fboB.texture },
                    uBlend: { value: blend }
                }
            })
            : new THREE.MeshBasicMaterial({ map: fboA.texture, toneMapped: false })
    ), [])

    /* ---------- overlayScene：全螢幕 + DebugQuad ---------- */
    const overlayScene = useMemo(() => {
        const s = new THREE.Scene()

        /* Full-screen Quad */
        const fullQuad = new THREE.Mesh(plane2, screenMat)
        fullQuad.renderOrder = 0
        s.add(fullQuad)

        /* DebugQuad（左上角） */
        if (debug) {
            const dbgMat = new THREE.MeshBasicMaterial({ map: fboA.texture, toneMapped: false, depthTest: false })
            const dbg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dbgMat)
            dbg.renderOrder = 1
            s.add(dbg)
            dbg.userData.isDebug = true
        }
        return s
    }, [debug])

    /* ------- 深度處理 Scene (→ fboB) ------- */
    const sceneDepth = useMemo(() => {
        const s = new THREE.Scene()
        if (useEffectMaterial) s.add(new THREE.Mesh(plane2, depthMat))
        return s
    }, [useEffectMaterial])

    const overlayCam = useMemo(
        () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
        []
    )

    /* -------- 渲染迴圈 -------- */
    useFrame(() => {
        /* 更新 depthMat uniform */
        depthMat.uniforms.uBlurNear.value = dCfg.blurNear
        depthMat.uniforms.uBlurFar.value = dCfg.blurFar
        depthMat.uniforms.uColorRange.value.set(dCfg.colorMin, dCfg.colorMax)
        depthMat.uniforms.uColor.value.set(dCfg.tint)

        if (useEffectMaterial) screenMat.uniforms.uBlend.value = blend

        /* ① children → fboA */
        gl.setRenderTarget(fboA)
        gl.clear()
        gl.render(mainScene, camera)

        /* ② depthMat → fboB */
        if (useEffectMaterial) {
            gl.setRenderTarget(fboB)
            gl.clear()
            gl.render(sceneDepth, camera)
        }

        /* ③ overlayScene → 畫面 */
        // 更新 DebugQuad 尺寸/位置
        if (debug) {
            const dbg = overlayScene.children.find(m => m.userData.isDebug)
            const ndcW = (sizePx / size.width) * 2
            const ndcH = (sizePx / size.height) * 2
            dbg.scale.set(ndcW, ndcH, 1)
            dbg.position.set(-1 + ndcW / 2, 1 - ndcH / 2, 0)
        }

        /* ③ overlayScene → 螢幕 (用 overlayCam) */
        gl.setRenderTarget(null)
        gl.clearDepth()
        gl.render(overlayScene, overlayCam)  // ⬅️ 只用這支相機
    }, 1)

    return <group>{children}</group>
}
