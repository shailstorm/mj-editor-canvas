import { outputDocument, regionDocument } from './fixtures/documents.js'
import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { Children, isValidElement, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'vite'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { initialDocument } from '../src/editor/model/document.js'
import { DEFAULT_VIEW, stageLayout, regionBounds } from '../src/editor/model/layout.js'
import { worldPoint } from '../src/editor/model/geometry.js'

let PromptCard, ReferenceImages, EditorCanvas, ProjectsDialog, useCanvasGestures, useEditor
let SourceImage, ResultImages, Navigation, HelpDialog, Topbar
before(async () => {
  const outDir = 'node_modules/.cache/editor-component-tests'
  await build({
    logLevel: 'silent',
    build: { ssr: resolve('tests/fixtures/editor-components.jsx'), outDir, emptyOutDir: true },
  })
  const components = await import(pathToFileURL(resolve(outDir, 'editor-components.js')))
  PromptCard = components.PromptCard
  ReferenceImages = components.ReferenceImages
  EditorCanvas = components.EditorCanvas
  ProjectsDialog = components.ProjectsDialog
  SourceImage = components.SourceImage
  ResultImages = components.ResultImages
  Navigation = components.Navigation
  Topbar = components.Topbar
  HelpDialog = components.HelpDialog
  useEditor = components.useEditor
  useCanvasGestures = components.useCanvasGestures
})

test('desktop and mobile navigation are static; Help opens from the topbar controls', () => {
  let opened = false
  const tree = Navigation()
  for (const label of ['Main navigation', 'Mobile navigation']) {
    const nav = find(tree, (element) => element.type === 'nav' && element.props['aria-label'] === label)
    assert.equal(nav.props['aria-disabled'], 'true')
    assert.equal(find(nav, (element) => element.props.onClick || element.props.tabIndex !== undefined), null)
    const html = renderToStaticMarkup(nav)
    assert.doesNotMatch(html, /<(button|a)\b/)
    assert.match(html, /active/)
  }
  const topbar = Topbar({ zoom: 100, openHelp: () => { opened = true } })
  const help = find(topbar, (element) => element.props.className === 'corner-help')
  help.props.onClick()
  assert.equal(opened, true)
  const html = renderToStaticMarkup(createElement(HelpDialog, { onClose() {} }))
  assert.match(html, /role="dialog"/)
  assert.match(html, /Make room for an idea\./)
  assert.match(html, /Crop with Select/)
  assert.match(html, /Double-click photo/)
})

test('double-clicking source and generated photos crops only when Select is active', () => {
  const document = outputDocument()
  const cropped = [], edited = []
  for (const tool of ['cursor', 'rectangle', 'lasso']) {
    const tree = EditorCanvas({
      document, tool, stage: stageLayout({ width: 1600, height: 1043 }), view: DEFAULT_VIEW,
      actions: { cropImage: (id) => cropped.push(id), editResult: (id) => edited.push(id) },
    })
    const source = find(tree, (element) => element.type === SourceImage)
    const photo = find(SourceImage(source.props), (element) => element.props['data-image'] === document.imageId)
    if (tool === 'cursor') photo.props.onDoubleClick({ stopPropagation() {} })
    else assert.equal(photo.props.onDoubleClick, undefined)
    const results = find(tree, (element) => element.type === ResultImages)
    const variation = find(ResultImages(results.props), (element) => element.props['data-image'] === document.results[0].id)
    variation.props.onDoubleClick({ stopPropagation() {} })
  }
  assert.deepEqual(cropped, [document.imageId, document.results[0].id])
  assert.deepEqual(edited, [document.results[0].id, document.results[0].id])
})

test('double-click crop resolves the clicked photo after pointer capture retargets to the workspace', () => {
  const document = outputDocument()
  const cropped = []
  for (const tool of ['cursor', 'rectangle']) {
    const session = selectionGesture(document, { zoom: .75, x: 30, y: -20 }, tool, {
      cropImage: (id) => cropped.push(id),
    })
    for (const image of [
      { id: document.imageId, ...document.imageFrame }, document.results[0],
    ]) {
      const event = session.event(image.x + 10, image.y + 10)
      session.gestures.pointerHandlers.onDoubleClick(event)
    }
    session.gestures.pointerHandlers.onDoubleClick(session.event(-1000, -1000))
  }
  assert.deepEqual(cropped, [document.imageId, document.results[0].id])
})

function selectionGesture(document, view = DEFAULT_VIEW, tool = 'cursor', actions = {}, viewport = { width: 1600, height: 1043 }) {
  let current = document
  let currentView = view
  const commits = []
  let gestures
  const stage = stageLayout(viewport)
  const boardLeft = viewport.width <= 600 ? 0 : 82
  function Capture() {
    // Expose the server-rendered hook's handlers to the test; this is not a mounted UI.
    // eslint-disable-next-line react/globals
    gestures = useCanvasGestures({
      document,
      history: {
        preview(patch) {
          current = { ...current, ...patch }
        },
        commit(before) {
          commits.push(before)
        },
      },
      actions,
      tool,
      spaceHeld: false,
      stage,
      view,
      setView(next) {
        currentView = typeof next === 'function' ? next(currentView) : next
      },
      closePanel() {},
    })
    return null
  }
  renderToStaticMarkup(createElement(Capture))
  const board = {
    getBoundingClientRect: () => ({ left: boardLeft, top: 0 }),
    setPointerCapture() {},
  }
  gestures.boardRef.current = board
  function event(x, y, imageId, shiftKey = false, transformTarget) {
    return {
      clientX: boardLeft + stage.offset.x + currentView.x + x * currentView.zoom,
      clientY: stage.offset.y + currentView.y + y * currentView.zoom,
      button: 0,
      pointerId: 1,
      shiftKey,
      currentTarget: board,
      preventDefault() {},
      target: {
        closest(selector) {
          if (selector === '[data-image]' && imageId) return { dataset: { image: imageId } }
          if (selector === '[data-resize-corner]' && transformTarget?.corner)
            return {
              dataset: {
                resizeCorner: transformTarget.corner,
                resizeTarget: transformTarget.target,
              },
            }
          if (selector === '[data-region-move]' && transformTarget?.moveRegion)
            return { dataset: {} }
          return null
        },
      },
    }
  }
  function touch(pointerId, clientX, clientY, imageId) {
    return { ...event(0, 0, imageId), pointerId, pointerType: 'touch', clientX, clientY }
  }
  return { gestures, event, touch, commits, stage, board, document: () => current, view: () => currentView }
}

test('Select and Hand pinch in and out around the fingers on mobile, including two-finger panning', () => {
  for (const tool of ['cursor', 'hand']) {
    const document = outputDocument()
    const initialView = { zoom: .75, x: 30, y: -20 }
    const session = selectionGesture(document, initialView, tool, {}, { width: 390, height: 844 })
    const handlers = session.gestures.pointerHandlers
    const anchor = worldPoint({ x: 150, y: 200 }, session.board.getBoundingClientRect(), session.stage, initialView)
    handlers.onPointerDown(session.touch(1, 100, 200, document.imageId))
    handlers.onPointerDown(session.touch(2, 200, 200, document.imageId))
    function move(first, second, zoom) {
      handlers.onPointerMove(session.touch(1, ...first))
      handlers.onPointerMove(session.touch(2, ...second))
      assert.equal(session.view().zoom, zoom)
      const center = { x: (first[0] + second[0]) / 2, y: (first[1] + second[1]) / 2 }
      const actual = worldPoint(center, session.board.getBoundingClientRect(), session.stage, session.view())
      assert.ok(Math.abs(actual.x - anchor.x) < 1e-9)
      assert.ok(Math.abs(actual.y - anchor.y) < 1e-9)
    }
    move([50, 200], [250, 200], 1.5)
    move([80, 240], [280, 240], 1.5)
    move([155, 240], [205, 240], .375)
    handlers.onPointerUp(session.touch(2, 205, 240))
    handlers.onPointerUp(session.touch(1, 155, 240))
    assert.deepEqual(session.document(), document)
    assert.equal(session.commits.length, 0)
  }
})

test('starting a pinch rolls back a pending photo drag and ignores the remaining finger after release', () => {
  const document = outputDocument()
  const session = selectionGesture(document)
  const handlers = session.gestures.pointerHandlers
  handlers.onPointerDown(session.touch(1, 400, 200, document.imageId))
  handlers.onPointerMove(session.touch(1, 440, 220))
  assert.notDeepEqual(session.document().imageFrame, document.imageFrame)
  handlers.onPointerDown(session.touch(2, 540, 220))
  assert.deepEqual(session.document(), document)
  handlers.onPointerMove(session.touch(2, 640, 220))
  const finalView = session.view()
  handlers.onPointerUp(session.touch(2, 640, 220))
  handlers.onPointerMove(session.touch(1, 300, 300))
  handlers.onPointerUp(session.touch(1, 300, 300))
  assert.deepEqual(session.view(), finalView)
  assert.deepEqual(session.document(), document)
  assert.equal(session.commits.length, 0)
})

test('touch zoom respects the existing limits and supports a third finger, capture loss, and a new gesture', () => {
  const session = selectionGesture(outputDocument(), DEFAULT_VIEW, 'hand')
  const handlers = session.gestures.pointerHandlers
  handlers.onPointerDown(session.touch(1, 100, 200))
  handlers.onPointerDown(session.touch(2, 200, 200))
  handlers.onPointerMove(session.touch(1, 149, 200))
  handlers.onPointerMove(session.touch(2, 151, 200))
  assert.equal(session.view().zoom, .25)
  handlers.onPointerMove(session.touch(1, -850, 200))
  handlers.onPointerMove(session.touch(2, 1150, 200))
  assert.equal(session.view().zoom, 3)
  const beforeThird = session.view()
  handlers.onPointerDown(session.touch(3, 150, 300))
  handlers.onPointerUp(session.touch(1, -850, 200))
  assert.deepEqual(session.view(), beforeThird)
  handlers.onPointerMove(session.touch(2, 650, 250))
  assert.equal(session.view().zoom, 1.5)
  handlers.onLostPointerCapture({ ...session.touch(2, 650, 250), target: session.board })
  const cancelledView = session.view()
  handlers.onPointerMove(session.touch(3, 300, 300))
  handlers.onPointerUp(session.touch(3, 300, 300))
  assert.deepEqual(session.view(), cancelledView)
  handlers.onPointerDown(session.touch(4, 100, 200))
  handlers.onPointerDown(session.touch(5, 200, 200))
  handlers.onPointerMove(session.touch(4, 125, 200))
  handlers.onPointerMove(session.touch(5, 175, 200))
  assert.equal(session.view().zoom, .75)
  handlers.onPointerCancel()
  assert.equal(session.commits.length, 0)
})

test('one-finger Hand panning and Select image movement retain their behavior and undo handling', () => {
  for (const tool of ['cursor', 'hand']) {
    const document = outputDocument()
    const session = selectionGesture(document, { zoom: 2, x: 30, y: -20 }, tool)
    const handlers = session.gestures.pointerHandlers
    handlers.onPointerDown(session.touch(1, 400, 200, document.imageId))
    handlers.onPointerMove(session.touch(1, 440, 220))
    handlers.onPointerUp(session.touch(1, 440, 220))
    if (tool === 'hand') {
      assert.deepEqual(session.view(), { zoom: 2, x: 70, y: 0 })
      assert.deepEqual(session.document(), document)
      assert.equal(session.commits.length, 0)
    } else {
      assert.deepEqual(session.view(), { zoom: 2, x: 30, y: -20 })
      assert.equal(session.document().imageFrame.x, document.imageFrame.x + 20)
      assert.equal(session.document().imageFrame.y, document.imageFrame.y + 10)
      assert.equal(session.commits.length, 1)
    }
  }
})

test('prompt controls are excluded from pinches and child capture changes cannot cancel a canvas drag', () => {
  const document = outputDocument()
  const session = selectionGesture(document)
  const handlers = session.gestures.pointerHandlers
  const control = {
    ...session.touch(2, 400, 200),
    target: { closest: (selector) => selector === 'button,input,form,.image-operations' ? {} : null },
  }
  handlers.onPointerDown(control)
  handlers.onPointerDown(session.touch(1, 400, 200, document.imageId))
  handlers.onLostPointerCapture(session.touch(1, 400, 200, document.imageId))
  handlers.onPointerMove(session.touch(1, 440, 220))
  handlers.onPointerUp(session.touch(1, 440, 220))
  assert.equal(session.document().imageFrame.x, document.imageFrame.x + 40)
  assert.equal(session.commits.length, 1)
  assert.deepEqual(session.view(), DEFAULT_VIEW)
})

test('a second touch cannot zoom or interrupt rectangle selection or trigger another tool action', () => {
  for (const tool of ['rectangle', 'lasso', 'auto', 'expand']) {
    const document = regionDocument()
    const triggered = []
    const session = selectionGesture(document, DEFAULT_VIEW, tool, {
      autoSelect: () => triggered.push('auto'),
      expand: () => triggered.push('expand'),
    })
    const handlers = session.gestures.pointerHandlers
    const primary = { ...session.event(400, 200, document.imageId), pointerType: 'touch' }
    handlers.onPointerDown(primary)
    handlers.onPointerDown({ ...session.event(500, 300, document.imageId), pointerType: 'touch', pointerId: 2 })
    handlers.onPointerMove({ ...session.event(600, 400), pointerType: 'touch', pointerId: 2 })
    handlers.onPointerUp({ ...session.event(600, 400), pointerType: 'touch', pointerId: 2 })
    assert.equal(session.commits.length, 0)
    handlers.onPointerMove({ ...session.event(600, 200), pointerType: 'touch' })
    handlers.onPointerMove({ ...session.event(600, 400), pointerType: 'touch' })
    handlers.onPointerMove({ ...session.event(400, 400), pointerType: 'touch' })
    handlers.onPointerUp({ ...session.event(600, 400), pointerType: 'touch' })
    assert.deepEqual(session.view(), DEFAULT_VIEW)
    if (tool === 'rectangle' || tool === 'lasso') {
      assert.equal(session.commits.length, 1)
      assert.equal(session.document().region.width, 200)
      assert.equal(session.document().region.height, 200)
    } else assert.deepEqual(triggered, [tool])
  }
})

test('startup ignores legacy example URLs and renders no selection or editing controls', () => {
  const previousLocation = globalThis.location
  try {
    for (const hash of ['', '#selection', '#prompting', '#output']) {
      globalThis.location = { hash }
      let editor
      function Capture() {
        // Capture initial hook state without mounting browser effects.
        // eslint-disable-next-line react/globals
        editor = useEditor({ resetView() {}, notify() {} })
        return null
      }
      renderToStaticMarkup(createElement(Capture))
      assert.deepEqual(editor.document, initialDocument())
      assert.equal(editor.tool, 'cursor')
      assert.equal(editor.history.canUndo, false)
      assert.equal(editor.history.canRedo, false)
      assert.equal(editor.promptOpen, false)
      const html = renderToStaticMarkup(
        createElement(
          EditorCanvas,
          {
            document: editor.document,
            stage: stageLayout({ width: 1600, height: 1043 }),
            view: DEFAULT_VIEW,
            tool: editor.tool,
            actions: editor.actions,
          },
          createElement(PromptCard, promptProps(editor.document)),
        ),
      )
      assert.doesNotMatch(html, /selection-box|region-mask|prompt-card|image-operations/)
    }
  } finally {
    if (previousLocation === undefined) delete globalThis.location
    else globalThis.location = previousLocation
  }
})

test('projects shows the current canvas and upload action without example canvases', () => {
  const html = renderToStaticMarkup(
    createElement(ProjectsDialog, {
      image: '/my-photo.png',
      onClose() {},
      onUpload() {},
    }),
  )
  assert.match(html, /Current canvas/)
  assert.match(html, /my-photo.png/)
  assert.match(html, /Upload an image/)
  assert.doesNotMatch(html, /Example canvases|Region selection|Region prompting|scene-links/)
})

test('magic-wand clicks target the actual source or generated photo at the clicked canvas point', () => {
  const document = outputDocument()
  const clicked = []
  for (const id of [document.imageId, document.results[0].id]) {
    const session = selectionGesture(document, { zoom: 2, x: 30, y: -40 }, 'auto', {
      autoSelect(imageId, point, element) {
        clicked.push({ imageId, point, elementId: element.dataset.image })
      },
    })
    session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, id))
    session.gestures.pointerHandlers.onPointerUp()
    assert.deepEqual(session.document(), document)
  }
  assert.deepEqual(
    clicked,
    [document.imageId, document.results[0].id].map((id) => ({
      imageId: id,
      point: { x: 400, y: 200 },
      elementId: id,
    })),
  )
})

