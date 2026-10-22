import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adjustImageBounds, applyImageBounds, emptyBoundsRegion, imageBoundsPlan,
  moveImageBehindCrop, uncroppedImage,
} from '../src/editor/model/image-bounds.js'
import { editResult, initialDocument } from '../src/editor/model/document.js'
import { createHistory, historyReducer } from '../src/editor/model/history.js'
import { canvasImages } from '../src/editor/model/selection.js'
import { renderImageBounds } from '../src/editor/services/image-bounds.js'
import { TOOLS } from '../src/editor/model/tools.js'

const frame = { x: 100, y: 100, width: 200, height: 150 }

test('crop handles, movement, and drawing stay inside the photo without changing its scale', () => {
  const box = { x: 130, y: 120, width: 100, height: 80 }
  for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    for (const delta of [-10000, 10000]) {
      const crop = adjustImageBounds(box, frame, 'crop', handle, { x: 0, y: 0 }, { x: delta, y: delta })
      assert.ok(crop.x >= frame.x && crop.y >= frame.y)
      assert.ok(crop.x + crop.width <= frame.x + frame.width)
      assert.ok(crop.y + crop.height <= frame.y + frame.height)
      assert.ok(crop.width >= 8 && crop.height >= 8)
    }
    assert.deepEqual(adjustImageBounds(box, frame, 'crop', handle, { x: 20, y: 30 }, { x: 20, y: 30 }), box)
  }
  assert.deepEqual(adjustImageBounds(box, frame, 'crop', 'move', { x: 0, y: 0 }, { x: 9999, y: -9999 }), {
    x: 200, y: 100, width: 100, height: 80,
  })
  assert.deepEqual(adjustImageBounds(box, frame, 'crop', 'draw', { x: 400, y: 500 }, { x: 150, y: 50 }), {
    x: 150, y: 100, width: 150, height: 150,
  })
})

test('expansion rectangles can be drawn in either direction and extended asymmetrically', () => {
  const start = { x: 20, y: 70 }, end = { x: 350, y: 270 }
  const expected = { x: 20, y: 70, width: 330, height: 200 }
  assert.deepEqual(adjustImageBounds(frame, frame, 'expand', 'draw', start, end), expected)
  assert.deepEqual(adjustImageBounds(frame, frame, 'expand', 'draw', end, start), expected)
  assert.deepEqual(adjustImageBounds(frame, frame, 'expand', 'w', { x: 100, y: 170 }, { x: 20, y: 170 }), {
    x: 20, y: 100, width: 280, height: 150,
  })
  assert.deepEqual(adjustImageBounds(frame, frame, 'expand', 'move', start, end), {
    ...frame, x: 430, y: 300,
  })
})

test('raster plans preserve the displayed photo pixels, including object-fit cover and transparent padding', () => {
  const natural = { width: 800, height: 300 }
  const crop = imageBoundsPlan(frame, { x: 150, y: 125, width: 100, height: 75 }, natural)
  assert.equal(crop.width, 200)
  assert.equal(crop.height, 150)
  assert.deepEqual(crop.source, { x: 200, y: 0, width: 400, height: 300 })
  assert.deepEqual(crop.destination, { x: -100, y: -50, width: 400, height: 300 })
  const expansion = imageBoundsPlan(frame, { x: 20, y: 70, width: 280, height: 180 }, natural)
  assert.equal(expansion.width, 560)
  assert.equal(expansion.height, 360)
  assert.deepEqual(expansion.source, crop.source)
  assert.deepEqual(expansion.destination, { x: 160, y: 60, width: 400, height: 300 })
})

test('cropping source photos or variations changes only the target and is one undoable edit', () => {
  const source = {
    ...initialDocument(), imageFrame: frame,
    results: [{ id: 'variation', src: '/variation.png', ...frame }],
    prompt: 'keep this prompt', references: ['/reference.png'],
  }
  const box = { x: 150, y: 125, width: 100, height: 75 }
  for (const image of canvasImages(source)) {
    const state = historyReducer(createHistory(source), {
      type: 'update', patch: (document) => applyImageBounds(document, image.id, box, '/cropped.png', 'crop'),
    })
    const cropped = canvasImages(state.present).find((item) => item.id === image.id)
    assert.deepEqual(cropped, {
      ...box, id: image.id, src: '/cropped.png',
      cropSource: { src: image.src, x: -.5, y: -1 / 3, width: 2, height: 2 },
    })
    assert.deepEqual(uncroppedImage(cropped), image)
    for (const untouched of canvasImages(source).filter((item) => item.id !== image.id))
      assert.deepEqual(canvasImages(state.present).find((item) => item.id === untouched.id), untouched)
    assert.equal(state.present.prompt, source.prompt)
    assert.deepEqual(state.present.references, source.references)
    assert.equal(state.past.length, 1)
    const undone = historyReducer(state, { type: 'undo' })
    assert.deepEqual(undone.present, source)
    assert.deepEqual(historyReducer(undone, { type: 'redo' }).present, state.present)
  }
})

test('dragging the original moves its pixels behind a fixed crop and keeps the crop covered', () => {
  const source = { id: 'photo', src: '/original.png', ...frame }
  const box = { x: 150, y: 125, width: 100, height: 75 }
  assert.deepEqual(moveImageBehindCrop(source, box, { x: 20, y: -10 }), { ...source, x: 120, y: 90 })
  assert.deepEqual(moveImageBehindCrop(source, box, { x: -9999, y: 9999 }), { ...source, x: 50, y: 125 })
  assert.deepEqual(box, { x: 150, y: 125, width: 100, height: 75 })
})

