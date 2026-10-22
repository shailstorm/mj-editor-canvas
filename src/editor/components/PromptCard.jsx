import { SAMPLE_PROMPT } from '../model/assets.js'
import { promptStyle } from '../model/layout.js'
import { IconButton } from './Icon.jsx'
import ReferenceImages from './ReferenceImages.jsx'
import SendIcon from './SendIcon.jsx'
import { selectedRegion } from '../model/selection.js'
import Tooltip, { REFERENCE_TOOLTIP } from './Tooltip.jsx'

export default function PromptCard({
  document,
  stage,
  view,
  inputRef,
  busy,
  isSelectingRegion = false,
  promptOpen = false,
  suggestionsOpen,
  actions,
  closeSuggestions,
  openReferencePicker,
}) {
  if (isSelectingRegion || !document.selected.length || (!selectedRegion(document) && !promptOpen))
    return null
  const expanded = document.references.length > 0

  function submit(event) {
    event.preventDefault()
    actions.generate()
  }

  function applySuggestion() {
    actions.applySuggestion()
    inputRef.current?.focus()
  }

  function keydown(event) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    closeSuggestions()
    event.currentTarget.blur()
  }

  function addReference() {
    openReferencePicker()
  }

  return (
    <form
      className={`prompt-card ${expanded ? 'expanded' : ''} ${busy ? 'is-busy' : ''}`}
      style={promptStyle(document, stage, view)}
      onSubmit={submit}
    >
      <div className="prompt-row">
        <Tooltip text={REFERENCE_TOOLTIP}>
          <IconButton label="Add reference image" name="AddImageUncentered" title={undefined} onClick={addReference} />
        </Tooltip>
        <input
          ref={inputRef}
          aria-label="Describe your edit"
          placeholder="Type “/” for suggestions"
          value={document.prompt}
          onChange={(event) => actions.setPrompt(event.target.value)}
          onKeyDown={keydown}
        />
        <button
          className="send-button"
          aria-label={busy ? 'Generating preview' : 'Generate variations'}
          title="Generate variations"
          disabled={busy}
        >
          {busy ? <span className="spinner" /> : <SendIcon active={Boolean(document.prompt)} />}
        </button>
      </div>
      {expanded && (
        <ReferenceImages
          images={document.references}
          weights={document.referenceWeights}
          onUpload={openReferencePicker}
          onRemove={actions.removeReference}
          onWeightChange={actions.setReferenceWeight}
          onWeightStart={actions.beginReferenceWeight}
          onWeightEnd={actions.finishReferenceWeight}
        />
      )}
      {suggestionsOpen && (
        <div className="suggestions floating">
          <p>Try a region edit</p>
          <button type="button" onClick={applySuggestion}>
            {SAMPLE_PROMPT}
            <span>Use this prompt ↵</span>
          </button>
        </div>
      )}
    </form>
  )
}
