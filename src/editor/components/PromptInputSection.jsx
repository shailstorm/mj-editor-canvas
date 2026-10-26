import PanelHeading from './PanelHeading.jsx'
import PromptCompletion from './PromptCompletion.jsx'

export default function PromptInputSection({
  type, value, inputRef, completion, onChange, onFinishCompletion, closePanels,
  disclosure,
}) {
  const labelId = `${type}-prompt-label`

  return (
    <section className="prompt-panel-section prompt-panel-input">
      <PanelHeading id={labelId} action={disclosure}>{type === 'image' ? 'Image Prompt' : 'Region Prompt'}</PanelHeading>
      <PromptCompletion value={value} completion={completion} inputRef={inputRef} onFinish={onFinishCompletion}>
        <input
          ref={inputRef}
          aria-labelledby={labelId}
          placeholder="Type '/' for suggestions"
          value={value}
          onChange={(event) => onChange(event.target.value, event.nativeEvent)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            closePanels?.()
            event.currentTarget.blur()
          }}
        />
      </PromptCompletion>
    </section>
  )
}
