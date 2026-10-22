import { IconButton } from './Icon.jsx'
import { imageOperationsStyle } from '../model/layout.js'

export default function ImageOperations({ bounds, stage, view, onEdit, onDownload, onDelete }) {
  if (!bounds) return null
  return (
    <div
      className="image-operations tool-group floating"
      style={imageOperationsStyle(bounds, stage, view)}
      role="toolbar"
      aria-label="Image operations"
    >
      <IconButton
        label="Edit selected image"
        name="LucideSparkles"
        collection="output"
        onClick={onEdit}
      />
      <IconButton
        label="Download selected images"
        name="LucideArrowRightFromLine"
        collection="output"
        onClick={onDownload}
      />
      <IconButton
        label="Delete selected images"
        name="LucideTrash"
        collection="output"
        onClick={onDelete}
      />
    </div>
  )
}
