import { marqueeSelection } from './geometry.js'

export function canvasImages(document) {
  const source = document.image
    ? [{ id: document.imageId, src: document.image, ...document.imageFrame,
      ...(document.cropSource ? { cropSource: document.cropSource } : {}),
    }]
    : []
  return [...source, ...document.results]
}

export function selectedImages(document) {
  return canvasImages(document).filter((image) => document.selected.includes(image.id))
}

export function selectedRegion(document) {
  return document.selected.length === 1 && document.selected[0] === document.imageId
    ? document.region
    : null
}

export function selectImage(document, id, additive = false) {
  if (!id) return { selected: [], region: null }
  const selected = additive
    ? document.selected.includes(id)
      ? document.selected.filter((selectedId) => selectedId !== id)
      : [...document.selected, id]
    : [id]
  return { selected, region: null }
}

export function selectArea(document, area, additive = false) {
  return {
    selected: marqueeSelection(canvasImages(document), area, additive ? document.selected : []),
    region: null,
  }
}
