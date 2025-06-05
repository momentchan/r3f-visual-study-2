import { useMemo, useRef, useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import fullVS from '../shader/fullscreen.glsl'

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

export default function useCompositePass({
    sceneTex,
    effectTex,
    blend,
    sizePx = 180,
    size,
    debugOnStart = true,
    depthTex
}) {
    const [showDebug, setShowDebug] = useState(true)

    /* toggle with “D” key */
    useEffect(() => {
        const toggle = e => e.key.toLowerCase() === 'd' && setShowDebug(v => !v)
        window.addEventListener('keydown', toggle)
        return () => window.removeEventListener('keydown', toggle)
    }, [])

    /* ————————————————— full-screen material ————————————————— */
    const material = useMemo(() => new THREE.ShaderMaterial({
        name: 'CompositePassMaterial',
        vertexShader: fullVS,
        fragmentShader: mixFS,
        uniforms: {
            tScene: { value: sceneTex },
            tEffect: { value: effectTex },
            uBlend: { value: blend }
        }
    }), [sceneTex, effectTex])

    /* ————————————————— scene & meshes ————————————————— */
    const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])
    const fullQuad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material), [material])
    const scene = useMemo(() => {
        const s = new THREE.Scene()
        s.add(fullQuad)
        return s
    }, [fullQuad, material])


    const dbgRef = useRef(null)
    const depthDbgRef = useRef(null)

    useEffect(() => {
        /* remove old debug quad (if any) */
        if (dbgRef.current) {
            scene.remove(dbgRef.current)
            dbgRef.current.geometry.dispose()
            dbgRef.current.material.dispose()
            dbgRef.current = null
        }

        if (depthDbgRef.current) {
            scene.remove(depthDbgRef.current)
            depthDbgRef.current.geometry.dispose()
            depthDbgRef.current.material.dispose()
            depthDbgRef.current = null
        }

        if (showDebug) {
            const mat = new THREE.MeshBasicMaterial({
                map: sceneTex,
                toneMapped: false,
                depthTest: false
            })
            const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
            quad.renderOrder = 1
            scene.add(quad)
            dbgRef.current = quad

            if (depthTex) {
                const depthMat = new THREE.ShaderMaterial({
                    vertexShader: `varying vec2 vUv;
                        void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); // ✅ 正確考慮 camera + object transform
                        }`,
                    fragmentShader: `
                        uniform sampler2D tDepth;
                        uniform float uCameraNear;
                        uniform float uCameraFar;
                        varying vec2 vUv;

                        float linearizeDepth(float z) {
                            float ndc = z * 2.0 - 1.0;
                            return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - ndc * (uCameraFar - uCameraNear));
                        }

                        void main() {
                            float raw = texture2D(tDepth, vUv).r;
                            float linear = 1.0 - linearizeDepth(raw) / uCameraFar; // normalize
                            gl_FragColor = vec4(vec3(linear), 1.0);
                        }
                        `,
                    uniforms: {
                        tDepth: { value: depthTex },
                        uCameraNear: { value: 0.1 }, // default, can update later
                        uCameraFar: { value: 100.0 }
                    },
                    toneMapped: false
                })

                const depthQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), depthMat)
                depthQuad.renderOrder = 1
                scene.add(depthQuad)
                depthDbgRef.current = depthQuad
            }
        }
    }, [showDebug, sceneTex, scene])



    /* ————————————————— public render() ————————————————— */
    const render = (renderer, _camera /* unused */, target = null) => {
        /* 1️⃣ live-update blend without reconstructing material */
        material.uniforms.uBlend.value = blend

        const border = 0.01 // 1px border

        if (dbgRef.current) {
            const ndcH = (sizePx / size.height) * 2
            const ndcW = (sizePx / size.height) * 2

            dbgRef.current.scale.set(ndcW, ndcH, 1)
            dbgRef.current.position.set(border + -1 + ndcW / 2, 1 - ndcH / 2 - border, 0)
        }


        if (depthDbgRef.current) {
            const ndcH = (sizePx / size.height) * 2
            const ndcW = (sizePx / size.height) * 2

            depthDbgRef.current.scale.set(ndcW, ndcH, 1)
            depthDbgRef.current.position.set(border + -1 + ndcW / 2, 1 - ndcH * 3/ 2 -border * 2, 0)
        }

        /* 3️⃣ draw */
        renderer.setRenderTarget(target)
        if (!target) renderer.clearDepth()
        renderer.render(scene, camera)
    }

    return { scene, camera, material, render }
}
