import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { CustomShaderMaterial } from '../r3f-gist/shader/CustomShaderMaterial'
import depthFragmentShader from '../shader/depth/fragment.glsl'
import * as THREE from 'three'

export function DepthPlane({ depthTexture }) {
  const { camera, size } = useThree()
  const matRef = useRef()
  const meshRef = useRef()

  const pixelWidth = 200
  const pixelHeight = 200

  useEffect(() => {
    if (matRef.current && depthTexture) {
      matRef.current.uniforms.tDepth = { value: depthTexture }
      matRef.current.uniforms.cameraNear = { value: camera.near }
      matRef.current.uniforms.cameraFar = { value: camera.far }
    }
  }, [depthTexture])

  useFrame(() => {
    const distance = 1.0 // Distance from camera

    // Top-left in NDC: [-1, 1]
    const ndc = new THREE.Vector3(-1, 1, 0.5)
    ndc.unproject(camera)

    // Position direction
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    const pos = camera.position.clone().add(dir.multiplyScalar(distance))
    meshRef.current.position.copy(pos)

    // Size in world units from pixels
    const vFOV = (camera.fov * Math.PI) / 180
    const height = 2 * Math.tan(vFOV / 2) * distance
    const width = height * camera.aspect

    const planeWidth = (pixelWidth / size.width) * width
    const planeHeight = (pixelHeight / size.height) * height

    // Offset to top-left corner
    const offsetX = -width / 2 + planeWidth / 2
    const offsetY = height / 2 - planeHeight / 2

    meshRef.current.position.x += offsetX
    meshRef.current.position.y += offsetY

    meshRef.current.scale.set(planeWidth, planeHeight, 1)
    meshRef.current.quaternion.copy(camera.quaternion)
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <CustomShaderMaterial
        ref={matRef}
        fragmentShader={depthFragmentShader}
        uniforms={{}}
        transparent={true}
        depthTest={false}
      />
    </mesh>
  )
}
