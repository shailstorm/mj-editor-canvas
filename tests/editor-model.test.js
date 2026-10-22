import { outputDocument } from './fixtures/documents.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { initialDocument } from '../src/editor/model/document.js'
import { bounds, intersects, rectangle } from '../src/editor/model/geometry.js'
import { resultImages } from '../src/editor/model/assets.js'
import assets from '../src/figma-assets.json' with { type: 'json' }

test('Figma output selection encloses precisely the two selected variations', () => {
  const doc = outputDocument()
  const selected = doc.results.filter((r) => doc.selected.includes(r.id))
  assert.deepEqual(bounds(selected), { x: 775, y: 543, width: 558, height: 264 })
  assert.equal(doc.results.length, 4)
  assert.deepEqual(
    doc.results.map((r) => r.src),
    resultImages,
  )
})

test('dragging a marquee in either direction selects the same results', () => {
  const doc = outputDocument(),
    start = { x: 1400, y: 830 },
    end = { x: 770, y: 530 }
  const box = rectangle(start, end)
  assert.deepEqual(box, rectangle(end, start))
  assert.deepEqual(
    doc.results.filter((r) => intersects(box, r)).map((r) => r.id),
    ['result-2', 'result-3'],
  )
  assert.equal(
    intersects({ x: 0, y: 0, width: 5, height: 5 }, { x: 5, y: 5, width: 10, height: 10 }),
    false,
  )
  assert.equal(bounds([]), null)
})

test('new project state is independent and starts without any selection or prepared edits', () => {
  const first = outputDocument()
  first.results[0].x = 9999
  first.selected.push('result-0')
  const fresh = outputDocument()
  assert.equal(fresh.results[0].x, 185)
  assert.deepEqual(fresh.selected, ['result-2', 'result-3'])
  const selection = initialDocument()
  assert.equal(selection.prompt, '')
  assert.deepEqual(selection.results, [])
  assert.equal(selection.region, null)
  assert.deepEqual(selection.selected, [])
  assert.deepEqual(selection.references, [])
})

test('all Figma assets exist locally, with valid image headers and SVG dimensions', () => {
  for (const screen of Object.values(assets)) {
    for (const path of Object.values(screen)) {
      assert.ok(path.startsWith('/figma/'))
      const file = new URL('../public' + path, import.meta.url)
      assert.ok(statSync(file).size > 0, path)
      if (path.endsWith('.png'))
        assert.equal(readFileSync(file).subarray(1, 4).toString(), 'PNG', path)
      if (path.endsWith('.svg')) {
        const root = readFileSync(file, 'utf8').match(/<svg[^>]*>/)?.[0]
        assert.ok(root, path)
        assert.match(root, /width="[\d.]+"/)
        assert.match(root, /height="[\d.]+"/)
      }
    }
  }
})

test('static toolbar and selection SVGs retain the Figma intrinsic geometry', () => {
  const cases = [
    ['selection-LucideHand.svg', 18, 18],
    ['selection-LucideSend.svg', 44, 24],
    ['selection-SelectedArea.svg', 232, 142],
    ['output-Rectangle1.svg', 558, 264],
  ]
  for (const [name, width, height] of cases) {
    const root = readFileSync(new URL('../public/figma/' + name, import.meta.url), 'utf8').match(
      /<svg[^>]*>/,
    )[0]
    assert.equal(Number(root.match(/width="([\d.]+)"/)[1]), width)
    assert.equal(Number(root.match(/height="([\d.]+)"/)[1]), height)
  }
})
