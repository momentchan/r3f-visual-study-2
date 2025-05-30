import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import PostPipeline from '../component/PostPipeline'
import Utilities from '../r3f-gist/utility/Utilities'
import fragmentShader from '../shader/test/fragment.glsl'
import { CustomShaderMaterial } from '../r3f-gist/shader/CustomShaderMaterial'

function TorusMesh() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 2]} />
      <CustomShaderMaterial fragmentShader={fragmentShader} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas
      shadows
      camera={{ fov: 45, near: 0.1, far: 10, position: [4, 2, 6] }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#000']} />
      <CameraControls makeDefault />

      <PostPipeline debug useEffectMaterial>
        <TorusMesh />
      </PostPipeline>

      <Utilities />
    </Canvas>
  )
}
