import { promptStyle } from '../model/layout.js'
import { IconButton } from './Icon.jsx'
import ReferenceImages from './ReferenceImages.jsx'
import SendIcon from './SendIcon.jsx'
import { selectedRegion } from '../model/selection.js'

export default function PromptCard({
  document,
  stage,
  view,
  inputRef,
  busy,
  isSelectingRegion = false,
  promptOpen = false,
  completion,
  actions,
  openReferencePicker,
}) {
  if (isSelectingRegion || !document.selected.length || (!selectedRegion(document) && !promptOpen))
    return null
  const expanded = document.references.length > 0
  const revealing = completion?.text === document.prompt
  const letters = revealing ? Array.from(completion.text) : []

  function finishCompletion() {
    if (revealing) actions.finishPromptCompletion()
  }

  function submit(event) {
    event.preventDefault()
    finishCompletion()
    actions.generate()
    inputRef.current?.focus()
  }

  function keydown(event) {
    finishCompletion()
    if (event.key !== 'Escape') return
    event.stopPropagation()
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
        <IconButton label="Add reference image" name="AddImageUncentered" title={undefined} onClick={addReference} />
        <div className={`prompt-input ${revealing ? 'is-completing' : ''}`}>
          <input
            ref={inputRef}
            aria-label="Describe your edit"
            placeholder="Type “/” for suggestions"
            value={document.prompt}
            onChange={(event) => actions.setPrompt(event.target.value)}
            onKeyDown={keydown}
            onPointerDown={finishCompletion}
            onBlur={finishCompletion}
          />
          {revealing && (
            <span className="prompt-completion" aria-hidden="true" key={completion.id}>
              {letters.map((letter, index) => (
                <span
                  className="prompt-completion-letter"
                  key={index}
                  style={{ '--letter-index': index }}
                  onAnimationEnd={index === letters.length - 1 ? finishCompletion : undefined}
                >
                  {letter}
                </span>
              ))}
            </span>
          )}
        </div>
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
    </form>
  )
}
