import { outputDocument } from './fixtures/documents.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  initialDocument,
  appendResults,
  editResult,
  deleteSelection,
} from '../src/editor/model/document.js'
import { historyReducer, createHistory } from '../src/editor/model/history.js'
import { canvasImages, selectArea, selectedImages } from '../src/editor/model/selection.js'
import { fitCanvasView, stageLayout, DEFAULT_VIEW } from '../src/editor/model/layout.js'

test('adding variations preserves the source, prompt, references, and previous results', () => {
  const before = initialDocument()
  const first = {
    ...before,
    ...appendResults(before, [{ src: '/a.png' }, { src: '/b.png' }], 'first'),
  }
  const second = { ...first, ...appendResults(first, [{ src: '/c.png' }], 'second') }
  assert.deepEqual(second.imageFrame, before.imageFrame)
  assert.equal(second.image, before.image)
  assert.equal(second.prompt, before.prompt)
  assert.deepEqual(second.references, before.references)
  assert.equal(second.results.length, 3)
  assert.deepEqual(second.results.slice(0, 2), first.results)
  assert.ok(first.results[0].y > before.imageFrame.y + before.imageFrame.height)
  assert.ok(second.results[2].y > first.results[0].y + first.results[0].height)
  assert.equal(new Set(second.results.map((result) => result.id)).size, 3)
  assert.ok(!('screen' in second))
})

test('editing a result preserves every image at its current canvas position', () => {
  const document = outputDocument()
  const result = document.results[2]
  const next = { ...document, ...editResult(document, result.id) }
  assert.equal(next.image, result.src)
  assert.deepEqual(next.imageFrame, {
    x: result.x,
    y: result.y,
    width: result.width,
    height: result.height,
  })
  const previousSource = next.results.find((image) => image.id === document.imageId)
  assert.equal(previousSource.src, document.image)
  assert.equal(previousSource.x, document.imageFrame.x)
  assert.equal(previousSource.y, document.imageFrame.y)
  assert.equal(next.results.length, document.results.length)
  assert.equal(next.region, null)
  assert.deepEqual(next.references, [])
})

test('deleting variations depends on selection, without requiring an output screen', () => {
  let document = initialDocument()
  document = { ...document, ...appendResults(document, [{ src: '/a.png' }], 'batch') }
  const state = historyReducer(createHistory(document), { type: 'update', patch: deleteSelection })
  assert.equal(state.present.results.length, 0)
  assert.deepEqual(historyReducer(state, { type: 'undo' }).present, document)
})

test('source photos participate in selection, deletion, and undo like generated photos', () => {
  const document = { ...initialDocument(), selected: ['source-original'] }
  assert.deepEqual(
    selectedImages(document).map((image) => image.id),
    [document.imageId],
  )
  const deleted = historyReducer(createHistory(document), {
    type: 'update',
    patch: deleteSelection,
  })
  assert.deepEqual(canvasImages(deleted.present), [])
  assert.deepEqual(deleted.present.selected, [])
  assert.equal(deleted.present.region, null)
  assert.deepEqual(
    fitCanvasView(deleted.present, stageLayout({ width: 1600, height: 1043 })),
    DEFAULT_VIEW,
  )
  assert.deepEqual(historyReducer(deleted, { type: 'undo' }).present, document)
})

test('Shift-drag adds intersecting photos and an empty drag clears the selection', () => {
  const document = outputDocument()
  const area = document.imageFrame
  assert.deepEqual(selectArea(document, area, true).selected, [
    'result-2',
    'result-3',
    document.imageId,
  ])
  assert.deepEqual(selectArea(document, { x: -1000, y: -1000, width: 10, height: 10 }), {
    selected: [],
    region: null,
  })
})
