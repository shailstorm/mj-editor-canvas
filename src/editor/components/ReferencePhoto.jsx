import ReferenceWeight from './ReferenceWeight.jsx'

export default function ReferencePhoto({ reference, index, onRemove, onWeightChange, onWeightStart, onWeightEnd }) {
  function clearHoverFocus(event) {
    if (event.pointerType !== 'mouse') return
    const photo = event.currentTarget
    const focused = photo.ownerDocument.activeElement
    // A clicked range keeps focus after dragging; release it when the mouse
    // leaves so :focus-within doesn't pin the hover controls open.
    if (photo.contains(focused)) focused.blur()
  }

  return (
    <div className="prompt-reference" role="group" aria-label={`Reference ${index + 1}`} onPointerLeave={clearHoverFocus}>
      <img className="prompt-reference-photo" src={reference.src} alt={`Reference ${index + 1}`} draggable="false" />
      <ReferenceWeight
        reference={reference}
        label={`Reference ${index + 1} weight`}
        onChange={(value) => onWeightChange(index, value)}
        onStart={() => onWeightStart?.(index)}
        onEnd={onWeightEnd}
      />
      <button
        type="button"
        className="prompt-remove-reference"
        aria-label={`Remove reference ${index + 1}`}
        onClick={() => onRemove(index)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      </button>
    </div>
  )
}
