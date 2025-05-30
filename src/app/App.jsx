import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import { CameraControls } from "@react-three/drei"
import Utilities from "../r3f-gist/utility/Utilities"
import { CustomShaderMaterial } from "../r3f-gist/shader/CustomShaderMaterial"
import fragmentShader from "../shader/test/fragment.glsl"

import { useControls } from 'leva'
import * as THREE from 'three'
import { DepthPlane } from '../component/DepthPlane'

function TorusMesh({ depthTexture, cameraNear, cameraFar }) {
  const materialRef = useRef()

  useEffect(() => {
    if (materialRef.current && depthTexture) {
      materialRef.current.uniforms.tDepth = { value: depthTexture }
      materialRef.current.uniforms.cameraNear = { value: cameraNear }
      materialRef.current.uniforms.cameraFar = { value: cameraFar }
    }
  }, [depthTexture, cameraNear, cameraFar])

  return (
    <mesh>
      <boxGeometry args={[1,1,2]} />
      <CustomShaderMaterial
        ref={materialRef}
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

function SceneWithFBO() {
  const { gl, scene, camera } = useThree()
  const fbo = useFBO({ depthTexture: new THREE.DepthTexture(), stencilBuffer: false })

  useFrame(() => {
    gl.setRenderTarget(fbo)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
  })

  return (
    <>
      <TorusMesh
        depthTexture={fbo.depthTexture}
        cameraNear={camera.near}
        cameraFar={camera.far}
      />
      <DepthPlane depthTexture={fbo.depthTexture} />
    </>
  )
}

export default function App() {
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
      <SceneWithFBO />
      <Utilities />
    </Canvas>
  )
}
