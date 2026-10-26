import { useLayoutEffect } from 'react'

function fitTooltipToText(tooltip) {
  // Balance the lines at the CSS width limit, then shrink the box to the
  // widest rendered line. Text balancing alone leaves the box at its limit.
  tooltip.style.removeProperty('width')
  const range = document.createRange()
  range.selectNodeContents(tooltip)
  const lineWidth = Math.max(0, ...Array.from(range.getClientRects(), (rect) => rect.width))
  if (!lineWidth) return

  const style = getComputedStyle(tooltip)
  const inset = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
    .reduce((total, property) => total + parseFloat(style[property]), 0)
  tooltip.style.width = `${Math.ceil(lineWidth + inset)}px`
}

export function useTooltipWidth(tooltipRef, open, content) {
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current
    if (!open || !tooltip) return
    let active = true
    const fit = () => { if (active) fitTooltipToText(tooltip) }
    fit()
    // Font metrics and the viewport can change after the tooltip opens.
    document.fonts.ready.then(fit)
    document.fonts.addEventListener('loadingdone', fit)
    window.addEventListener('resize', fit)
    return () => {
      active = false
      document.fonts.removeEventListener('loadingdone', fit)
      window.removeEventListener('resize', fit)
    }
  }, [tooltipRef, open, content])
}
