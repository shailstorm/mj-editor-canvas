import { sampleReferences } from '../model/assets.js'
import { Asset } from './Icon.jsx'
import Tooltip, { REFERENCE_TOOLTIP } from './Tooltip.jsx'
import { DEFAULT_REFERENCE_WEIGHT } from '../model/references.js'

function sampleClass(src) {
  if (src === sampleReferences[0]) return 'reference-pink'
  if (src === sampleReferences[1]) return 'reference-shoes'
  return ''
}

export default function ReferenceImages({ images, weights = [], onUpload, onRemove, onWeightChange, onWeightStart, onWeightEnd }) {
  if (!images.length) return null

  return (
    <div className="references">
      <div className="reference-heading">
        References
        <Tooltip text={REFERENCE_TOOLTIP}>
          <button type="button" className="reference-info" aria-label="About references">
            <Asset name="LucideInfo" collection="prompting" />
          </button>
        </Tooltip>
      </div>
      <div className="reference-images">
        <button
          type="button"
          className="add-reference"
          aria-label="Upload reference"
          onClick={onUpload}
        >
          <Asset name="Vector" collection="prompting" />
        </button>
        {images.map((src, index) => (
          <div className={`reference-image ${sampleClass(src)}`} key={src + index}>
            <img src={src} alt={`Reference ${index + 1}`} />
            <button
              type="button"
              aria-label={`Remove reference ${index + 1}`}
              className="remove-reference"
              onClick={() => onRemove(index)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.75" />
              </svg>
            </button>
            <div className="reference-weight">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={weights[index] ?? DEFAULT_REFERENCE_WEIGHT}
                aria-label={`Reference ${index + 1} weight`}
                aria-valuetext={`${weights[index] ?? DEFAULT_REFERENCE_WEIGHT}% influence`}
                style={{ '--reference-weight': `${weights[index] ?? DEFAULT_REFERENCE_WEIGHT}%` }}
                onChange={(event) => onWeightChange?.(index, Number(event.target.value))}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  onWeightStart?.(index)
                }}
                onPointerUp={onWeightEnd}
                onPointerCancel={onWeightEnd}
                onBlur={onWeightEnd}
                onKeyDown={(event) => {
                  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) onWeightStart?.(index)
                }}
                onKeyUp={onWeightEnd}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