test('a wand selection renders as an overlay and never replaces the source photo', () => {
  const document = {
    ...regionDocument(),
    region: {
      x: 10,
      y: 10,
      width: 30,
      height: 40,
      outline: { path: 'M10 10L40 10L40 50L10 50Z', width: 100, height: 100 },
    },
  }
  for (const zoom of [0.25, 1, 3]) {
    const html = renderToStaticMarkup(
      createElement(EditorCanvas, {
        document,
        stage: stageLayout({ width: 1600, height: 1043 }),
        view: { zoom, x: 0, y: 0 },
        tool: 'auto',
        actions: {},
      }),
    )
    assert.match(html, /class="region-mask"/)
    assert.match(html, /vector-effect="non-scaling-stroke"/)
    assert.ok(html.includes(`src="${document.image}"`))
    assert.doesNotMatch(html, /prompting-Screenshot20261005At90323Pm1/)
    assert.doesNotMatch(html, /class="selection-box/)
    assert.doesNotMatch(html, /image-operations/)
  }
})

test('lasso shows the prompt after drawing, while image operations remain hidden for regions', () => {
  const document = initialDocument()
  const session = selectionGesture(document, DEFAULT_VIEW, 'lasso')
  const start = session.event(400, 200, document.imageId)
  session.gestures.pointerHandlers.onPointerDown(start)
  function controlsVisible(isSelectingRegion) {
    const current = session.document()
    const prompt = PromptCard(promptProps(current, { isSelectingRegion }))
    const canvas = renderToStaticMarkup(
      createElement(EditorCanvas, {
        document: current,
        stage: stageLayout({ width: 1600, height: 1043 }),
        view: DEFAULT_VIEW,
        tool: 'lasso',
        actions: {},
        isSelectingRegion,
      }),
    )
    return { prompt: Boolean(prompt), operations: canvas.includes('image-operations') }
  }
  assert.deepEqual(controlsVisible(true), { prompt: false, operations: false })
  session.gestures.pointerHandlers.onPointerMove(session.event(500, 200, document.imageId))
  session.gestures.pointerHandlers.onPointerMove(session.event(450, 300, document.imageId))
  assert.equal(session.commits.length, 0)
  assert.deepEqual(controlsVisible(true), { prompt: false, operations: false })
  session.gestures.pointerHandlers.onPointerUp()
  assert.equal(session.commits.length, 1)
  assert.equal(session.document().region.width, 100)
  assert.equal(session.document().region.height, 100)
  assert.match(session.document().region.outline.path, /^M.*L.*L.*Z$/)
  assert.deepEqual(controlsVisible(false), { prompt: true, operations: false })
})

test('rectangle selection draws a region in either direction and opens its prompt only on release', () => {
  const document = initialDocument()
  for (const zoom of [0.5, 1, 2]) {
    for (const reverse of [false, true]) {
      const session = selectionGesture(document, { zoom, x: 30, y: -20 }, 'rectangle')
      const start = reverse ? [500, 300] : [400, 200]
      const end = reverse ? [400, 200] : [500, 300]
      session.gestures.pointerHandlers.onPointerDown(session.event(...start, document.imageId))
      assert.equal(PromptCard(promptProps(session.document(), { isSelectingRegion: true })), null)
      session.gestures.pointerHandlers.onPointerMove(session.event(...end))
      assert.equal(session.commits.length, 0)
      session.gestures.pointerHandlers.onPointerUp()
      assert.equal(session.commits.length, 1)
      const current = session.document()
      assert.deepEqual(current.region, { x: 57, y: 130, width: 100, height: 100 })
      assert.deepEqual(current.imageFrame, document.imageFrame)
      assert.ok(PromptCard(promptProps(current)))
      const html = renderToStaticMarkup(
        createElement(EditorCanvas, {
          document: current,
          stage: stageLayout({ width: 1600, height: 1043 }),
          view: DEFAULT_VIEW,
          tool: 'rectangle',
          actions: {},
        }),
      )
      assert.match(html, /region-selection/)
      assert.doesNotMatch(html, /image-operations/)
    }
  }
})

test('rectangle selection works on generated photos and clamps to the photo edge', () => {
  const document = outputDocument()
  const image = document.results[0]
  const session = selectionGesture(document, DEFAULT_VIEW, 'rectangle')
  session.gestures.pointerHandlers.onPointerDown(
    session.event(image.x + 10, image.y + 20, image.id),
  )
  session.gestures.pointerHandlers.onPointerMove(session.event(image.x + 1000, image.y + 1000))
  session.gestures.pointerHandlers.onPointerUp()
  const current = session.document()
  assert.equal(current.imageId, image.id)
  assert.deepEqual(current.imageFrame, {
    x: image.x,
    y: image.y,
    width: image.width,
    height: image.height,
  })
  const box = regionBounds(current.region, current.imageFrame)
  assert.ok(Math.abs(box.x - image.x - 10) < 1e-9)
  assert.ok(Math.abs(box.y - image.y - 20) < 1e-9)
  assert.ok(Math.abs(box.width - image.width + 10) < 1e-9)
  assert.ok(Math.abs(box.height - image.height + 20) < 1e-9)
  assert.equal(session.commits.length, 1)
})

test('rectangle selection on empty canvas selects whole photos without moving them', () => {
  const document = outputDocument()
  const session = selectionGesture(document, DEFAULT_VIEW, 'rectangle')
  session.gestures.pointerHandlers.onPointerDown(session.event(170, 530))
  session.gestures.pointerHandlers.onPointerMove(session.event(740, 820))
  session.gestures.pointerHandlers.onPointerUp()
  assert.deepEqual(session.document().selected, ['result-0', 'result-1'])
  assert.equal(session.document().region, null)
  assert.deepEqual(session.document().results, document.results)
  assert.equal(PromptCard(promptProps(session.document())), null)
})

test('lasso clicks and undersized regions leave no selection or operation controls', () => {
  for (const end of [null, [402, 202], [500, 202]]) {
    const document = initialDocument()
    const session = selectionGesture(document, DEFAULT_VIEW, 'lasso')
    session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, document.imageId))
    if (end) session.gestures.pointerHandlers.onPointerMove(session.event(...end, document.imageId))
    session.gestures.pointerHandlers.onPointerUp()
    assert.deepEqual(session.document().selected, [])
    assert.equal(session.document().region, null)
    assert.equal(session.commits.length, 0)
    assert.equal(PromptCard(promptProps(session.document())), null)
  }
})

