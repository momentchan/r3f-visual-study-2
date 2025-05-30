import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { CustomShaderMaterial } from '../r3f-gist/shader/CustomShaderMaterial'
import depthFragmentShader from '../shader/depth/fragment.glsl'
import * as THREE from 'three'
import { useControls } from 'leva'

export function DepthPlane({ sceneTexture, depthTexture }) {
    const { camera, size } = useThree()
    const matRef = useRef()
    const meshRef = useRef()

    const pixelWidth = 200
    const pixelHeight = 200

    const { blurNear, blurFar, colorMin, colorMax, color } = useControls('Shader Settings', {
        blurNear: { value: 0.001, min: 0.0, max: 0.01, step: 0.0001 },
        blurFar: { value: 0.01, min: 0.0, max: 0.05, step: 0.0005 },
        colorMin: { value: 0.0, min: 0.0, max: 1.0, step: 0.01 },
        colorMax: { value: 1.0, min: 0.0, max: 1.0, step: 0.01 },
        color: { value: '#ffffff' }
    })

    const uniforms = {
        tColor: sceneTexture,
        tDepth: depthTexture,
        cameraNear: camera.near,
        cameraFar: camera.far,
        uBlurNear: blurNear,
        uBlurFar: blurFar,
        uColorRange: new THREE.Vector2(colorMin, colorMax),
        uColor: new THREE.Color(color), // Convert hex string to THREE.Color,
        uResolution: new THREE.Vector2(size.width, size.height)
    }

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
        <>
            <mesh ref={meshRef}>
                <planeGeometry args={[1, 1]} />
                <CustomShaderMaterial
                    ref={matRef}
                    fragmentShader={depthFragmentShader}
                    uniforms={uniforms}
                    transparent={true}
                    depthTest={false}
                />
            </mesh>
        </>
    )
}
