import PromptReferences from './PromptReferences.jsx'
import PromptInputSection from './PromptInputSection.jsx'
import PromptDivider from './PromptDivider.jsx'
import AuraSection from './AuraSection.jsx'
import { canGeneratePrompt, promptType } from '../model/prompts.js'

export default function PromptPanel({
  document, inputRef, busy, isSelectingRegion = false, promptCompletion,
  actions, closePanels, openReferencePicker,
}) {
  const type = promptType(document)
  const canGenerate = canGeneratePrompt(document, { busy, selecting: isSelectingRegion })
  const generateLabel = busy ? 'Generating…' : 'Generate'

  return (
    <form
      className="prompt-panel floating"
      aria-label={`${type === 'image' ? 'Image' : 'Region'} prompt panel`}
      data-prompt-type={type}
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault()
        if (canGenerate) {
          actions.finishPromptCompletion()
          actions.generate()
        }
      }}
    >
      <PromptInputSection
        type={type}
        value={document.prompt}
        inputRef={inputRef}
        completion={promptCompletion}
        onChange={actions.setPrompt}
        onFinishCompletion={actions.finishPromptCompletion}
        closePanels={closePanels}
      />
      <PromptDivider />
      <PromptReferences
        references={document.references}
        weights={document.referenceWeights}
        onUpload={openReferencePicker}
        onRemove={actions.removeReference}
        onWeightChange={actions.setReferenceWeight}
        onWeightStart={actions.beginReferenceWeight}
        onWeightEnd={actions.finishReferenceWeight}
      />
      <PromptDivider />
      {type === 'image' && (
        <>
          <AuraSection aura={document.aura} onChange={actions.setAura} />
          <PromptDivider />
        </>
      )}
      <div className="prompt-panel-section prompt-generate">
        <button className="prompt-panel-primary" disabled={!canGenerate}>
          {busy && <span className="spinner" aria-hidden="true" />}
          {generateLabel}
        </button>
      </div>
    </form>
  )
}