test('cancelling a lasso gesture restores the previous completed selection', () => {
  const document = initialDocument()
  const session = selectionGesture(document, DEFAULT_VIEW, 'lasso')
  session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, document.imageId))
  session.gestures.pointerHandlers.onPointerMove(session.event(500, 300, document.imageId))
  session.gestures.pointerHandlers.onPointerCancel()
  assert.deepEqual(session.document(), document)
  assert.equal(session.commits.length, 0)
})

test('Select clicks select source and result photos; empty canvas clears selection and controls', () => {
  const document = outputDocument()
  for (const id of [document.imageId, document.results[0].id]) {
    const session = selectionGesture(document)
    session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, id))
    session.gestures.pointerHandlers.onPointerUp()
    assert.deepEqual(session.document().selected, [id])
    assert.equal(session.document().region, null)
    assert.equal(PromptCard(promptProps(session.document())), null)
    const html = renderToStaticMarkup(
      createElement(EditorCanvas, {
        document: session.document(),
        stage: stageLayout({ width: 1600, height: 1043 }),
        view: DEFAULT_VIEW,
        tool: 'cursor',
        actions: {},
      }),
    )
    assert.match(html, /image-operations/)
  }
  const session = selectionGesture(document)
  session.gestures.pointerHandlers.onPointerDown(session.event(10, 10))
  session.gestures.pointerHandlers.onPointerUp()
  const cleared = session.document()
  assert.deepEqual(cleared.selected, [])
  assert.equal(cleared.region, null)
  assert.equal(PromptCard(promptProps(cleared)), null)
  const html = renderToStaticMarkup(
    createElement(EditorCanvas, {
      document: cleared,
      stage: stageLayout({ width: 1600, height: 1043 }),
      view: DEFAULT_VIEW,
      tool: 'cursor',
      actions: {},
      pointerHandlers: {},
    }),
  )
  assert.doesNotMatch(html, /image-operations|selection-box/)
})

