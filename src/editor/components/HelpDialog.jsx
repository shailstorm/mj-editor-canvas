import { TOOLS } from '../model/tools.js'
import Dialog from './Dialog.jsx'

const SHORTCUTS = [
  ...TOOLS.map(({ label, shortcut }) => ({ label, key: shortcut })),
  { label: 'Crop with Select', key: 'Double-click photo' },
]

export default function HelpDialog({ onClose }) {
  return (
    <Dialog
      className="help-panel"
      label="Keyboard shortcuts"
      title="Make room for an idea."
      closeLabel="Close help"
      onClose={onClose}
    >
      <p>Draw a region, describe your edit, and explore the variations.</p>
      <div className="help-shortcuts">
        {SHORTCUTS.map(({ label, key }) => (
          <div className="shortcut" key={key}>
            <span>{label}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
      </div>
      <p className="help-note">
        Uploaded images and edits
        stay in this browser session.
      </p>
    </Dialog>
  )
}
