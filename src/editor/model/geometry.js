export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function bounds(items) {
  if (!items.length) return null
  const x = Math.min(...items.map((item) => item.x))
  const y = Math.min(...items.map((item) => item.y))
  return {
    x,
    y,
    width: Math.max(...items.map((item) => item.x + item.width)) - x,
    height: Math.max(...items.map((item) => item.y + item.height)) - y,
  }
}

export function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

export function rectangle(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

export function boxStyle(box) {
  return { left: box.x, top: box.y, width: box.width, height: box.height }
}

export function worldPoint(point, canvasRect, stage, view) {
  return {
    x: (point.x - canvasRect.left - stage.offset.x - view.x) / view.zoom,
    y: (point.y - canvasRect.top - stage.offset.y - view.y) / view.zoom,
  }
}

export function imagePoint(point, frame, imageSize) {
  return {
    x: ((point.x - frame.x) * imageSize.width) / frame.width,
    y: ((point.y - frame.y) * imageSize.height) / frame.height,
  }
}

export function moveResults(results, selected, delta) {
  return results.map((result) =>
    selected.includes(result.id)
      ? { ...result, x: result.x + delta.x, y: result.y + delta.y }
      : result,
  )
}

export function marqueeSelection(results, box, existing = []) {
  const intersecting = results
    .filter((result) => intersects(box, result))
    .map((result) => result.id)
  return [...new Set([...existing, ...intersecting])]
}
