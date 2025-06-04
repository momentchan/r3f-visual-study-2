import { Canvas, useFrame } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import PostPipeline from '../component/PostPipeline'
import Utilities from '../r3f-gist/utility/Utilities'
import fragmentShader from '../shader/test/fragment.glsl'
import { CustomShaderMaterial } from '../r3f-gist/shader/CustomShaderMaterial'
import { useRef } from 'react'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import Model from '../component/Model'

function TorusMesh() {
    const meshRef = useRef()

    useFrame(() => {
        if (meshRef.current) {
            // meshRef.current.rotation.y += 0.01 // Rotate around the Y-axis
        }
    })

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[1, 1, 1]} />
            <CustomShaderMaterial fragmentShader={fragmentShader} />
        </mesh>
    )
}

export default function App() {
    return (
        <Canvas
            shadows
            camera={{ fov: 45, near: 0.001, far: 3, position: [4, 2, 6] }}
            gl={{ preserveDrawingBuffer: true }}
        >
            <color attach="background" args={['#000']} />
            <CameraControls makeDefault />

            <PostPipeline useEffectMaterial>
                 <Model path={'Astronaut.fbx'} pos={[0, 0, 0]} />
                {/* <TorusMesh /> */}
            </PostPipeline>

            {/* <EffectComposer>
                <Bloom
                    luminanceThreshold={0.1}
                    luminanceSmoothing={0.9}
                    intensity={0.5} />
            </EffectComposer> */}

            <Utilities />
        </Canvas>
    )
}
