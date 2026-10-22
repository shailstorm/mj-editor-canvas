import test from 'node:test'
import assert from 'node:assert/strict'
import { resizeImages, moveRegion, resizeRegion } from '../src/editor/model/transforms.js'
import { bounds } from '../src/editor/model/geometry.js'
import { selectedImages } from '../src/editor/model/selection.js'
import { initialDocument } from '../src/editor/model/document.js'
import { createHistory, historyReducer } from '../src/editor/model/history.js'

const corners = ['nw', 'ne', 'sw', 'se']
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`)

function documentForResize() {
  return {
    ...initialDocument(),
    imageFrame: { x: 100, y: 100, width: 200, height: 150 },
    selected: ['source-original', 'a'],
    region: null,
    results: [
      { id: 'a', src: '/a.png', x: 400, y: 200, width: 100, height: 200 },
      { id: 'b', src: '/b.png', x: 600, y: 50, width: 100, height: 100 },
    ],
  }
}

test('all image corners resize around the opposite corner and preserve aspect ratios and group layout', () => {
  const original = documentForResize()
  const before = bounds(selectedImages(original))
  for (const corner of corners) {
    const west = corner.includes('w'),
      north = corner.includes('n')
    const anchor = {
      x: before.x + (west ? before.width : 0),
      y: before.y + (north ? before.height : 0),
    }
    const delta = { x: before.width * (west ? -0.5 : 0.5), y: before.height * (north ? -0.5 : 0.5) }
    const resized = { ...original, ...resizeImages(original, corner, delta) }
    const after = bounds(selectedImages(resized))
    near(after.width, before.width * 1.5)
    near(after.height, before.height * 1.5)
    near(after.x + (west ? after.width : 0), anchor.x)
    near(after.y + (north ? after.height : 0), anchor.y)
    for (const image of selectedImages(resized)) {
      const old = selectedImages(original).find((item) => item.id === image.id)
      near(image.width / image.height, old.width / old.height)
      near(image.x, anchor.x + (old.x - anchor.x) * 1.5)
      near(image.y, anchor.y + (old.y - anchor.y) * 1.5)
    }
    assert.equal(resized.results[1], original.results[1])
    assert.deepEqual(resized.selected, original.selected)
  }
})

test('resizing cannot flip a photo or shrink any selected photo below its minimum size', () => {
  const original = documentForResize()
  const resized = { ...original, ...resizeImages(original, 'se', { x: -10000, y: -10000 }) }
  for (const image of selectedImages(resized)) {
    assert.ok(image.width >= 24)
    assert.ok(image.height >= 24)
  }
  assert.deepEqual(resizeImages(original, 'se', { x: 0, y: 0 }), {
    imageFrame: original.imageFrame,
    results: original.results,
  })
  assert.equal(resizeImages({ ...original, selected: [] }, 'se', { x: 20, y: 20 }), null)
})

test('rectangle regions move within the photo without changing their dimensions', () => {
  const frame = { x: 100, y: 200, width: 831.96, height: 600 }
  const region = { x: 100, y: 100, width: 200, height: 150 }
  assert.deepEqual(moveRegion(region, frame, { x: 30, y: -20 }), {
    x: 130,
    y: 80,
    width: 200,
    height: 150,
  })
  assert.deepEqual(moveRegion(region, frame, { x: -10000, y: -10000 }), { ...region, x: 0, y: 0 })
  assert.deepEqual(moveRegion(region, frame, { x: 10000, y: 10000 }), {
    ...region,
    x: 631.96,
    y: 450,
  })
  assert.equal(moveRegion(region, frame, { x: 0, y: 0 }), region)
})

test('rectangle corners resize freely, hold the opposite corner, and stay inside the photo', () => {
  const frame = { x: 100, y: 200, width: 831.96, height: 600 }
  const region = { x: 100, y: 100, width: 200, height: 150 }
  for (const corner of corners) {
    const west = corner.includes('w'),
      north = corner.includes('n')
    const resized = resizeRegion(region, frame, corner, { x: west ? -30 : 30, y: north ? -50 : 50 })
    near(resized.width, 230)
    near(resized.height, 200)
    near(resized.x + (west ? resized.width : 0), region.x + (west ? region.width : 0))
    near(resized.y + (north ? resized.height : 0), region.y + (north ? region.height : 0))
    for (const multiplier of [-1, 1]) {
      const clamped = resizeRegion(region, frame, corner, {
        x: multiplier * 10000,
        y: multiplier * 10000,
      })
      assert.ok(clamped.x >= 0 && clamped.y >= 0)
      assert.ok(clamped.x + clamped.width <= 831.96 && clamped.y + clamped.height <= 600)
      assert.ok(clamped.width >= 5 && clamped.height >= 5)
    }
  }
})

test('a resize gesture is a single undoable change for source and generated photos together', () => {
  const original = documentForResize()
  let state = createHistory(original)
  for (const distance of [10, 20, 30, 40])
    state = historyReducer(state, {
      type: 'preview',
      patch: resizeImages(original, 'se', { x: distance, y: distance }),
    })
  assert.equal(state.past.length, 0)
  state = historyReducer(state, { type: 'commit', before: original })
  assert.equal(state.past.length, 1)
  const undone = historyReducer(state, { type: 'undo' })
  assert.deepEqual(undone.present, original)
  assert.deepEqual(historyReducer(undone, { type: 'redo' }).present, state.present)
})
