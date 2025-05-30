import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useRef, useEffect, useState } from 'react'
import { CameraControls } from "@react-three/drei"
import Utilities from "../r3f-gist/utility/Utilities"
import { CustomShaderMaterial } from "../r3f-gist/shader/CustomShaderMaterial"
import fragmentShader from "../shader/test/fragment.glsl"

import { useControls } from 'leva'
import * as THREE from 'three'
import { DepthPlane } from '../component/DepthPlane'
import FBOSetup from '../component/FBOSetup'

function TorusMesh({ cameraNear, cameraFar }) {

    return (
        <mesh>
            <boxGeometry args={[1, 1, 2]} />
            <CustomShaderMaterial
                fragmentShader={fragmentShader}
                uniforms={{
                    uAlpha: 1,
                }}
                transparent={false}
                depthwrite={true}
                side={2}
            />
        </mesh>
    )
}
function SceneWithFBO({ fbo }) {
    const { gl, scene, camera } = useThree()

    useFrame(() => {
        gl.setRenderTarget(fbo)
        gl.clear()
        gl.render(scene, camera)
        gl.setRenderTarget(null)
    })

    return <TorusMesh/>
}

export default function App() {
    const [fbo, setFbo] = useState(null)

    return (
        <Canvas
            shadows
            camera={{
                fov: 45,
                near: 0.1,
                far: 5,
                position: [4, 2, 6]
            }}
            gl={{ preserveDrawingBuffer: true }}
        >
            <color attach="background" args={['#000']} />
            <CameraControls makeDefault />

            <FBOSetup onReady={setFbo} />

            {fbo  && (
                <>
                    <SceneWithFBO fbo={fbo} />
                    <DepthPlane
                        sceneTexture={fbo.texture}
                        depthTexture={fbo.depthTexture}
                    />
                </>
            )}
        </Canvas>
    )
}