test('whole photos and groups show the prompt only after the image-operations sparkle is clicked', () => {
  const base = outputDocument()
  for (const selected of [[base.imageId], ['result-0'], ['result-0', 'result-1']]) {
    const document = { ...base, selected, region: null }
    let promptOpen = false
    const actions = {
      editSelected() {
        promptOpen = true
      },
    }
    assert.equal(PromptCard(promptProps(document, { promptOpen })), null)
    const canvas = EditorCanvas({
      document,
      stage: stageLayout({ width: 1600, height: 1043 }),
      view: DEFAULT_VIEW,
      tool: 'cursor',
      actions,
    })
    const operations = find(canvas, (element) => element.props.onEdit === actions.editSelected)
    assert.ok(operations)
    operations.props.onEdit()
    assert.ok(PromptCard(promptProps(document, { promptOpen })))
    const editingCanvas = renderToStaticMarkup(
      createElement(EditorCanvas, {
        document,
        stage: stageLayout({ width: 1600, height: 1043 }),
        view: DEFAULT_VIEW,
        tool: 'cursor',
        actions,
        promptOpen,
      }),
    )
    assert.doesNotMatch(editingCanvas, /image-operations/)
    assert.deepEqual(document.selected, selected)
    const session = selectionGesture(document, DEFAULT_VIEW, 'cursor', {
      closePrompt() {
        promptOpen = false
      },
    })
    session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, selected[0]))
    assert.equal(PromptCard(promptProps(session.document(), { promptOpen })), null)
  }
})

