import { useThree, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { useControls } from 'leva'
import useScenePass from './useScenePass'
import useDepthPass from './useDepthPass'
import useCompositePass from './useCompositePass'
import { useFBO } from '@react-three/drei'
import * as THREE from 'three'

export default function PostPipeline({ children, useEffectMaterial = false }) {

    /* ──────────────────────────── basic refs ──────────────────────────── */
    const { gl, size, camera, scene: mainScene } = useThree()

    /* 🎛  CENTRAL UI  ─────────────────────────────────────────── */
    const depthCfg = useControls('Depth FX', {
        blurNear: { value: 0.001, min: 0, max: 0.01, step: 0.0001 },
        blurFar: { value: 0.01, min: 0, max: 0.05, step: 0.0005 },
        colorMin: { value: 0.2, min: 0, max: 1, step: 0.01 },
        colorMax: { value: 0.8, min: 0, max: 1, step: 0.01 },
        tint: '#ffffff'
    })
    const { blend } = useControls('Composite', { blend: { value: 1, min: 0, max: 1, step: 0.01 } })

    /* FBOs */
    const fboScene = useFBO({ depthTexture: new THREE.DepthTexture(), stencilBuffer: false })
    const fboFX = useFBO({ stencilBuffer: false })

    /* Passes */
    const scenePass = useScenePass({ scene: mainScene, fbo: fboScene })

    const depthPass = useDepthPass({
        depthTex: fboScene.depthTexture,
        cfg: { ...depthCfg, near: camera.near, far: camera.far },
        size,
        fbo: fboFX
    })


    const compPass = useCompositePass({
        sceneTex: fboScene.texture,
        effectTex: useEffectMaterial ? fboFX.texture : fboScene.texture,
        blend,
        size,
    })

    /* Chain */
    const passes = useMemo(
        () => [scenePass, depthPass, compPass],
        [scenePass, depthPass, compPass]
    )
    const passesRef = useRef(passes)
    passesRef.current = passes

    /* Main loop */
    useFrame(() => {
        for (const p of passesRef.current) p.render(gl, camera)
    }, 1)

    return <>{children}</>
}
