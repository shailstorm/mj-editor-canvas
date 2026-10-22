import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_VIEW, stageLayout } from '../model/layout.js'

export function useCanvasView() {
  const [viewport, setViewport] = useState(() => ({ width: innerWidth, height: innerHeight }))
  const [view, setView] = useState(DEFAULT_VIEW)
  const resetView = useCallback(() => setView(DEFAULT_VIEW), [])

  useEffect(() => {
    const resize = () => setViewport({ width: innerWidth, height: innerHeight })
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return { stage: stageLayout(viewport), view, setView, resetView }
}
