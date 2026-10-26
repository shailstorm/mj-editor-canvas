import { regionPanelAssets } from '../model/region-panel.js'

export default function PromptDivider({ fluid = false }) {
  return (
    <div className={`prompt-panel-divider${fluid ? ' prompt-panel-divider-fluid' : ''}`} aria-hidden="true">
      {!fluid && <img src={regionPanelAssets.divider} alt="" />}
    </div>
  )
}
