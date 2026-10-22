import test from 'node:test'
import assert from 'node:assert/strict'
import { floodSelection, selectionPath, regionFromPixels } from '../src/editor/model/magic-wand.js'
import { selectPhotoRegion } from '../src/editor/services/magic-wand.js'

function pixels(rows, colors = { '#': [200, 180, 80, 255], '.': [20, 40, 150, 255] }) {
  return {
    width: rows[0].length,
    height: rows.length,
    data: new Uint8ClampedArray(rows.flatMap((row) => [...row].flatMap((key) => colors[key]))),
  }
}

test('wand selects the clicked connected shape, excluding disconnected matching colors', () => {
  const image = pixels(['##..#', '#...#', '###.#', '.....'])
  const before = image.data.slice()
  const result = floodSelection(image, { x: 0, y: 0 }, 0)
  assert.equal(result.count, 6)
  assert.deepEqual(result.bounds, { x: 0, y: 0, width: 3, height: 3 })
  assert.equal(result.mask[2 * image.width + 1], 1)
  assert.equal(result.mask[1 * image.width + 1], 0)
  assert.equal(result.mask[4], 0)
  assert.deepEqual(image.data, before, 'selection must not modify the photo')
})

test('tolerance controls color similarity without leaking through unrelated colors', () => {
  const image = pixels(['abc.a'], {
    a: [100, 100, 100, 255],
    b: [110, 110, 110, 255],
    c: [120, 120, 120, 255],
    '.': [200, 200, 200, 255],
  })
  assert.equal(floodSelection(image, { x: 0, y: 0 }, 5).count, 1)
  assert.equal(floodSelection(image, { x: 0, y: 0 }, 15).count, 2)
  assert.equal(floodSelection(image, { x: 0, y: 0 }, 25).count, 3)
})

test('transparent pixels and image boundaries stop region growth', () => {
  const image = pixels(['#x#'], { '#': [200, 180, 80, 255], x: [200, 180, 80, 0] })
  assert.equal(floodSelection(image, { x: 0, y: 0 }, 100).count, 1)
  assert.equal(floodSelection(image, { x: 1, y: 0 }), null)
  assert.equal(floodSelection(image, { x: -1, y: 0 }), null)
  assert.equal(floodSelection(image, { x: 3, y: 0 }), null)
  assert.equal(floodSelection(image, { x: 0, y: 1 }), null)
})

// Rasterize the generated closed contours at pixel centers using the even-odd rule.
function pathContains(path, x, y) {
  let inside = false
  for (const loop of path.match(/M[^Z]+Z/g) ?? []) {
    const points = loop
      .slice(1, -1)
      .split('L')
      .map((point) => point.split(' ').map(Number))
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i]
      const [bx, by] = points[j]
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside
    }
  }
  return inside
}

test('selection contours precisely follow irregular shapes, holes, and image edges', () => {
  for (const rows of [
    ['##..', '#...', '###.', '....'],
    ['#####', '#...#', '#.#.#', '##.##', '#####'],
    ['#####', '#.#.#', '##.##', '#.#.#', '#####'],
    ['#'],
    ['###', '###', '###'],
  ]) {
    const result = floodSelection(pixels(rows), { x: 0, y: 0 }, 0)
    const path = selectionPath(result)
    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width; x++) {
        assert.equal(
          pathContains(path, x + 0.5, y + 0.5),
          Boolean(result.mask[y * result.width + x]),
        )
      }
    }
  }
})

test('pixel masks map to the document region coordinates for different photo proportions', () => {
  const image = pixels(['....', '.##.', '.#..'])
  const region = regionFromPixels(image, { x: 150, y: 250 }, { width: 400, height: 600 }, 0)
  assert.deepEqual(
    { x: region.x, y: region.y, width: region.width, height: region.height },
    {
      x: 100,
      y: 200,
      width: 200,
      height: 400,
    },
  )
  assert.equal(region.outline.width, 4)
  assert.equal(region.outline.height, 3)
  assert.ok(pathContains(region.outline.path, 1.5, 1.5))
  assert.ok(!pathContains(region.outline.path, 2.5, 2.5))
})

test('photo sampling matches object-fit cover and reports unloaded images', () => {
  const drawCalls = []
  const context = {
    drawImage(...args) {
      drawCalls.push(args)
    },
    getImageData() {
      return pixels(['##', '##'])
    },
  }
  const canvas = { getContext: () => context }
  const previous = globalThis.document
  globalThis.document = { createElement: () => canvas }
  try {
    const image = { tagName: 'IMG', complete: true, naturalWidth: 400, naturalHeight: 200 }
    const result = selectPhotoRegion(image, { x: 100, y: 100 }, { width: 200, height: 200 }, 28)
    assert.deepEqual(drawCalls[0], [image, -100, 0, 400, 200])
    assert.equal(canvas.width, 200)
    assert.equal(canvas.height, 200)
    assert.ok(result.outline.path)
    assert.throws(() => selectPhotoRegion({ tagName: 'IMG' }), /finish loading/)
  } finally {
    if (previous === undefined) delete globalThis.document
    else globalThis.document = previous
  }
})
