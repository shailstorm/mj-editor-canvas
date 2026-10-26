export function tooltipPosition(anchor, size, viewport, gap = 8, inset = 8) {
  const left = (viewport.left ?? 0) + inset
  const top = (viewport.top ?? 0) + inset
  const right = (viewport.left ?? 0) + viewport.width - inset
  const bottom = (viewport.top ?? 0) + viewport.height - inset
  const above = anchor.top - gap - size.height
  const placement = above >= top || anchor.top - top > bottom - anchor.bottom ? 'top' : 'bottom'
  return {
    left: Math.max(left, Math.min(anchor.left, right - size.width)),
    top: Math.max(top, Math.min(placement === 'top' ? above : anchor.bottom + gap, bottom - size.height)),
    placement,
  }
}
