import PanelHeading from './PanelHeading.jsx'
import PanelSlider from './PanelSlider.jsx'
import { auraRange, changeAura } from '../model/prompts.js'

export default function AuraSection({ aura, onChange }) {
  const { min, max, disabled } = auraRange(aura)
  const { balance } = changeAura(aura)
  const direction = balance < 50 ? aura.left || 'dreamcore' : aura.right || 'brutalist'
  const balanceText = balance === 50
    ? 'Neutral'
    : `${Math.abs(balance - 50) * 2}% toward ${direction}`

  return (
    <section className="prompt-panel-section prompt-aura" aria-label="Aura">
      <PanelHeading info="Adjust aesthetic composition and styling">Aura</PanelHeading>
      <div className="prompt-aura-controls">
        <input
          className="prompt-aura-word"
          aria-label="Left aura word"
          placeholder="dreamcore"
          value={aura.left}
          onChange={(event) => onChange({ left: event.target.value })}
        />
        <input
          className="prompt-aura-word"
          aria-label="Right aura word"
          placeholder="brutalist"
          value={aura.right}
          onChange={(event) => onChange({ right: event.target.value })}
        />
      </div>
      <PanelSlider
        centered
        min={min}
        max={max}
        disabled={disabled}
        label="Aura balance"
        value={balance}
        valueText={balanceText}
        onChange={(balance) => onChange({ balance })}
      />
    </section>
  )
}
