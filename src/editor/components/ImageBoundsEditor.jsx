import { useEffect, useRef, useState } from 'react'
import { boxStyle, intersects, worldPoint } from '../model/geometry.js'
import { canvasBox, TRANSPARENCY_TILE_SIZE } from '../model/layout.js'
import { adjustImageBounds, cropChanged, moveImageBehindCrop, photoBounds, sameBounds, uncroppedImage } from '../model/image-bounds.js'

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export default function ImageBoundsEditor({ image, mode, stage, view, spaceHeld, busy, onApply, onCancel }) {
  const [box, setBox] = useState(() => photoBounds(image))
  const [source, setSource] = useState(() => mode === 'crop' ? uncroppedImage(image) : image)
  const [adjusted, setAdjusted] = useState(false)
  const drag = useRef(null)
  const ignoreClick = useRef(false)
  const overlay = useRef(null)
  const screenBox = canvasBox(box, stage, view)
  const screenImage = canvasBox(source, stage, view)
  const valid = box.width > 0 && box.height > 0 && intersects(source, box)
  const changed = mode === 'crop' ? cropChanged(image, box, source) : !sameBounds(image, box)
  const label = mode === 'crop' ? 'Crop' : 'Expand'

  useEffect(() => {
    const apply = (event) => {
      if (event.key !== 'Enter' || event.target.closest('button,input,textarea') || busy || !valid) return
      event.preventDefault()
      onApply(box, source)
    }
    window.addEventListener('keydown', apply)
    return () => window.removeEventListener('keydown', apply)
  }, [box, source, busy, valid, onApply])

  useEffect(() => {
    if (mode !== 'crop') return
    const resetClick = () => { ignoreClick.current = false }
    function applyOutside(event) {
      if (ignoreClick.current) {
        ignoreClick.current = false
        return
      }
      if (event.button !== 0 || !valid || spaceHeld ||
        event.target.closest('[data-bounds-handle]')) return
      const position = worldPoint(
        { x: event.clientX, y: event.clientY },
        overlay.current.getBoundingClientRect(), stage, view,
      )
      if (position.x >= source.x && position.x <= source.x + source.width &&
        position.y >= source.y && position.y <= source.y + source.height) return
      // Consume the finishing click so another control cannot cancel the crop while it renders.
      event.preventDefault()
      event.stopPropagation()
      if (!busy) onApply(box, source)
    }
    document.addEventListener('pointerdown', resetClick, true)
    document.addEventListener('click', applyOutside, true)
    return () => {
      document.removeEventListener('pointerdown', resetClick, true)
      document.removeEventListener('click', applyOutside, true)
    }
  }, [mode, box, source, busy, valid, spaceHeld, stage, view, onApply])

  function point(event) {
    return worldPoint({ x: event.clientX, y: event.clientY }, overlay.current.getBoundingClientRect(), stage, view)
  }

  function pointerDown(event) {
    ignoreClick.current = false
    if (spaceHeld || event.button === 1) return
    event.stopPropagation()
    if (event.button !== 0 || busy || event.target.closest('button')) return
    const start = point(event)
    const handle = event.target.closest('[data-bounds-handle]')?.dataset.boundsHandle
    if (mode === 'crop' && !handle && (start.x < source.x || start.x > source.x + source.width ||
      start.y < source.y || start.y > source.y + source.height)) return
    const inside = start.x >= box.x && start.x <= box.x + box.width &&
      start.y >= box.y && start.y <= box.y + box.height
    const action = handle || (mode === 'crop' ? 'pan-image' : inside && adjusted ? 'move' : 'draw')
    drag.current = { handle: action, start, box, source, adjusted }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function pointerMove(event) {
    if (!drag.current) return
    event.stopPropagation()
    const active = drag.current
    const end = point(event)
    if (active.handle === 'pan-image') {
      setSource(moveImageBehindCrop(active.source, active.box, {
        x: end.x - active.start.x,
        y: end.y - active.start.y,
      }))
    } else {
      setBox(adjustImageBounds(active.box, active.source, mode, active.handle, active.start, end))
    }
    setAdjusted(true)
  }

  function pointerUp(event) {
    if (!drag.current) return
    pointerMove(event)
    ignoreClick.current = true
    drag.current = null
  }

  function pointerCancel(event) {
    if (!drag.current) return
    event.stopPropagation()
    setBox(drag.current.box)
    setSource(drag.current.source)
    setAdjusted(drag.current.adjusted)
    drag.current = null
    ignoreClick.current = false
  }

  const imageRight = screenImage.x + screenImage.width
  const imageBottom = screenImage.y + screenImage.height
  const right = screenBox.x + screenBox.width
  const bottom = screenBox.y + screenBox.height
  return (
    <div
      ref={overlay}
      className={`image-bounds-editor bounds-${mode}${spaceHeld ? ' is-panning' : ''}`}
      aria-label={`${label} photo`}
      style={{
        '--transparency-tile': `${TRANSPARENCY_TILE_SIZE * view.zoom}px`,
        '--transparency-origin-x': `${stage.offset.x + view.x}px`,
        '--transparency-origin-y': `${stage.offset.y + view.y}px`,
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerCancel}
      onDoubleClick={mode === 'crop' ? (event) => {
        event.stopPropagation()
        if (busy) return
        drag.current = null
        ignoreClick.current = false
        setBox(photoBounds(image))
        setSource(uncroppedImage(image))
        setAdjusted(false)
      } : undefined}
    >
      {mode === 'crop' && (
        <>
          <div className="bounds-source-ghost" style={{ ...boxStyle(screenImage),
            '--transparency-x': `${screenImage.x}px`, '--transparency-y': `${screenImage.y}px`,
          }} aria-hidden="true">
            <img src={source.src} alt="" draggable="false" />
          </div>
          <div className="bounds-photo-window" style={{ ...boxStyle(screenBox),
            '--transparency-x': `${screenBox.x}px`, '--transparency-y': `${screenBox.y}px`,
          }} aria-hidden="true">
            <img
              src={source.src} alt="" draggable="false"
              style={{
                left: screenImage.x - screenBox.x,
                top: screenImage.y - screenBox.y,
                width: screenImage.width,
                height: screenImage.height,
              }}
            />
          </div>
        </>
      )}
      {mode === 'expand' && <svg className="bounds-preview" aria-hidden="true">
        {mode === 'expand' && (
          <defs>
            <pattern id="bounds-checkerboard" width={TRANSPARENCY_TILE_SIZE} height={TRANSPARENCY_TILE_SIZE} patternUnits="userSpaceOnUse"
              patternTransform={`translate(${stage.offset.x + view.x} ${stage.offset.y + view.y}) scale(${view.zoom})`}>
              <rect width={TRANSPARENCY_TILE_SIZE} height={TRANSPARENCY_TILE_SIZE} fill="var(--transparency-light)" />
              <path d={`M${TRANSPARENCY_TILE_SIZE / 2} 0H${TRANSPARENCY_TILE_SIZE}V${TRANSPARENCY_TILE_SIZE / 2}H${TRANSPARENCY_TILE_SIZE / 2}Z M0 ${TRANSPARENCY_TILE_SIZE / 2}H${TRANSPARENCY_TILE_SIZE / 2}V${TRANSPARENCY_TILE_SIZE}H0Z`} fill="var(--transparency-dark)" />
            </pattern>
          </defs>
        )}
        {mode === 'expand' && (
          <path
            d={`M${screenBox.x} ${screenBox.y}H${right}V${bottom}H${screenBox.x}Z M${Math.max(screenBox.x, screenImage.x)} ${Math.max(screenBox.y, screenImage.y)}H${Math.min(right, imageRight)}V${Math.min(bottom, imageBottom)}H${Math.max(screenBox.x, screenImage.x)}Z`}
            fill="url(#bounds-checkerboard)" fillRule="evenodd"
            visibility={valid ? 'visible' : 'hidden'}
          />
        )}
        <path
          d={`M${screenImage.x} ${screenImage.y}H${imageRight}V${imageBottom}H${screenImage.x}Z M${Math.max(screenBox.x, screenImage.x)} ${Math.max(screenBox.y, screenImage.y)}H${Math.min(right, imageRight)}V${Math.min(bottom, imageBottom)}H${Math.max(screenBox.x, screenImage.x)}Z`}
          fill="#17192380" fillRule="evenodd" visibility={valid ? 'visible' : 'hidden'}
        />
      </svg>}
      <div className="image-bounds-box" style={boxStyle(screenBox)}>
        <div className="bounds-grid" aria-hidden="true" />
        {HANDLES.map((handle) => (
          <span key={handle} className={`bounds-handle bounds-handle-${handle}`} data-bounds-handle={handle} />
        ))}
      </div>
      {mode === 'expand' && (
        <div className="bounds-controls floating" role="group" aria-label="Expand controls">
          <button type="button" className="bounds-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary-button" disabled={busy || !valid || !changed} onClick={() => onApply(box)}>
            {busy ? 'Applying…' : 'Apply expansion'}
          </button>
        </div>
      )}
    </div>
  )
}
