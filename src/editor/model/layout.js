import { bounds, clamp } from './geometry.js'
import { selectedImages, selectedRegion } from './selection.js'

export const DESIGN_SIZE = { width: 1600, height: 1043 }
export const IMAGE_SIZE = { width: 831.96, height: 833 }
export const NAV_WIDTH = 82
export const MOBILE_NAV_HEIGHT = 59
export const TRANSPARENCY_TILE_SIZE = 8
export const DEFAULT_VIEW = { zoom: 1, x: 0, y: 0 }

export const navigationWidth = (stage) => stage.width <= 600 ? 0 : NAV_WIDTH
const navigationHeight = (stage) => stage.width <= 600 ? MOBILE_NAV_HEIGHT : 0

export function canvasBox(box, stage, view) {
  if (!box) return null
  return {
    x: stage.offset.x + view.x + box.x * view.zoom,
    y: stage.offset.y + view.y + box.y * view.zoom,
    width: box.width * view.zoom,
    height: box.height * view.zoom,
  }
}

export function stageLayout(viewport) {
  const { width, height } = viewport
  return {
    width,
    height,
    offset: {
      x: (width - DESIGN_SIZE.width + NAV_WIDTH - navigationWidth(viewport)) / 2,
      y: (height - navigationHeight(viewport) - DESIGN_SIZE.height) / 2,
    },
  }
}

function overlayStyle(left, top, width, height, stage) {
  const availableWidth = stage.width - navigationWidth(stage)
  return {
    left: clamp(left, 12, availableWidth - width - 12),
    top: clamp(top, 88, stage.height - navigationHeight(stage) - height - 84),
    width,
  }
}

export function imageOperationsStyle(box, stage, view) {
  const width = 145.2
  return overlayStyle(
    stage.offset.x + view.x + (box.x + box.width / 2) * view.zoom - width / 2,
    stage.offset.y + view.y + (box.y + box.height) * view.zoom + 7,
    width,
    53.2,
    stage,
  )
}

export function regionBounds(region, frame) {
  if (!region) return null
  const ratio = frame.width / IMAGE_SIZE.width
  return {
    x: frame.x + region.x * ratio,
    y: frame.y + region.y * ratio,
    width: region.width * ratio,
    height: region.height * ratio,
  }
}

export function expansionBounds(margin, frame) {
  const padding = (margin * frame.width) / IMAGE_SIZE.width
  return {
    x: frame.x - padding,
    y: frame.y - padding,
    width: frame.width + padding * 2,
    height: frame.height + padding * 2,
  }
}

export function promptStyle(document, stage, view) {
  const hasReferences = document.references.length > 0
  const width = Math.min(hasReferences ? 364 : 344, stage.width - navigationWidth(stage) - 24)
  const height = hasReferences ? 200 : 48
  const region = selectedRegion(document)
  const target =
    regionBounds(region, document.imageFrame) ??
    bounds(selectedImages(document)) ??
    document.imageFrame
  return overlayStyle(
    stage.offset.x + view.x + (target.x + target.width / 2) * view.zoom - width / 2,
    stage.offset.y + view.y + (target.y + target.height) * view.zoom + 7,
    width,
    height,
    stage,
  )
}

export function fitCanvasView(document, stage) {
  const content = bounds([
    ...(document.image ? [expansionBounds(document.expansion, document.imageFrame)] : []),
    ...document.results,
  ])
  if (!content) return { ...DEFAULT_VIEW }
  const width = stage.width - navigationWidth(stage) - 96
  const height = stage.height - navigationHeight(stage) - 200
  const zoom = clamp(Math.min(width / content.width, height / content.height), 0.25, 3)
  return {
    zoom,
    x: (stage.width - navigationWidth(stage)) / 2 - stage.offset.x - (content.x + content.width / 2) * zoom,
    y: (stage.height - navigationHeight(stage)) / 2 - stage.offset.y - (content.y + content.height / 2) * zoom,
  }
}
