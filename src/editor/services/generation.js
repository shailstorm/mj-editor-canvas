import { resultImages } from '../model/assets.js'

// Replace this service with the backend request; components only consume results.
export function generateVariations(document, { signal }) {
  if (!document.prompt.trim()) return Promise.reject(new Error('Enter a prompt first.'))
  if (signal.aborted) return Promise.reject(signal.reason)

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve(resultImages.map((src) => ({ src })))
    }, 850)

    function abort() {
      clearTimeout(timer)
      reject(signal.reason)
    }

    signal.addEventListener('abort', abort, { once: true })
  })
}
