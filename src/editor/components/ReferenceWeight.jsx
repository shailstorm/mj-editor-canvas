import PanelSlider from './PanelSlider.jsx'

export default function ReferenceWeight({ reference, label = 'Reference weight', onChange, onStart, onEnd }) {
  if (!reference) return null
  const { weight } = reference
  return (
    <div className="prompt-reference-weight">
      <PanelSlider label={label} value={weight} valueText={`${weight}% influence`} onChange={onChange} onStart={onStart} onEnd={onEnd} />
    </div>
  )
}
