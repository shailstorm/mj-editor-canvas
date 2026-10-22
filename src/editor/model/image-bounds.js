import { clamp, intersects, rectangle } from './geometry.js'
import { canvasImages } from './selection.js'
import { IMAGE_SIZE } from './layout.js'
import { editResult } from './document.js'

export function photoBounds(image) {
  return { x: image.x, y: image.y, width: image.width, height: image.height }
}

export function sameBounds(a, b) {
  return ['x', 'y', 'width', 'height'].every((key) => Math.abs(a[key] - b[key]) < 1e-8)
}

export function uncroppedImage(image) {
  const source = image.cropSource
  if (!source) return image
  return {
    id: image.id,
    src: source.src,
    x: image.x + source.x * image.width,
    y: image.y + source.y * image.height,
    width: source.width * image.width,
    height: source.height * image.height,
  }
}

export function moveImageBehindCrop(image, box, delta) {
  return {
    ...image,
    x: clamp(image.x + delta.x, box.x + box.width - image.width, box.x),
    y: clamp(image.y + delta.y, box.y + box.height - image.height, box.y),
  }
}

export function cropChanged(image, box, source) {
  return !sameBounds(image, box) || !sameBounds(uncroppedImage(image), source)
}

export function adjustImageBounds(box, frame, mode, handle, start, end) {
  const limited = (point) => mode === 'crop' ? {
    x: clamp(point.x, frame.x, frame.x + frame.width),
    y: clamp(point.y, frame.y, frame.y + frame.height),
  } : point
  if (handle === 'draw') return rectangle(limited(start), limited(end))
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (handle === 'move') return {
    ...box,
    x: mode === 'crop' ? clamp(box.x + dx, frame.x, frame.x + frame.width - box.width) : box.x + dx,
    y: mode === 'crop' ? clamp(box.y + dy, frame.y, frame.y + frame.height - box.height) : box.y + dy,
  }
  let left = box.x, right = box.x + box.width, top = box.y, bottom = box.y + box.height
  const point = limited({
    x: (handle.includes('w') ? left : right) + dx,
    y: (handle.includes('n') ? top : bottom) + dy,
  })
  const minWidth = Math.min(8, frame.width)
  const minHeight = Math.min(8, frame.height)
  if (handle.includes('w')) left = Math.min(point.x, right - minWidth)
  if (handle.includes('e')) right = Math.max(point.x, left + minWidth)
  if (handle.includes('n')) top = Math.min(point.y, bottom - minHeight)
  if (handle.includes('s')) bottom = Math.max(point.y, top + minHeight)
  return { x: left, y: top, width: right - left, height: bottom - top }
}

// Sample only the visible object-fit: cover area; expansion must not reveal hidden pixels.
export function imageBoundsPlan(frame, box, natural) {
  const scale = Math.max(frame.width / natural.width, frame.height / natural.height)
  const width = Math.max(1, Math.round(box.width / scale))
  const height = Math.max(1, Math.round(box.height / scale))
  return {
    width,
    height,
    source: {
      x: (natural.width - frame.width / scale) / 2,
      y: (natural.height - frame.height / scale) / 2,
      width: frame.width / scale,
      height: frame.height / scale,
    },
    destination: {
      x: (frame.x - box.x) * width / box.width,
      y: (frame.y - box.y) * height / box.height,
      width: frame.width * width / box.width,
      height: frame.height * height / box.height,
    },
  }
}

export function emptyBoundsRegion(frame, box) {
  const ratio = IMAGE_SIZE.width / box.width
  const width = IMAGE_SIZE.width
  const height = box.height * ratio
  const left = (Math.max(frame.x, box.x) - box.x) * ratio
  const top = (Math.max(frame.y, box.y) - box.y) * ratio
  const right = (Math.min(frame.x + frame.width, box.x + box.width) - box.x) * ratio
  const bottom = (Math.min(frame.y + frame.height, box.y + box.height) - box.y) * ratio
  if (left <= 0 && top <= 0 && right >= width && bottom >= height) return null
  return {
    x: 0, y: 0, width, height,
    outline: {
      width, height,
      path: `M0 0H${width}V${height}H0Z M${left} ${top}H${right}V${bottom}H${left}Z`,
    },
  }
}

export function applyImageBounds(document, id, box, src, mode, cropImage) {
  const image = canvasImages(document).find((item) => item.id === id)
  if (!image) return null
  const source = mode === 'crop' ? cropImage ?? uncroppedImage(image) : image
  if (!intersects(source, box) || (mode === 'crop' ? !cropChanged(image, box, source) : sameBounds(image, box))) return null
  if (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0)
    return null
  if (mode === 'crop' && (box.x < source.x - 1e-8 || box.y < source.y - 1e-8 ||
    box.x + box.width > source.x + source.width + 1e-8 ||
    box.y + box.height > source.y + source.height + 1e-8)) return null
  if (mode === 'expand') return {
    ...(id === document.imageId ? {} : editResult(document, id)),
    image: src,
    cropSource: null,
    imageFrame: { ...box },
    expansion: 0,
    selected: [id],
    region: emptyBoundsRegion(image, box),
    prompt: document.prompt,
    references: document.references,
    referenceWeights: document.referenceWeights,
  }
  const cropSource = {
    src: source.src,
    x: (source.x - box.x) / box.width,
    y: (source.y - box.y) / box.height,
    width: source.width / box.width,
    height: source.height / box.height,
  }
  return {
    ...(id === document.imageId ? { image: src, imageFrame: { ...box }, expansion: 0, cropSource } : {
      results: document.results.map((result) => result.id === id ? { ...result, ...box, src, cropSource } : result),
    }),
    selected: [id],
    region: null,
  }
}
