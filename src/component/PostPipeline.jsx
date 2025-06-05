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
        blurNear: { value: 0.01, min: 0, max: 50, step: 0.001 },
        blurFar: { value: 0.01, min: 0, max: 50, step: 0.001 },
        depthMin: { value: 0.4, min: 0, max: 1, step: 0.001 },
        depthMax: { value: 1, min: 0, max: 1, step: 0.001 },
        depthThres: { value: 0.2, min: 0, max: 1, step: 0.001 },
        depthValue: { value: 0.5, min: 0, max: 1, step: 0.001 },
        tint: '#ffffff',
        colorNear: '#000000',
        colorFar: '#ffffff'
    })
    const { blend } = useControls('Composite', { blend: { value: 1, min: 0, max: 1, step: 0.01 } })

    /* FBOs */
    const fboScene = useFBO({ depthTexture: new THREE.DepthTexture(), stencilBuffer: false })
    const fboFX = useFBO({ stencilBuffer: false })

    /* Passes */
    const scenePass = useScenePass({ scene: mainScene, fbo: fboScene })

    const waveRef = useRef(0);
    const directionRef = useRef(1); // 1 for forward, -1 for backward
    const durationRef = useRef(3); // current wave duration (in seconds)
    const elapsedRef = useRef(0);  // how much time has passed in this wave

    useFrame((_, delta) => {
        // 累積時間
        elapsedRef.current += delta;

        if (elapsedRef.current >= durationRef.current) {
            elapsedRef.current = 0;
            directionRef.current *= -1;
            durationRef.current = 8; // 新的 duration: 2～5秒
        }

        const t = elapsedRef.current / durationRef.current;
        waveRef.current = directionRef.current === 1 ? t : 1 - t;


        if (depthPass?.material?.uniforms?.uWave) {
            depthPass.material.uniforms.uWave.value = waveRef.current;
        }
    });

    const depthPass = useDepthPass({
        depthTex: fboScene.depthTexture,
        cfg: { ...depthCfg, near: camera.near, far: camera.far },
        size,
        fbo: fboFX,
        wave: waveRef.current
    })

    const compPass = useCompositePass({
        sceneTex: fboScene.texture,
        effectTex: useEffectMaterial ? fboFX.texture : fboScene.texture,
        blend,
        size,
        depthTex: fboScene.depthTexture,
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
