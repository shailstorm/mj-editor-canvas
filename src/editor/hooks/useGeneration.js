import { useCallback, useEffect, useRef, useState } from 'react'
import { generateVariations } from '../services/generation.js'

export function useGeneration(notify) {
  const request = useRef(null)
  const [busy, setBusy] = useState(false)

  const cancel = useCallback(() => {
    request.current?.abort()
    request.current = null
    setBusy(false)
  }, [])

  useEffect(() => () => request.current?.abort(), [])

  async function run(document) {
    if (request.current) return null
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    try {
      const results = await generateVariations(document, { signal: controller.signal })
      return controller.signal.aborted ? null : results
    } catch (error) {
      if (!controller.signal.aborted) notify(error.message || 'Could not generate variations.')
      return null
    } finally {
      if (request.current === controller && !controller.signal.aborted) {
        request.current = null
        setBusy(false)
      }
    }
  }

  return { busy, run, cancel }
}
