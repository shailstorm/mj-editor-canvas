import { originalImage } from './assets.js'
import { expansionBounds } from './layout.js'

export function initialDocument() {
  return {
    imageId: 'source-original',
    imageFrame: { x: 343, y: 70, width: 831.96, height: 833 },
    image: originalImage,
    cropSource: null,
    expansion: 0,
    prompt: '',
    references: [],
    referenceWeights: [],
    region: null,
    results: [],
    selected: [],
  }
}

export function documentForImage(src) {
  return { ...initialDocument(), image: src, region: null }
}

export function deleteSelection(document) {
  if (document.selected.length) {
    return {
      results: document.results.filter((result) => !document.selected.includes(result.id)),
      selected: [],
      region: null,
      ...(document.selected.includes(document.imageId)
        ? { image: null, cropSource: null, expansion: 0, prompt: '', references: [], referenceWeights: [] }
        : {}),
    }
  }
  return document.region ? { region: null } : null
}

export function appendResults(document, images, batchId) {
  if (!images.length) return null
  const width = 263
  const height = 264
  const gap = 32
  const frame = expansionBounds(document.expansion, document.imageFrame)
  const bottom = Math.max(
    frame.y + frame.height,
    ...document.results.map((result) => result.y + result.height),
  )
  const rowWidth = images.length * width + (images.length - 1) * gap
  const left = frame.x + frame.width / 2 - rowWidth / 2
  const added = images.map((image, index) => ({
    id: `${batchId}-${index}`,
    src: image.src,
    x: left + index * (width + gap),
    y: bottom + gap,
    width,
    height,
  }))
  return {
    results: [...document.results, ...added],
    selected: added.map((result) => result.id),
  }
}

export function editResult(document, id) {
  const result = document.results.find((item) => item.id === id)
  if (!result) return null
  const previousSource = { id: document.imageId, src: document.image, ...document.imageFrame,
    ...(document.cropSource ? { cropSource: document.cropSource } : {}),
  }
  return {
    imageId: result.id,
    image: result.src,
    cropSource: result.cropSource ?? null,
    imageFrame: { x: result.x, y: result.y, width: result.width, height: result.height },
    results: document.results.flatMap((item) =>
      item.id === id ? (document.image ? [previousSource] : []) : [item],
    ),
    region: null,
    expansion: 0,
    selected: [result.id],
    prompt: '',
    references: [],
    referenceWeights: [],
  }
}
