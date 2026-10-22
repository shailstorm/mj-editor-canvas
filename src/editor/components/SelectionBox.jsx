import { boxStyle } from '../model/geometry.js'

export default function SelectionBox({
  box,
  children,
  className = '',
  resizeTarget,
  movable = false,
  handles = true,
  dashed = false,
}) {
  if (!box) return null
  return (
    <div
      className={`selection-box ${className}${movable ? ' is-movable' : ''}`}
      style={boxStyle(box)}
      data-region-move={movable ? 'true' : undefined}
    >
      {dashed && (
        <svg className="selection-outline" aria-hidden="true">
          <rect width="100%" height="100%" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {children}
      {handles &&
        ['nw', 'ne', 'sw', 'se'].map((corner) => (
          <span
            className={`selection-handle ${corner}`}
            key={corner}
            data-corner={corner}
            data-resize-corner={resizeTarget ? corner : undefined}
            data-resize-target={resizeTarget}
          />
        ))}
    </div>
  )
}
