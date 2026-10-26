import { useEffect, useRef, useState } from 'react'
import { useDocumentHistory } from './useDocumentHistory.js'
import { useGeneration } from './useGeneration.js'
import {
  initialDocument,
  documentForImage,
  deleteSelection,
  appendResults,
  editResult,
} from '../model/document.js'
import { canvasImages, selectedImages, selectImage } from '../model/selection.js'
import { SAMPLE_PROMPT } from '../model/assets.js'
import { imagePoint } from '../model/geometry.js'
import { IMAGE_SIZE } from '../model/layout.js'
import { selectPhotoRegion } from '../services/magic-wand.js'
import { downloadImages, readImageFiles } from '../services/files.js'
import { applyImageBounds, cropChanged, sameBounds, uncroppedImage } from '../model/image-bounds.js'
import { renderImageBounds } from '../services/image-bounds.js'
import { appendReferences, changeReferenceWeight, referenceWeights, removeReference } from '../model/references.js'
import { changeAura, promptType } from '../model/prompts.js'

export function useEditor({ resetView, notify }) {
  const history = useDocumentHistory(initialDocument)
  const { document, update, preview } = history
  const [tool, setTool] = useState('cursor')
  const [panel, setPanel] = useState(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptCompletion, setPromptCompletion] = useState(null)
  const completionRequest = useRef(0)
  const [boundsEditor, setBoundsEditor] = useState(null)
  const [boundsBusy, setBoundsBusy] = useState(false)
  const boundsRequest = useRef(0)
  const referenceWeightEdit = useRef(null)
  const generation = useGeneration(notify)

  useEffect(() => {
    if (!promptCompletion) return
    // Also clear a reveal if the prompt is hidden before its animation ends.
    const timeout = setTimeout(() => setPromptCompletion(null), 1500)
    return () => clearTimeout(timeout)
  }, [promptCompletion])

  function cancelBounds(nextTool = 'cursor') {
    boundsRequest.current += 1
    setBoundsEditor(null)
    setBoundsBusy(false)
    setTool(nextTool)
  }

  function beginBounds(mode, id) {
    const images = canvasImages(document)
    const image = id ? images.find((item) => item.id === id) : selectedImages(document)[0] ?? images[0]
    if (!image) {
      notify('Upload a photo first.')
      return
    }
    generation.cancel()
    boundsRequest.current += 1
    setBoundsBusy(false)
    setBoundsEditor({ mode, image, session: boundsRequest.current })
    setTool(mode === 'expand' ? 'expand' : 'cursor')
    setPromptOpen(false)
    setPanel(null)
  }

  async function applyBounds(box, cropImage) {
    if (!boundsEditor || boundsBusy) return
    const { image, mode } = boundsEditor
    const source = mode === 'crop' ? cropImage ?? uncroppedImage(image) : image
    if (mode === 'crop' ? !cropChanged(image, box, source) : sameBounds(image, box)) return cancelBounds()
    const request = ++boundsRequest.current
    setBoundsBusy(true)
    try {
      const src = await renderImageBounds(source, box)
      if (boundsRequest.current !== request) return
      update((current) => {
        const target = canvasImages(current).find((item) => item.id === image.id)
        if (!target || target.src !== image.src || !sameBounds(target, image)) return null
        return applyImageBounds(current, image.id, box, src, mode, source)
      })
      cancelBounds()
      setPromptOpen(mode === 'expand')
      if (mode === 'expand') notify('Describe what to add in the empty area.')
    } catch (error) {
      if (boundsRequest.current === request) {
        setBoundsBusy(false)
        notify(error.message || 'Could not edit this photo. Please try again.')
      }
    }
  }

  function undo() {
    if (boundsEditor) cancelBounds()
    if (!history.canUndo) return
    generation.cancel()
    setPromptOpen(false)
    history.undo()
  }

  function redo() {
    if (boundsEditor) cancelBounds()
    if (!history.canRedo) return
    generation.cancel()
    setPromptOpen(false)
    history.redo()
  }

  function openImage(src) {
    cancelBounds()
    setPromptOpen(false)
    update(documentForImage(src))
    setTool('cursor')
    resetView()
  }

  function selectTool(id) {
    if (id === 'expand') return beginBounds('expand')
    cancelBounds(id)
    setPanel(null)
  }

  function autoSelect(id, point, element) {
    const image = canvasImages(document).find((item) => item.id === id)
    if (!image) return
    setPanel(null)
    try {
      const size = {
        width: IMAGE_SIZE.width,
        height: (image.height * IMAGE_SIZE.width) / image.width,
      }
      const local = imagePoint(point, image, size)
      const region = selectPhotoRegion(element, local, image)
      if (!region) {
        notify('Click a visible part of the photo to select it.')
        return
      }
      update({
        ...(id === document.imageId ? {} : editResult(document, id)),
        prompt: document.prompt,
        references: document.references,
        referenceWeights: document.referenceWeights,
        selected: [id],
        region,
      })
    } catch (error) {
      notify(error.message || 'Could not read this photo. Try uploading it again.')
    }
  }

  function expand(id) {
    beginBounds('expand', id)
  }

  function applySuggestion() {
    update({ prompt: SAMPLE_PROMPT })
    setPromptCompletion({ id: ++completionRequest.current, text: SAMPLE_PROMPT })
    setPromptOpen(true)
    setPanel(null)
  }

  function setPrompt(prompt) {
    if (prompt.trim() === '/') return applySuggestion()
    setPromptCompletion(null)
    preview({ prompt })
  }

  async function generate() {
    if (generation.busy) return
    const selected = selectedImages(document)
    if (!selected.length) return
    if (!document.prompt.trim() || document.prompt === '/') {
      applySuggestion()
      return
    }
    setPanel(null)
    const primary =
      selected[0].id === document.imageId
        ? document
        : {
            ...document,
            ...editResult(document, selected[0].id),
            prompt: document.prompt,
            references: document.references,
            referenceWeights: document.referenceWeights,
          }
    const type = promptType(document)
    const request = {
      ...primary,
      promptType: type,
      aura: type === 'image' ? changeAura(document.aura) : undefined,
      targetImages: selected,
    }
    const results = await generation.run(request)
    if (!results) return
    const batchId = crypto.randomUUID()
    setPromptOpen(false)
    update((current) => appendResults(current, results, batchId))
    notify(
      'Dev note: Generated sample variations',
    )
  }

  async function upload(files, reference = false) {
    const { images, rejectedCount } = await readImageFiles(files)
    if (rejectedCount) notify('Choose image files smaller than 15 MB.')
    if (!images.length) return
    if (reference) {
      update((current) => appendReferences(current, images))
      return
    }
    generation.cancel()
    openImage(images[0])
    setPanel(null)
  }

  function downloadSelected() {
    const results = selectedImages(document)
    if (!results.length) return
    downloadImages(results)
    notify(`${results.length} image${results.length === 1 ? '' : 's'} downloaded`)
  }

  function editSelected() {
    if (!selectedImages(document).length) return
    setPanel(null)
    setPromptOpen(true)
  }

  function startEditingResult(id) {
    generation.cancel()
    setPromptOpen(false)
    update((current) => editResult(current, id))
    setTool('lasso')
  }

  function selectPhoto(id, additive) {
    setPromptOpen(false)
    preview((current) => selectImage(current, id, additive))
    setPanel(null)
  }

  function selectAll() {
    setPromptOpen(false)
    preview({ selected: canvasImages(document).map((image) => image.id), region: null })
  }

  function beginReferenceWeight(index) {
    if (referenceWeightEdit.current) return
    referenceWeightEdit.current = {
      before: document,
      index,
      weight: referenceWeights(document)[index],
    }
  }

  function setReferenceWeight(index, weight) {
    const edit = referenceWeightEdit.current
    if (edit?.index === index) {
      edit.weight = Math.round(Math.max(0, Math.min(100, weight)))
      preview((current) => changeReferenceWeight(current, index, weight))
    } else {
      update((current) => changeReferenceWeight(current, index, weight))
    }
  }

  function finishReferenceWeight() {
    const edit = referenceWeightEdit.current
    if (!edit) return
    referenceWeightEdit.current = null
    if (referenceWeights(edit.before)[edit.index] !== edit.weight) history.commit(edit.before)
  }

  return {
    document,
    history,
    tool,
    setTool,
    panel,
    setPanel,
    busy: generation.busy,
    promptOpen,
    promptCompletion,
    boundsEditor,
    boundsBusy,
    actions: {
      undo,
      redo,
      openImage,
      selectTool,
      autoSelect,
      expand,
      cropImage: (id) => beginBounds('crop', id),
      applyBounds,
      cancelBounds: () => cancelBounds(),
      applySuggestion,
      finishPromptCompletion: () => setPromptCompletion(null),
      setPrompt,
      setAura: (patch) => preview((current) => ({ aura: changeAura(current.aura, patch) })),
      generate,
      upload,
      downloadSelected,
      editSelected,
      editResult: startEditingResult,
      selectImage: selectPhoto,
      selectAll,
      deleteSelected: () => {
        if (boundsEditor) cancelBounds()
        generation.cancel()
        setPromptOpen(false)
        update(deleteSelection)
      },
      beginReferenceWeight,
      setReferenceWeight,
      finishReferenceWeight,
      removeReference: (index) => update((current) => removeReference(current, index)),
      closePrompt: () => setPromptOpen(false),
      clearSelection: () => {
        setPromptOpen(false)
        preview({ selected: [], region: null })
      },
    },
  }
}
