import { boxStyle } from '../model/geometry.js'

export default function ResultImages({ results, selected, onEdit, onSelect, onCrop, hiddenImageId }) {
  function keydown(event, id) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect(id, event.shiftKey)
  }

  return (
    <>
      {results.map((result, index) => (
        <div
          key={result.id}
          data-image={result.id}
          className="result-image"
          role="button"
          tabIndex={0}
          aria-label={`Select variation ${index + 1}`}
          aria-pressed={selected.includes(result.id)}
          onDoubleClick={(event) => {
            event.stopPropagation()
            if (onCrop) onCrop(result.id)
            else onEdit(result.id)
          }}
          onKeyDown={(event) => keydown(event, result.id)}
          style={{ ...boxStyle(result), visibility: result.id === hiddenImageId ? 'hidden' : undefined,
            '--transparency-x': `${result.x}px`, '--transparency-y': `${result.y}px`,
          }}
        >
          <img src={result.src} alt="Generated variation with pink boots" draggable="false" />
        </div>
      ))}
    </>
  )
}