test('Select drags select source and result photos without moving them at different zoom levels', () => {
  const document = {
    ...regionDocument(),
    imageFrame: { x: 100, y: 100, width: 100, height: 100 },
    results: [{ id: 'result', src: '/result.png', x: 300, y: 100, width: 100, height: 100 }],
  }
  for (const zoom of [0.5, 1, 2]) {
    for (const reverse of [false, true]) {
      const session = selectionGesture(document, { zoom, x: 30, y: -20 })
      const start = reverse ? [410, 210] : [90, 90]
      const end = reverse ? [90, 90] : [410, 210]
      session.gestures.pointerHandlers.onPointerDown(session.event(...start))
      session.gestures.pointerHandlers.onPointerMove(session.event(...end))
      session.gestures.pointerHandlers.onPointerUp()
      assert.deepEqual(session.document().selected, [document.imageId, 'result'])
      assert.deepEqual(session.document().imageFrame, document.imageFrame)
      assert.deepEqual(session.document().results, document.results)
      const html = renderToStaticMarkup(
        createElement(EditorCanvas, {
          document: session.document(),
          stage: stageLayout({ width: 1600, height: 1043 }),
          view: DEFAULT_VIEW,
          tool: 'cursor',
          actions: {},
        }),
      )
      assert.match(html, /image-operations/)
    }
  }
})

