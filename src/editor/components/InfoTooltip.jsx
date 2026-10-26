import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { regionPanelAssets } from '../model/region-panel.js'
import { useTooltipWidth } from '../hooks/useTooltipWidth.js'
import { useTooltipPosition } from '../hooks/useTooltipPosition.js'

export default function InfoTooltip({ label, children, icon = regionPanelAssets.info }) {
  const id = useId()
  const containerRef = useRef(null)
  const tooltipRef = useRef(null)
  const closeTimer = useRef(null)
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  useTooltipWidth(tooltipRef, open, children)
  useTooltipPosition(containerRef, tooltipRef, open)

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  function show() {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function leave() {
    clearTimeout(closeTimer.current)
    if (!pinned) closeTimer.current = setTimeout(() => setOpen(false), 100)
  }

  useEffect(() => {
    if (!open) return

    function dismiss() {
      clearTimeout(closeTimer.current)
      setOpen(false)
      setPinned(false)
    }

    function pointerDown(event) {
      if (!containerRef.current?.contains(event.target) && !tooltipRef.current?.contains(event.target)) dismiss()
    }

    function keyDown(event) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      dismiss()
    }

    document.addEventListener('pointerdown', pointerDown)
    document.addEventListener('keydown', keyDown)
    return () => {
      document.removeEventListener('pointerdown', pointerDown)
      document.removeEventListener('keydown', keyDown)
    }
  }, [open])

  return (
    <span
      ref={containerRef}
      className="prompt-panel-info"
      onMouseEnter={show}
      onMouseLeave={leave}
      onFocus={show}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget) || tooltipRef.current?.contains(event.relatedTarget)) return
        clearTimeout(closeTimer.current)
        setOpen(false)
        setPinned(false)
      }}
    >
      <button
        type="button"
        className="prompt-panel-info-button"
        aria-label={`About ${label}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => {
          clearTimeout(closeTimer.current)
          setPinned(!pinned)
          setOpen(!pinned)
        }}
      >
        <img src={icon} alt="" draggable="false" />
      </button>
      {open && createPortal(
        <span
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className="prompt-panel-tooltip floating"
          onMouseEnter={show}
          onMouseLeave={leave}
        >{children}</span>,
        document.body,
      )}
    </span>
  )
}
