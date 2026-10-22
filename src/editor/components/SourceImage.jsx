import { expansionBounds } from '../model/layout.js'
import { boxStyle } from '../model/geometry.js'

export default function SourceImage({ document, onSelect, onCrop, hidden = false }) {
  const { image, expansion, imageFrame: frame } = document
  if (!image) return null
  const selected = document.selected.includes(document.imageId)
  const expandedFrame = expansionBounds(expansion, frame)

  return (
    <>
      {expansion > 0 && (
        <div className="expanded-image-area" style={{
          ...boxStyle(expandedFrame),
          '--transparency-x': `${expandedFrame.x}px`,
          '--transparency-y': `${expandedFrame.y}px`,
        }} />
      )}
      <img
        className="source-image"
        data-image={document.imageId}
        role="button"
        tabIndex={0}
        aria-label="Select source image"
        aria-pressed={selected}
        onDoubleClick={onCrop ? (event) => {
          event.stopPropagation()
          onCrop(document.imageId)
        } : undefined}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onSelect(document.imageId, event.shiftKey)
        }}
        src={image}
        alt="Fashion portrait in a lavender and pink diamond-pattern coat"
        draggable="false"
        style={{ ...boxStyle(frame), borderRadius: 4, visibility: hidden ? 'hidden' : undefined,
          '--transparency-x': `${frame.x}px`, '--transparency-y': `${frame.y}px`,
        }}
      />
    </>
  )
}