test('arrow drags move photos and selected groups with one undo entry at every zoom', () => {
  const base = outputDocument()
  for (const zoom of [0.5, 1, 2]) {
    for (const selected of [[base.imageId], ['result-0'], [base.imageId, 'result-0']]) {
      const document = { ...base, selected, region: null }
      const session = selectionGesture(document, { zoom, x: 30, y: -20 })
      session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, selected[0]))
      for (const x of [410, 420, 440]) {
        session.gestures.pointerHandlers.onPointerMove(session.event(x, 220))
      }
      assert.equal(session.commits.length, 0)
      session.gestures.pointerHandlers.onPointerUp()
      assert.equal(session.commits.length, 1)
      assert.deepEqual(session.commits[0], document)
      assert.deepEqual(session.document().selected, selected)
      assert.equal(
        session.document().imageFrame.x,
        document.imageFrame.x + (selected.includes(base.imageId) ? 40 : 0),
      )
      assert.equal(
        session.document().imageFrame.y,
        document.imageFrame.y + (selected.includes(base.imageId) ? 20 : 0),
      )
      for (const image of session.document().results) {
        const before = document.results.find((item) => item.id === image.id)
        assert.equal(image.x, before.x + (selected.includes(image.id) ? 40 : 0))
        assert.equal(image.y, before.y + (selected.includes(image.id) ? 20 : 0))
      }
    }
  }
})

test('cancelled photo drags restore all image positions and selection', () => {
  const document = outputDocument()
  const session = selectionGesture(document)
  session.gestures.pointerHandlers.onPointerDown(session.event(800, 600, 'result-2'))
  session.gestures.pointerHandlers.onPointerMove(session.event(850, 650))
  session.gestures.pointerHandlers.onPointerCancel()
  assert.deepEqual(session.document(), document)
  assert.equal(session.commits.length, 0)
})

test('corner handles resize whole photos and groups across zoom levels with one history entry', () => {
  for (const zoom of [0.25, 1, 3]) {
    for (const group of [false, true]) {
      const document = {
        ...regionDocument(),
        region: null,
        imageFrame: { x: 100, y: 100, width: 200, height: 100 },
        selected: group ? ['source-original', 'result'] : ['source-original'],
        results: [{ id: 'result', src: '/result.png', x: 400, y: 100, width: 100, height: 100 }],
      }
      const session = selectionGesture(document, { zoom, x: 30, y: -20 })
      const right = group ? 500 : 300
      const width = right - 100
      session.gestures.pointerHandlers.onPointerDown(
        session.event(right, 200, null, false, {
          corner: 'se',
          target: 'images',
        }),
      )
      session.gestures.pointerHandlers.onPointerMove(session.event(right + width / 4, 225))
      assert.equal(session.commits.length, 0)
      session.gestures.pointerHandlers.onPointerUp(session.event(right + width / 2, 250))
      const resized = session.document()
      assert.deepEqual(resized.imageFrame, { x: 100, y: 100, width: 300, height: 150 })
      assert.equal(resized.results[0].width, group ? 150 : 100)
      assert.equal(resized.results[0].x, group ? 550 : 400)
      assert.deepEqual(resized.selected, document.selected)
      assert.equal(session.commits.length, 1)
      assert.deepEqual(session.commits[0], document)
    }
  }
})

