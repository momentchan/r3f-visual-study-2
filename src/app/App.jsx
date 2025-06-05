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
            camera={{ fov: 60, near: 0.001, far: 0.5, position: [0, 0, 0.3] }}
            gl={{ preserveDrawingBuffer: true }}
        >
            <color attach="background" args={['#000']} />
            <CameraControls makeDefault />

            <PostPipeline useEffectMaterial>
                <directionalLight
                    position={[2, 4, 2]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                    shadow-bias={-0.0001}
                />
                <ambientLight intensity={1} />
                <Model path={'Astronaut.fbx'} pos={[0, -0.075, 0]} />
                {/* <TorusMesh /> */}
            </PostPipeline>
            <Utilities />
        </Canvas>
    )
}
