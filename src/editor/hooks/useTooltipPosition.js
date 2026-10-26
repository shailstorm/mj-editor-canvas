import { useLayoutEffect } from 'react'
import { tooltipPosition } from '../model/tooltip.js'

export function useTooltipPosition(anchorRef, tooltipRef, open) {
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const tooltip = tooltipRef.current
    if (!open || !anchor || !tooltip) return

    function position() {
      const viewport = window.visualViewport
      const position = tooltipPosition(
        (anchor.closest('.prompt-panel-label') ?? anchor).getBoundingClientRect(),
        tooltip.getBoundingClientRect(),
        {
          left: viewport?.offsetLeft ?? 0,
          top: viewport?.offsetTop ?? 0,
          width: viewport?.width ?? document.documentElement.clientWidth,
          height: viewport?.height ?? document.documentElement.clientHeight,
        },
      )
      tooltip.style.left = `${position.left}px`
      tooltip.style.top = `${position.top}px`
      tooltip.style.visibility = anchor.closest('[inert],[hidden]') ? 'hidden' : 'visible'
    }

    position()
    const observer = new ResizeObserver(position)
    for (const element of new Set([anchor, tooltip, anchor.closest('.prompt-panel')].filter(Boolean))) observer.observe(element)
    window.addEventListener('resize', position)
    document.addEventListener('scroll', position, true)
    window.visualViewport?.addEventListener('resize', position)
    window.visualViewport?.addEventListener('scroll', position)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', position)
      document.removeEventListener('scroll', position, true)
      window.visualViewport?.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('scroll', position)
    }
  }, [anchorRef, tooltipRef, open])
}
