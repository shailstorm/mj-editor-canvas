import { useEffect } from 'react'
import { TOOLS } from '../model/tools.js'

export function useEditorShortcuts({
  hasImages,
  boundsEditing = false,
  actions,
  setTool,
  setSpaceHeld,
  closePanels,
  clearMarquee,
  showSuggestions,
}) {
  useEffect(() => {
    function keydown(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return
      const key = event.key.toLowerCase()
      const command = event.metaKey || event.ctrlKey

      if (boundsEditing && !command) {
        if (event.key === 'Escape') {
          event.preventDefault()
          actions.cancelBounds()
        }
        if (event.key === ' ') {
          event.preventDefault()
          setSpaceHeld(true)
        }
        return
      }

      if (command && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) actions.redo()
        else actions.undo()
        return
      }
      if (command && key === 'a' && hasImages) {
        event.preventDefault()
        actions.selectAll()
        return
      }
      if (event.key === ' ') {
        event.preventDefault()
        setSpaceHeld(true)
      }
      if (event.key === 'Escape') {
        closePanels()
        clearMarquee()
        actions.clearSelection()
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        actions.deleteSelected()
      }
      const tool = TOOLS.find((item) => item.shortcut.toLowerCase() === key)
      if (tool) setTool(tool.id)
      if (event.key === '/') {
        event.preventDefault()
        showSuggestions()
      }
    }

    const keyup = (event) => {
      if (event.key === ' ') setSpaceHeld(false)
    }
    const blur = () => setSpaceHeld(false)
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', blur)
    }
  }, [hasImages, boundsEditing, actions, setTool, setSpaceHeld, closePanels, clearMarquee, showSuggestions])
}