test('multiple selected photos each have an outline and share one set of group resize handles', () => {
  const base = outputDocument()
  for (const selected of [
    ['result-0', 'result-2'],
    [base.imageId, 'result-1', 'result-3'],
  ]) {
    const document = { ...base, selected, region: null }
    const canvas = EditorCanvas({
      document,
      stage: stageLayout({ width: 1600, height: 1043 }),
      view: DEFAULT_VIEW,
      tool: 'cursor',
      actions: {},
    })
    const outlines = Children.toArray(canvas.props.children).filter(
      (element) => element.props?.className === 'individual-image-selection',
    )
    assert.equal(outlines.length, selected.length)
    const world = find(canvas, (element) => element.props.className === 'canvas-world')
    assert.equal(
      find(world, (element) => element.props.className === 'individual-image-selection'),
      null,
    )
    const html = renderToStaticMarkup(canvas)
    assert.equal((html.match(/class="selection-handle /g) ?? []).length, 4)
    assert.equal((html.match(/data-resize-target="images"/g) ?? []).length, 4)
  }
})

test('rectangle interiors move the selected area and corners resize it without changing the photo', () => {
  const document = {
    ...regionDocument(),
    imageFrame: { x: 100, y: 100, width: 831.96, height: 600 },
    region: { x: 100, y: 100, width: 200, height: 150 },
  }
  for (const zoom of [0.25, 1, 3]) {
    for (const resize of [false, true]) {
      const session = selectionGesture(document, { zoom, x: 30, y: -20 }, 'rectangle')
      session.gestures.pointerHandlers.onPointerDown(
        session.event(
          400,
          350,
          null,
          false,
          resize ? { corner: 'se', target: 'region' } : { moveRegion: true },
        ),
      )
      session.gestures.pointerHandlers.onPointerMove(session.event(450, 380))
      session.gestures.pointerHandlers.onPointerUp()
      assert.deepEqual(
        session.document().region,
        resize
          ? { x: 100, y: 100, width: 250, height: 180 }
          : { x: 150, y: 130, width: 200, height: 150 },
      )
      assert.deepEqual(session.document().imageFrame, document.imageFrame)
      assert.equal(session.commits.length, 1)
    }
  }
})

test('cancelled transforms restore the original document and clicking a handle makes no undo entry', () => {
  for (const target of [
    { corner: 'se', target: 'images' },
    { corner: 'se', target: 'region' },
    { moveRegion: true },
  ]) {
    const document = {
      ...regionDocument(),
      region: target.target === 'images' ? null : { x: 100, y: 100, width: 200, height: 150 },
    }
    for (const cancel of [false, true]) {
      const session = selectionGesture(document, DEFAULT_VIEW, 'rectangle')
      const event = session.event(500, 300, null, false, target)
      session.gestures.pointerHandlers.onPointerDown(event)
      if (cancel) {
        session.gestures.pointerHandlers.onPointerMove(session.event(550, 350))
        session.gestures.pointerHandlers.onPointerCancel()
      } else session.gestures.pointerHandlers.onPointerUp(event)
      assert.deepEqual(session.document(), document)
      assert.equal(session.commits.length, 0)
    }
  }
})

test('only whole photos and rectangles expose resize handles; rectangle interiors are draggable', () => {
  for (const [tool, region, expected] of [
    ['cursor', null, 'images'],
    ['rectangle', { x: 10, y: 10, width: 100, height: 100 }, 'region'],
    ['lasso', { x: 10, y: 10, width: 100, height: 100 }, null],
  ]) {
    const html = renderToStaticMarkup(
      createElement(EditorCanvas, {
        document: { ...regionDocument(), region },
        stage: stageLayout({ width: 1600, height: 1043 }),
        view: DEFAULT_VIEW,
        tool,
        actions: {},
      }),
    )
    if (expected)
      assert.equal(
        (html.match(new RegExp(`data-resize-target="${expected}"`, 'g')) ?? []).length,
        4,
      )
    else assert.doesNotMatch(html, /data-resize-target/)
    assert.equal(html.includes('data-region-move="true"'), expected === 'region')
  }
})

test('freehand lasso traces generated photos without moving the images', () => {
  const document = outputDocument()
  const image = document.results[0]
  const session = selectionGesture(document, { zoom: 2, x: 30, y: -20 }, 'lasso')
  session.gestures.pointerHandlers.onPointerDown(
    session.event(image.x + 10, image.y + 10, image.id),
  )
  session.gestures.pointerHandlers.onPointerMove(session.event(image.x + 100, image.y + 10))
  session.gestures.pointerHandlers.onPointerMove(session.event(image.x + 50, image.y + 100))
  session.gestures.pointerHandlers.onPointerUp()
  const current = session.document()
  assert.equal(current.imageId, image.id)
  assert.equal(current.image, image.src)
  assert.equal(current.imageFrame.x, image.x)
  assert.equal(current.imageFrame.y, image.y)
  assert.equal(
    current.region.outline.height / current.region.outline.width,
    image.height / image.width,
  )
  assert.match(current.region.outline.path, /Z$/)
  assert.equal(session.commits.length, 1)
  const oldSource = current.results.find((item) => item.id === document.imageId)
  assert.equal(oldSource.x, document.imageFrame.x)
  assert.equal(oldSource.y, document.imageFrame.y)
})

test('a small pointer movement still counts as a photo click; Shift-click toggles selection', () => {
  const document = outputDocument()
  const session = selectionGesture(document)
  session.gestures.pointerHandlers.onPointerDown(session.event(400, 200, document.imageId))
  session.gestures.pointerHandlers.onPointerMove(session.event(401, 201))
  session.gestures.pointerHandlers.onPointerUp()
  assert.deepEqual(session.document().selected, [document.imageId])
  const shift = selectionGesture(document)
  shift.gestures.pointerHandlers.onPointerDown(shift.event(800, 600, 'result-2', true))
  shift.gestures.pointerHandlers.onPointerUp()
  assert.deepEqual(shift.document().selected, ['result-3'])
})

test('photo and region outlines stay outside the zoomed canvas and track their image bounds', () => {
  const document = {
    ...regionDocument(),
    imageFrame: { x: 100, y: 200, width: 831.96, height: 833 },
    region: null,
  }
  const stage = stageLayout({ width: 1600, height: 1043 })
  for (const zoom of [0.25, 1, 3]) {
    for (const region of [null, { x: 10, y: 20, width: 80, height: 60 }]) {
      const canvas = EditorCanvas({
        document: { ...document, region },
        stage,
        view: { zoom, x: 30, y: -40 },
        actions: {},
        tool: 'cursor',
      })
      const world = find(canvas, (element) => element.props.className === 'canvas-world')
      const isOutline = (element) =>
        ['region-selection', 'result-selection'].includes(element.props.className)
      assert.equal(find(world, isOutline), null)
      const outline = find(canvas, isOutline)
      assert.deepEqual(
        outline.props.box,
        region
          ? { x: 30 + 110 * zoom, y: -40 + 220 * zoom, width: 80 * zoom, height: 60 * zoom }
          : { x: 30 + 100 * zoom, y: -40 + 200 * zoom, width: 831.96 * zoom, height: 833 * zoom },
      )
      const html = renderToStaticMarkup(outline)
      assert.equal((html.match(/class="selection-handle /g) ?? []).length, 4)
      assert.doesNotMatch(html, /scale\(/)
    }
  }
})

function find(element, predicate) {
  if (!isValidElement(element)) return null
  if (predicate(element)) return element
  for (const child of Children.toArray(element.props.children)) {
    const match = find(child, predicate)
    if (match) return match
  }
  return null
}

function promptProps(document, overrides = {}) {
  return {
    document,
    stage: stageLayout({ width: 1600, height: 1043 }),
    view: { ...DEFAULT_VIEW },
    inputRef: { current: null },
    busy: false,
    suggestionsOpen: false,
    actions: {},
    closeSuggestions() {},
    openReferencePicker() {},
    ...overrides,
  }
}

test('empty references render neither the heading nor the gray upload tile', () => {
  assert.equal(ReferenceImages({ images: [] }), null)
  const card = PromptCard(promptProps(regionDocument()))
  const html = renderToStaticMarkup(card)
  assert.doesNotMatch(html, /reference-heading|add-reference|reference-images/)
  assert.match(html, /Add reference image/)
  assert.doesNotMatch(card.props.className, /expanded/)
})

test('focusing and typing in an empty prompt cannot open a reference area or move the image', () => {
  const document = regionDocument()
  const frame = structuredClone(document.imageFrame)
  const props = promptProps(document, {
    actions: {
      setPrompt(value) {
        document.prompt = value
      },
    },
  })
  const before = PromptCard(props)
  const input = find(before, (element) => element.type === 'input')
  assert.equal(input.props.onFocus, undefined)
  input.props.onChange({ target: { value: 'change the boots' } })
  const after = PromptCard(props)
  assert.equal(document.prompt, 'change the boots')
  assert.deepEqual(document.references, [])
  assert.deepEqual(document.imageFrame, frame)
  assert.deepEqual(after.props.style, before.props.style)
  assert.doesNotMatch(renderToStaticMarkup(after), /reference-heading|add-reference/)
})

test('opening the attachment picker does not expand the card before a file is chosen', () => {
  let pickerOpened = false
  const props = promptProps(regionDocument(), {
    openReferencePicker() {
      pickerOpened = true
    },
  })
  const card = PromptCard(props)
  const button = find(card, (element) => element.props.label === 'Add reference image')
  button.props.onClick()
  assert.equal(pickerOpened, true)
  assert.deepEqual(props.document.references, [])
  assert.doesNotMatch(renderToStaticMarkup(PromptCard(props)), /reference-heading|add-reference/)
})

test('attaching a photo expands references and removing the last photo collapses them', () => {
  const document = regionDocument()
  const props = promptProps(document)
  document.references = ['/uploaded-photo.png']
  let card = PromptCard(props)
  assert.match(card.props.className, /expanded/)
  assert.match(renderToStaticMarkup(card), /reference-heading/)
  assert.match(renderToStaticMarkup(card), /uploaded-photo.png/)

  const references = ReferenceImages({
    images: document.references,
    onRemove(index) {
      document.references = document.references.filter((_, i) => i !== index)
    },
  })
  find(
    references,
    (element) => element.props['aria-label'] === 'Remove reference 1',
  ).props.onClick()
  card = PromptCard(props)
  assert.doesNotMatch(card.props.className, /expanded/)
  assert.doesNotMatch(renderToStaticMarkup(card), /reference-heading|add-reference|uploaded-photo/)
})

test('each reference photo exposes its own accessible weight slider and drag callbacks', () => {
  const changes = [], starts = [], ends = []
  const references = ReferenceImages({
    images: ['/a.png', '/b.png'], weights: [20, 80],
    onWeightChange: (index, weight) => changes.push([index, weight]),
    onWeightStart: (index) => starts.push(index),
    onWeightEnd: () => ends.push('end'),
  })
  const first = find(references, (element) => element.props['aria-label'] === 'Reference 1 weight')
  const second = find(references, (element) => element.props['aria-label'] === 'Reference 2 weight')
  assert.equal(first.props.value, 20)
  assert.equal(second.props.value, 80)
  assert.equal(second.props['aria-valuetext'], '80% influence')
  second.props.onPointerDown({ pointerId: 1, currentTarget: { setPointerCapture() {} } })
  second.props.onChange({ target: { value: '65' } })
  second.props.onPointerUp()
  assert.deepEqual(starts, [1])
  assert.deepEqual(changes, [[1, 65]])
  assert.deepEqual(ends, ['end'])
})
