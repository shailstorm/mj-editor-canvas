import { useEffect, useRef, useState } from 'react'
import { useCanvasView } from './hooks/useCanvasView.js'
import { useCanvasGestures } from './hooks/useCanvasGestures.js'
import { useEditor } from './hooks/useEditor.js'
import { useEditorShortcuts } from './hooks/useEditorShortcuts.js'
import { useToast } from './hooks/useToast.js'
import { fitCanvasView } from './model/layout.js'
import Navigation from './components/Navigation.jsx'
import EditorCanvas from './components/EditorCanvas.jsx'
import PromptCard from './components/PromptCard.jsx'
import Topbar from './components/Topbar.jsx'
import Toolbar from './components/Toolbar.jsx'
import ProjectsDialog from './components/ProjectsDialog.jsx'
import HelpDialog from './components/HelpDialog.jsx'
import ImageFileInput from './components/ImageFileInput.jsx'
import ImageBoundsEditor from './components/ImageBoundsEditor.jsx'
import './styles/editor.css'

export default function Editor() {
  const canvas = useCanvasView()
  const toast = useToast()
  const editor = useEditor({ resetView: canvas.resetView, notify: toast.notify })
  const { document, history, actions, tool, panel, setPanel } = editor
  const { stage, view, setView, resetView } = canvas
  const [spaceHeld, setSpaceHeld] = useState(false)
  const promptRef = useRef(null)
  const uploadRef = useRef(null)
  const referenceRef = useRef(null)
  const closePanels = () => setPanel(null)
  const openReferencePicker = () => referenceRef.current?.click()

  useEffect(() => {
    if (editor.promptOpen) promptRef.current?.focus()
  }, [editor.promptOpen])

  const gestures = useCanvasGestures({
    document,
    history,
    actions,
    tool,
    spaceHeld,
    stage,
    view,
    setView,
    closePanel: closePanels,
  })

  useEditorShortcuts({
    hasImages: Boolean(document.image) || document.results.length > 0,
    actions,
    setTool: actions.selectTool,
    boundsEditing: Boolean(editor.boundsEditor),
    setSpaceHeld,
    closePanels,
    clearMarquee: gestures.clearMarquee,
    showSuggestions: () => {
      if (!document.selected.length) return
      actions.editSelected()
      if (!document.prompt.trim()) actions.applySuggestion()
      promptRef.current?.focus()
    },
  })

  function setZoom(percent) {
    setView((current) => ({ ...current, zoom: percent / 100 }))
    closePanels()
  }

  function togglePanel(name) {
    setPanel((current) => (current === name ? null : name))
  }

  return (
    <main className="viewport" aria-label="Midjourney image editor">
      <div
        className="editor-stage"
        data-history={history.undoCount}
      >
        <Navigation />
        <EditorCanvas
          document={document}
          stage={stage}
          view={view}
          tool={tool}
          spaceHeld={spaceHeld}
          boardRef={gestures.boardRef}
          marquee={gestures.marquee}
          isSelectingRegion={gestures.isSelectingRegion}
          promptOpen={editor.promptOpen}
          pointerHandlers={gestures.pointerHandlers}
          actions={actions}
          boundsEditing={Boolean(editor.boundsEditor)}
          cropImageId={editor.boundsEditor?.mode === 'crop' ? editor.boundsEditor.image.id : undefined}
        >
          {editor.boundsEditor ? (
            <ImageBoundsEditor
              key={editor.boundsEditor.session}
              image={editor.boundsEditor.image}
              mode={editor.boundsEditor.mode}
              stage={stage}
              view={view}
              spaceHeld={spaceHeld}
              busy={editor.boundsBusy}
              onApply={actions.applyBounds}
              onCancel={actions.cancelBounds}
            />
          ) : (
            <PromptCard
              document={document}
              stage={stage}
              view={view}
              inputRef={promptRef}
              busy={editor.busy}
              isSelectingRegion={gestures.isSelectingRegion}
              promptOpen={editor.promptOpen}
              completion={editor.promptCompletion}
              actions={actions}
              openReferencePicker={openReferencePicker}
            />
          )}
        </EditorCanvas>
        <Topbar
          openHelp={() => setPanel('help')}
          zoom={view.zoom * 100}
          zoomMenuOpen={panel === 'zoom'}
          toggleProjects={() => togglePanel('projects')}
          toggleZoomMenu={() => togglePanel('zoom')}
          onZoom={setZoom}
          onFitCanvas={() => {
            setView(fitCanvasView(document, stage))
            closePanels()
          }}
          onResetView={() => {
            resetView()
            closePanels()
          }}
        />
        <Toolbar
          tool={tool}
          onSelect={actions.selectTool}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={actions.undo}
          onRedo={actions.redo}
        />
        {panel === 'projects' && (
          <ProjectsDialog
            onClose={closePanels}
            onUpload={() => uploadRef.current?.click()}
            image={document.image ?? document.results[0]?.src}
          />
        )}
        {panel === 'help' && <HelpDialog onClose={closePanels} />}
        {toast.message && (
          <div className="toast" role="status">
            {toast.message}
          </div>
        )}
        <ImageFileInput inputRef={uploadRef} onFiles={actions.upload} />
        <ImageFileInput
          inputRef={referenceRef}
          multiple
          onFiles={(files) => actions.upload(files, true)}
        />
      </div>
    </main>
  )
}
