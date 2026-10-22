import { clamp } from './geometry.js'

export const DEFAULT_TOLERANCE = 12

// Grow only through neighboring pixels that resemble the clicked color.
export function floodSelection({ data, width, height }, point, tolerance = DEFAULT_TOLERANCE) {
  const x = Math.floor(point.x)
  const y = Math.floor(point.y)
  if (x < 0 || y < 0 || x >= width || y >= height) return null
  const seed = y * width + x
  if (data[seed * 4 + 3] < 16) return null
  const mask = new Uint8Array(width * height)
  const visited = new Uint8Array(mask.length)
  const queue = new Uint32Array(mask.length)
  const limit = clamp(tolerance, 0, 100) ** 2
  const red = data[seed * 4]
  const green = data[seed * 4 + 1]
  const blue = data[seed * 4 + 2]
  let head = 0
  let tail = 0
  let minX = x,
    maxX = x,
    minY = y,
    maxY = y

  function visit(index) {
    if (visited[index]) return
    visited[index] = 1
    const offset = index * 4
    if (data[offset + 3] < 16) return
    const distance =
      0.3 * (data[offset] - red) ** 2 +
      0.59 * (data[offset + 1] - green) ** 2 +
      0.11 * (data[offset + 2] - blue) ** 2
    if (distance > limit) return
    mask[index] = 1
    queue[tail++] = index
  }

  visit(seed)
  while (head < tail) {
    const index = queue[head++]
    const px = index % width
    const py = Math.floor(index / width)
    minX = Math.min(minX, px)
    maxX = Math.max(maxX, px)
    minY = Math.min(minY, py)
    maxY = Math.max(maxY, py)
    if (px > 0) visit(index - 1)
    if (px + 1 < width) visit(index + 1)
    if (py > 0) visit(index - width)
    if (py + 1 < height) visit(index + width)
  }
  return {
    mask,
    width,
    height,
    count: tail,
    bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
  }
}

// Trace exposed pixel edges into closed contours, including holes in the selection.
export function selectionPath({ mask, width, height }) {
  const edges = new Map()
  const stride = width + 1
  function edge(x, y, nextX, nextY) {
    const key = y * stride + x
    if (!edges.has(key)) edges.set(key, [])
    edges.get(key).push(nextY * stride + nextX)
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      if (!mask[index]) continue
      if (y === 0 || !mask[index - width]) edge(x, y, x + 1, y)
      if (x === width - 1 || !mask[index + 1]) edge(x + 1, y, x + 1, y + 1)
      if (y === height - 1 || !mask[index + width]) edge(x + 1, y + 1, x, y + 1)
      if (x === 0 || !mask[index - 1]) edge(x, y + 1, x, y)
    }
  }
  const paths = []
  while (edges.size) {
    const start = edges.keys().next().value
    const points = []
    let current = start
    do {
      const point = [current % stride, Math.floor(current / stride)]
      const previous = points.at(-1)
      const before = points.at(-2)
      if (
        before &&
        ((before[0] === previous[0] && previous[0] === point[0]) ||
          (before[1] === previous[1] && previous[1] === point[1]))
      )
        points.pop()
      points.push(point)
      const next = edges.get(current)
      current = next.pop()
      if (!next.length) edges.delete(points.at(-1)[1] * stride + points.at(-1)[0])
    } while (current !== start)
    paths.push(`M${points.map((point) => point.join(' ')).join('L')}Z`)
  }
  return paths.join('')
}

export function regionFromPixels(pixels, point, imageSize, tolerance) {
  const scaleX = imageSize.width / pixels.width
  const scaleY = imageSize.height / pixels.height
  const selection = floodSelection(pixels, { x: point.x / scaleX, y: point.y / scaleY }, tolerance)
  if (!selection) return null
  return {
    x: selection.bounds.x * scaleX,
    y: selection.bounds.y * scaleY,
    width: selection.bounds.width * scaleX,
    height: selection.bounds.height * scaleY,
    outline: { path: selectionPath(selection), width: pixels.width, height: pixels.height },
  }
}
