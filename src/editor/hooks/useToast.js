import { useCallback, useEffect, useRef, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState('')
  const timer = useRef(null)

  const notify = useCallback((text) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(''), 3200)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])
  return { message, notify }
}
