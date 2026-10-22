import { bounds, clamp } from './geometry.js'
import { selectedImages } from './selection.js'
import { IMAGE_SIZE } from './layout.js'

const MIN_IMAGE_SIZE = 24
const MIN_REGION_SIZE = 5

export function resizeImages(document, corner, delta) {
  const images = selectedImages(document)
  const box = bounds(images)
  if (!box || !['nw', 'ne', 'sw', 'se'].includes(corner)) return null
  const west = corner.includes('w')
  const north = corner.includes('n')
  const anchor = { x: box.x + (west ? box.width : 0), y: box.y + (north ? box.height : 0) }
  const diagonal = { x: box.width * (west ? -1 : 1), y: box.height * (north ? -1 : 1) }
  const minimum = Math.max(
    ...images.map((image) => MIN_IMAGE_SIZE / Math.min(image.width, image.height)),
  )
  const scale = Math.max(
    minimum,
    1 + (delta.x * diagonal.x + delta.y * diagonal.y) / (box.width ** 2 + box.height ** 2),
  )
  if (Math.abs(scale - 1) < 1e-10)
    return { imageFrame: document.imageFrame, results: document.results }
  function resized(frame) {
    return {
      ...frame,
      x: anchor.x + (frame.x - anchor.x) * scale,
      y: anchor.y + (frame.y - anchor.y) * scale,
      width: frame.width * scale,
      height: frame.height * scale,
    }
  }
  return {
    imageFrame: document.selected.includes(document.imageId)
      ? resized(document.imageFrame)
      : document.imageFrame,
    results: document.results.map((image) =>
      document.selected.includes(image.id) ? resized(image) : image,
    ),
  }
}

function photoSize(frame) {
  return { width: IMAGE_SIZE.width, height: (frame.height * IMAGE_SIZE.width) / frame.width }
}

function regionWithBounds(region, next) {
  return ['x', 'y', 'width', 'height'].every((key) => Math.abs(region[key] - next[key]) < 1e-10)
    ? region
    : { ...region, ...next }
}

export function moveRegion(region, frame, delta) {
  const size = photoSize(frame)
  const ratio = IMAGE_SIZE.width / frame.width
  return regionWithBounds(region, {
    ...region,
    x: clamp(region.x + delta.x * ratio, 0, size.width - region.width),
    y: clamp(region.y + delta.y * ratio, 0, size.height - region.height),
  })
}

export function resizeRegion(region, frame, corner, delta) {
  const size = photoSize(frame)
  const ratio = IMAGE_SIZE.width / frame.width
  const west = corner.includes('w')
  const north = corner.includes('n')
  const anchor = {
    x: region.x + (west ? region.width : 0),
    y: region.y + (north ? region.height : 0),
  }
  const x = clamp(
    region.x + (west ? 0 : region.width) + delta.x * ratio,
    west ? 0 : anchor.x + MIN_REGION_SIZE,
    west ? anchor.x - MIN_REGION_SIZE : size.width,
  )
  const y = clamp(
    region.y + (north ? 0 : region.height) + delta.y * ratio,
    north ? 0 : anchor.y + MIN_REGION_SIZE,
    north ? anchor.y - MIN_REGION_SIZE : size.height,
  )
  return regionWithBounds(region, {
    x: Math.min(x, anchor.x),
    y: Math.min(y, anchor.y),
    width: Math.abs(x - anchor.x),
    height: Math.abs(y - anchor.y),
  })
}
