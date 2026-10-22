export function lassoRegion(points, size, complete = false) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  let area = 0
  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const next = points[(index + 1) % points.length]
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
    area += point.x * next.y - next.x * point.y
  }
  const width = maxX - minX
  const height = maxY - minY
  if (
    !points.length ||
    (complete && (points.length < 3 || width < 5 || height < 5 || Math.abs(area) < 25))
  )
    return null
  const path = points.map(({ x, y }) => `${Number(x.toFixed(2))} ${Number(y.toFixed(2))}`).join('L')
  return {
    x: minX,
    y: minY,
    width,
    height,
    outline: { path: `M${path}${complete ? 'Z' : ''}`, width: size.width, height: size.height },
  }
}
