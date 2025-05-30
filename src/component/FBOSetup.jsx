import { useFBO } from '@react-three/drei'
import { useEffect } from 'react'
import * as THREE from 'three'

export default function FBOSetup({ onReady }) {
  const fbo = useFBO({ depthTexture: new THREE.DepthTexture(), stencilBuffer: false })

  useEffect(() => {
    onReady(fbo)
  }, [fbo])

  return null
}