test('repeated cropping retains the original pixels and allows reopening and restoring the whole photo', () => {
  let document = { ...initialDocument(), imageFrame: frame }
  const original = canvasImages(document)[0]
  const box = { x: 150, y: 125, width: 100, height: 75 }
  document = { ...document, ...applyImageBounds(document, original.id, box, '/first-crop.png', 'crop') }
  const moved = moveImageBehindCrop(uncroppedImage(canvasImages(document)[0]), box, { x: 20, y: -10 })
  const patch = applyImageBounds(document, original.id, box, '/repositioned.png', 'crop', moved)
  assert.ok(patch, 'repositioning must save even though the crop window did not change')
  let history = historyReducer(createHistory(document), { type: 'update', patch })
  const recropped = canvasImages(history.present)[0]
  assert.equal(recropped.cropSource.src, original.src)
  assert.deepEqual(uncroppedImage(recropped), moved)
  assert.deepEqual(history.present.imageFrame, box)
  assert.deepEqual(historyReducer(history, { type: 'undo' }).present, document)
  history = historyReducer(history, { type: 'update', patch: (current) =>
    applyImageBounds(current, original.id, frame, '/restored.png', 'crop', original),
  })
  assert.deepEqual(history.present.imageFrame, frame)
  assert.deepEqual(uncroppedImage(canvasImages(history.present)[0]), original)
})

test('the preserved original follows photo movement and resizing, including variation promotion', () => {
  const document = { ...initialDocument(), imageFrame: frame,
    results: [{ id: 'variation', src: '/variation.png', ...frame }],
  }
  const box = { x: 150, y: 125, width: 100, height: 75 }
  const cropped = { ...document, ...applyImageBounds(document, 'variation', box, '/cropped.png', 'crop') }
  const variation = cropped.results[0]
  assert.deepEqual(uncroppedImage({ ...variation, x: 200, y: 300, width: 200, height: 150 }), {
    id: 'variation', src: '/variation.png', x: 100, y: 250, width: 400, height: 300,
  })
  const promoted = { ...cropped, ...editResult(cropped, 'variation') }
  assert.deepEqual(promoted.cropSource, variation.cropSource)
  assert.deepEqual(uncroppedImage(canvasImages(promoted)[0]), document.results[0])
  const swappedBack = { ...promoted, ...editResult(promoted, document.imageId) }
  assert.deepEqual(swappedBack.results[0].cropSource, variation.cropSource)
})

test('expanding a variation preserves the old source and selects only the added empty area for prompting', () => {
  const document = {
    ...initialDocument(),
    results: [{ id: 'variation', src: '/variation.png', ...frame }],
    prompt: 'extend the scenery', references: ['/reference.png'],
  }
  const box = { x: 20, y: 70, width: 280, height: 180 }
  const next = { ...document, ...applyImageBounds(document, 'variation', box, '/expanded.png', 'expand') }
  assert.equal(next.imageId, 'variation')
  assert.equal(next.image, '/expanded.png')
  assert.deepEqual(next.imageFrame, box)
  assert.deepEqual(next.selected, ['variation'])
  assert.equal(next.expansion, 0)
  assert.deepEqual(next.results[0], canvasImages(document)[0])
  assert.deepEqual(next.region, emptyBoundsRegion(frame, box))
  assert.equal((next.region.outline.path.match(/M/g) ?? []).length, 2)
  assert.equal(next.prompt, document.prompt)
  assert.deepEqual(next.references, document.references)
  assert.equal(emptyBoundsRegion(frame, { x: 120, y: 120, width: 100, height: 100 }), null)
})

test('unchanged, non-overlapping, and out-of-photo crops cannot create a document edit', () => {
  const document = { ...initialDocument(), imageFrame: frame }
  const id = document.imageId
  assert.equal(applyImageBounds(document, id, frame, '/unchanged.png', 'crop'), null)
  assert.equal(applyImageBounds(document, id, { ...frame, x: -1000 }, '/empty.png', 'expand'), null)
  assert.equal(applyImageBounds(document, id, { ...frame, x: 50 }, '/outside.png', 'crop'), null)
  assert.equal(TOOLS.some((tool) => tool.id === 'crop'), false)
})

test('applying bounds exports a PNG at native resolution using only the visible source pixels', async () => {
  const previousImage = globalThis.Image, previousDocument = globalThis.document
  let draw, loaded, output
  try {
    globalThis.Image = class {
      naturalWidth = 800
      naturalHeight = 300
      set src(value) { loaded = value }
      async decode() {}
    }
    const canvas = {
      getContext: () => ({ drawImage(...args) { draw = args.slice(1) } }),
      toDataURL(type) { output = type; return 'data:image/png;base64,result' },
    }
    globalThis.document = { createElement: () => canvas }
    const result = await renderImageBounds({ ...frame, src: '/original.png' }, {
      x: 20, y: 70, width: 280, height: 180,
    })
    assert.equal(loaded, '/original.png')
    assert.equal(output, 'image/png')
    assert.equal(result, 'data:image/png;base64,result')
    assert.equal(canvas.width, 560)
    assert.equal(canvas.height, 360)
    assert.deepEqual(draw, [200, 0, 400, 300, 160, 60, 400, 300])
  } finally {
    if (previousImage === undefined) delete globalThis.Image
    else globalThis.Image = previousImage
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})
