import { useCallback } from 'react'

export default function useScenePass({ scene, fbo }) {
  const render = useCallback((renderer, camera) => {
    renderer.setRenderTarget(fbo)
    renderer.clear()
    renderer.render(scene, camera)
  }, [fbo, scene])

  return { render }
}
