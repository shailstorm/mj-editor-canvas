import { useEffect, useRef, useState } from 'react'
import { IMAGE_SIZE } from '../model/layout.js'
import {
  canvasImages,
  selectImage,
  selectArea,
  selectedRegion,
  selectedImages,
} from '../model/selection.js'
import { resizeImages, moveRegion, resizeRegion } from '../model/transforms.js'
import { editResult } from '../model/document.js'
import { lassoRegion } from '../model/lasso.js'
import { clamp, imagePoint, moveResults, rectangle, worldPoint } from '../model/geometry.js'

export function useCanvasGestures({
  document,
  history,
  actions,
  tool,
  spaceHeld,
  stage,
  view,
  setView,
  closePanel,
}) {
  const boardRef = useRef(null)
  const drag = useRef(null)
  const [marquee, setMarquee] = useState(null)
  const [isSelectingRegion, setIsSelectingRegion] = useState(false)

  useEffect(() => {
    const board = boardRef.current
    function wheel(event) {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        setView((current) => ({
          ...current,
          zoom: clamp(current.zoom * Math.exp(-event.deltaY * 0.004), 0.25, 3),
        }))
      } else {
        setView((current) => ({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        }))
      }
    }
    board.addEventListener('wheel', wheel, { passive: false })
    return () => board.removeEventListener('wheel', wheel)
  }, [setView])

  function toWorld(event) {
    return worldPoint(
      { x: event.clientX, y: event.clientY },
      boardRef.current.getBoundingClientRect(),
      stage,
      view,
    )
  }

  function startSelection(event, point, imageId) {
    actions.closePrompt?.()
    const selection =
      imageId && document.selected.includes(imageId) && !event.shiftKey
        ? { selected: document.selected, region: null }
        : selectImage(document, imageId, event.shiftKey)
    history.preview(selection)
    closePanel()
    drag.current = {
      kind: imageId ? 'move' : 'marquee',
      selected: selection.selected,
      point,
      client: { x: event.clientX, y: event.clientY },
      before: document,
      additive: event.shiftKey,
      moved: false,
    }
  }

  function startRegionSelection(point, imageId = document.imageId) {
    actions.closePrompt?.()
    const photo = canvasImages(document).find((image) => image.id === imageId)
    if (!photo) return
    const size = {
      width: IMAGE_SIZE.width,
      height: (photo.height * IMAGE_SIZE.width) / photo.width,
    }
    const local = imagePoint(point, photo, size)
    if (local.x < 0 || local.y < 0 || local.x > size.width || local.y > size.height) {
      closePanel()
      return
    }
    if (tool === 'expand') return actions.expand(imageId)
    const active = {
      kind: 'region',
      shape: tool === 'rectangle' ? 'rectangle' : 'lasso',
      points: [local],
      frame: photo,
      size,
      before: document,
    }
    drag.current = active
    closePanel()
    setIsSelectingRegion(true)
    history.preview({
      ...(imageId === document.imageId ? {} : editResult(document, imageId)),
      prompt: document.prompt,
      references: document.references,
      referenceWeights: document.referenceWeights,
      selected: [imageId],
      region: regionForGesture(active),
    })
  }

  function onPointerDown(event) {
    if (event.target.closest('button,input,form,.image-operations')) return
    if (event.button !== 0 && event.button !== 1) return
    const point = toWorld(event)
    const imageId = event.target.closest('[data-image]')?.dataset.image
    const handle = event.target.closest('[data-resize-corner]')
    const regionMove = event.target.closest('[data-region-move]')
    event.currentTarget.setPointerCapture(event.pointerId)

    if (tool === 'hand' || spaceHeld || event.button === 1) {
      event.preventDefault()
      drag.current = { kind: 'pan', point, startView: view }
    } else if (handle) {
      startTransform(
        point,
        handle.dataset.resizeTarget === 'region' ? 'resize-region' : 'resize',
        handle.dataset.resizeCorner,
      )
    } else if (regionMove) {
      startTransform(point, 'move-region')
    } else if (tool === 'auto' && imageId) {
      actions.autoSelect(imageId, point, event.target.closest('[data-image]'))
    } else if ((tool === 'lasso' || tool === 'rectangle') && imageId) {
      startRegionSelection(point, imageId)
    } else if (tool === 'cursor' || imageId !== document.imageId) {
      startSelection(event, point, imageId)
    } else {
      history.preview({ selected: [document.imageId] })
      startRegionSelection(point)
    }
  }

  function startTransform(point, kind, corner) {
    const region = selectedRegion(document)
    if (kind === 'resize' ? region || !selectedImages(document).length : !region || region.outline)
      return
    actions.closePrompt?.()
    closePanel()
    if (kind !== 'resize') setIsSelectingRegion(true)
    drag.current = { kind, corner, point, before: document, moved: false }
  }

  function transform(active, point) {
    const delta = { x: point.x - active.point.x, y: point.y - active.point.y }
    const before = active.before
    if (active.kind === 'resize') {
      const patch = resizeImages(before, active.corner, delta)
      if (!patch) return
      active.moved = patch.imageFrame !== before.imageFrame || patch.results !== before.results
      history.preview(patch)
    } else {
      const region =
        active.kind === 'move-region'
          ? moveRegion(before.region, before.imageFrame, delta)
          : resizeRegion(before.region, before.imageFrame, active.corner, delta)
      active.moved = region !== before.region
      history.preview({ region })
    }
  }

  function pan(event, active) {
    const rect = boardRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left - stage.offset.x
    const y = event.clientY - rect.top - stage.offset.y
    setView({
      ...active.startView,
      x: x - active.point.x * active.startView.zoom,
      y: y - active.point.y * active.startView.zoom,
    })
  }

  function onPointerMove(event) {
    const active = drag.current
    if (!active) return
    const point = toWorld(event)
    switch (active.kind) {
      case 'pan':
        pan(event, active)
        break
      case 'marquee': {
        if (
          !active.moved &&
          Math.hypot(event.clientX - active.client.x, event.clientY - active.client.y) < 4
        )
          return
        active.moved = true
        const box = rectangle(active.point, point)
        setMarquee(box)
        history.preview(selectArea(active.before, box, active.additive))
        break
      }
      case 'move': {
        if (!active.selected.length) return
        if (
          !active.moved &&
          Math.hypot(event.clientX - active.client.x, event.clientY - active.client.y) < 4
        )
          return
        active.moved = true
        const delta = { x: point.x - active.point.x, y: point.y - active.point.y }
        const before = active.before
        history.preview({
          results: moveResults(before.results, active.selected, delta),
          imageFrame: active.selected.includes(before.imageId)
            ? {
                ...before.imageFrame,
                x: before.imageFrame.x + delta.x,
                y: before.imageFrame.y + delta.y,
              }
            : before.imageFrame,
        })
        break
      }
      case 'resize':
      case 'move-region':
      case 'resize-region':
        transform(active, point)
        break
      case 'region': {
        const samples = event.getCoalescedEvents?.() ?? []
        for (const sample of samples.length ? samples : [event]) {
          addRegionPoint(active, toWorld(sample))
        }
        history.preview({ region: regionForGesture(active) })
        break
      }
    }
  }

  function regionForGesture(active, complete = false) {
    if (active.shape !== 'rectangle') return lassoRegion(active.points, active.size, complete)
    const region = rectangle(active.points[0], active.points.at(-1))
    return complete && (region.width < 5 || region.height < 5) ? null : region
  }

  function addRegionPoint(active, point) {
    const local = imagePoint(point, active.frame, active.size)
    const next = {
      x: clamp(local.x, 0, active.size.width),
      y: clamp(local.y, 0, active.size.height),
    }
    const last = active.points.at(-1)
    if (next.x === last.x && next.y === last.y) return
    if (active.shape === 'rectangle') active.points[1] = next
    else active.points.push(next)
  }

  function onPointerUp(event) {
    const active = drag.current
    if (!active) return
    if (active.kind === 'region') {
      if (event) addRegionPoint(active, toWorld(event))
      const region = regionForGesture(active, true)
      if (!region) history.preview({ ...active.before, selected: [], region: null })
      else {
        history.preview({ region })
        history.commit(active.before)
      }
    } else if (['move', 'resize', 'move-region', 'resize-region'].includes(active.kind)) {
      if (event && ['resize', 'move-region', 'resize-region'].includes(active.kind))
        transform(active, toWorld(event))
      if (active.moved) history.commit(active.before)
    }
    drag.current = null
    setIsSelectingRegion(false)
    setMarquee(null)
  }

  function onPointerCancel() {
    if (drag.current?.before) history.preview(drag.current.before)
    drag.current = null
    setIsSelectingRegion(false)
    setMarquee(null)
  }

  function onDoubleClick(event) {
    if (tool !== 'cursor' || spaceHeld || event.target.closest('button,input,form,.image-operations')) return
    // Pointer capture sends clicks to the workspace, so resolve the photo at the click position.
    const point = toWorld(event)
    const image = canvasImages(document).findLast((photo) =>
      point.x >= photo.x && point.x <= photo.x + photo.width &&
      point.y >= photo.y && point.y <= photo.y + photo.height,
    )
    if (image) actions.cropImage?.(image.id)
  }

  return {
    boardRef,
    marquee,
    isSelectingRegion,
    clearMarquee: onPointerCancel,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDoubleClick },
  }
}
