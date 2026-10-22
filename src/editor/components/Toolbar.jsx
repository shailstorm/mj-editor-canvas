import { TOOLS, toolIconCollection } from '../model/tools.js'
import { IconButton } from './Icon.jsx'

export default function Toolbar({ tool, onSelect, canUndo, canRedo, onUndo, onRedo }) {
  return (
    <div className="toolbar floating" role="toolbar" aria-label="Editor tools">
      <div className="tool-group">
        {TOOLS.map(({ id, icon, label, shortcut }) => (
          <IconButton
            key={id}
            label={`${label} (${shortcut})`}
            name={'Lucide' + icon}
            collection={toolIconCollection(id, tool === id)}
            className={`tool-button ${tool === id ? 'selected' : ''}`}
            aria-pressed={tool === id}
            onClick={() => onSelect(id)}
          />
        ))}
      </div>
      <div className="toolbar-divider" role="separator" aria-orientation="vertical" />
      <div className="tool-group operations">
        <IconButton
          label="Undo (⌘Z)"
          name="LucideUndo2"
          collection="prompting"
          onClick={onUndo}
          disabled={!canUndo}
        />
        <IconButton
          label="Redo (⇧⌘Z)"
          name="LucideRedo2"
          collection="prompting"
          onClick={onRedo}
          disabled={!canRedo}
        />
      </div>
    </div>
  )
}
