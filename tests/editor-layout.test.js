import { outputDocument, regionDocument, promptingDocument } from './fixtures/documents.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { worldPoint, imagePoint } from '../src/editor/model/geometry.js'
import {
  DEFAULT_VIEW,
  IMAGE_SIZE,
  stageLayout,
  canvasBox,
  promptStyle,
  imageOperationsStyle,
  navigationWidth,
  MOBILE_NAV_HEIGHT,
} from '../src/editor/model/layout.js'
import { bounds } from '../src/editor/model/geometry.js'
import { selectedImages } from '../src/editor/model/selection.js'

test('the prompt anchors below the selected region at the design viewport', () => {
  const stage = stageLayout({ width: 1600, height: 1043 })
  assert.equal(stage.width, 1600)
  assert.equal(stage.height, 1043)
  assert.deepEqual(stage.offset, { x: 0, y: 0 })
  assert.deepEqual(promptStyle(regionDocument(), stage, DEFAULT_VIEW), {
    left: 709.5,
    top: 899,
    width: 344,
  })
})

test('region prompts stay centered below the region after photo resizing, panning, and zooming', () => {
  const stage = stageLayout({ width: 1600, height: 1043 })
  for (const references of [[], ['/reference.png']]) {
    const document = {
      ...regionDocument(),
      imageFrame: { x: 200, y: 120, width: IMAGE_SIZE.width / 2, height: IMAGE_SIZE.height / 2 },
      region: { x: 100, y: 100, width: 200, height: 120 },
      references,
    }
    for (const zoom of [0.5, 1, 2]) {
      const prompt = promptStyle(document, stage, { zoom, x: 100, y: 20 })
      assert.equal(prompt.left + prompt.width / 2, 100 + 300 * zoom)
      assert.equal(prompt.top, 20 + 230 * zoom + 7)
    }
  }
})

test('whole-photo and group prompts follow their selection and stay inside the workspace at every zoom', () => {
  const base = outputDocument()
  const stage = stageLayout({ width: 1600, height: 1043 })
  for (const selected of [[base.imageId], ['result-0', 'result-1']]) {
    for (const references of [[], ['/reference.png']]) {
      const document = { ...base, selected, references, region: null }
      const box = bounds(selectedImages(document))
      for (const zoom of [0.25, 1, 3]) {
        const view = { zoom, x: 30, y: -20 }
        const prompt = promptStyle(document, stage, view)
        const center = stage.offset.x + view.x + (box.x + box.width / 2) * zoom
        const bottom = stage.offset.y + view.y + (box.y + box.height) * zoom
        assert.ok(prompt.left >= 12)
        assert.ok(prompt.left + prompt.width <= stage.width - 82 - 12)
        assert.ok(prompt.top >= 88)
        assert.ok(prompt.top + (references.length ? 200 : 48) <= stage.height - 84)
        if (center - prompt.width / 2 >= 12 && center + prompt.width / 2 <= stage.width - 94)
          assert.ok(Math.abs(prompt.left + prompt.width / 2 - center) < 1e-9)
        if (bottom + 7 >= 88 && bottom + 7 + (references.length ? 200 : 48) <= stage.height - 84)
          assert.equal(prompt.top - bottom, 7)
      }
    }
  }
})

test('pointer coordinates account for canvas origin, pan, and zoom in a smaller viewport', () => {
  const stage = stageLayout({ width: 800, height: 600 })
  const view = { x: 25, y: -40, zoom: 1.5 }
  const rect = { left: 82, top: 0 }
  const world = { x: 400, y: 700 }
  const client = {
    x: rect.left + stage.offset.x + view.x + world.x * view.zoom,
    y: rect.top + stage.offset.y + view.y + world.y * view.zoom,
  }
  assert.deepEqual(worldPoint(client, rect, stage, view), world)
  assert.deepEqual(
    imagePoint({ x: 52 + 1245, y: -350 + 1245 }, promptingDocument().imageFrame, IMAGE_SIZE),
    { x: IMAGE_SIZE.width, y: IMAGE_SIZE.height },
  )
})

test('resizing contracts canvas space without changing image or control dimensions', () => {
  const document = regionDocument()
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1600, height: 1043 },
    { width: 1366, height: 768 },
    { width: 1024, height: 600 },
  ]) {
    const stage = stageLayout(viewport)
    assert.equal(stage.width, viewport.width)
    assert.equal(stage.height, viewport.height)
    const image = canvasBox(document.imageFrame, stage, DEFAULT_VIEW)
    assert.equal(image.width, document.imageFrame.width)
    assert.equal(image.height, document.imageFrame.height)
    assert.ok(Math.abs(image.x + image.width / 2 - (viewport.width - 82) / 2) < 0.1)
    assert.equal(promptStyle(document, stage, DEFAULT_VIEW).width, 344)
  }
})

test('floating prompts and image operations stay reachable on narrow and short screens', () => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 800, height: 600 },
    { width: 390, height: 667 },
  ]) {
    const stage = stageLayout(viewport)
    const workspaceWidth = viewport.width - navigationWidth(stage)
    const workspaceHeight = viewport.height - (viewport.width <= 600 ? MOBILE_NAV_HEIGHT : 0)
    for (const document of [regionDocument(), promptingDocument(), { ...regionDocument(), region: null }]) {
      const prompt = promptStyle(document, stage, DEFAULT_VIEW)
      assert.ok(prompt.left >= 12)
      assert.ok(prompt.left + prompt.width <= workspaceWidth - 12)
      assert.ok(prompt.top >= 88)
      assert.ok(prompt.top + (document.references.length ? 200 : 48) <= workspaceHeight - 84)
      const operations = imageOperationsStyle(document.imageFrame, stage, DEFAULT_VIEW)
      assert.ok(operations.left >= 12)
      assert.ok(operations.left + operations.width <= workspaceWidth - 12)
      assert.ok(operations.top + 53.2 <= workspaceHeight - 84)
    }
  }
})
