import { DEFAULT_REFERENCE_WEIGHT } from '../model/references.js'
import { regionPanelAssets } from '../model/region-panel.js'
import PanelHeading from './PanelHeading.jsx'
import ReferencePhoto from './ReferencePhoto.jsx'

export default function PromptReferences({ references, weights = [], onUpload, onRemove, onWeightChange, onWeightStart, onWeightEnd }) {
  return (
    <section className="prompt-panel-section prompt-references" aria-label="Prompt references">
      <div className="prompt-reference-images">
        <PanelHeading info="Edit or combine images, or use the style or elements of an image. Slide the dial to adjust how much the image influences the result.">References</PanelHeading>
        <div className="prompt-image-grid">
          <button
            type="button"
            className="prompt-add-reference"
            aria-label="Upload reference"
            onClick={onUpload}
            disabled={references.length >= 6}
          >
            <img src={regionPanelAssets.plus} alt="" draggable="false" />
          </button>
          {references.map((reference, index) => (
            <ReferencePhoto
              key={reference + index}
              reference={{ src: reference, weight: weights[index] ?? DEFAULT_REFERENCE_WEIGHT }}
              index={index}
              onRemove={onRemove}
              onWeightChange={onWeightChange}
              onWeightStart={onWeightStart}
              onWeightEnd={onWeightEnd}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
