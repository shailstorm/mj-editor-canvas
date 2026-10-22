import test from 'node:test'
import assert from 'node:assert/strict'
import { lassoRegion } from '../src/editor/model/lasso.js'

const size = { width: 800, height: 600 }

test('freehand outlines preserve concave vertices and close only when completed', () => {
  const points = [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 40, y: 50 },
    { x: 10, y: 120 },
  ]
  const draft = lassoRegion(points, size)
  const selected = lassoRegion(points, size, true)
  assert.equal(draft.outline.path, 'M10 20L110 20L40 50L10 120')
  assert.equal(selected.outline.path, 'M10 20L110 20L40 50L10 120Z')
  assert.deepEqual(
    { x: selected.x, y: selected.y, width: selected.width, height: selected.height },
    {
      x: 10,
      y: 20,
      width: 100,
      height: 100,
    },
  )
  assert.equal(selected.outline.width, 800)
  assert.equal(selected.outline.height, 600)
})

test('clicks, lines, and tiny outlines do not create a selected region', () => {
  for (const points of [
    [],
    [{ x: 10, y: 10 }],
    [
      { x: 10, y: 10 },
      { x: 100, y: 100 },
    ],
    [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
    ],
    [
      { x: 10, y: 10 },
      { x: 12, y: 10 },
      { x: 11, y: 12 },
    ],
  ])
    assert.equal(lassoRegion(points, size, true), null)
})

test('drawing clockwise or counterclockwise selects the same outline bounds', () => {
  const points = [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 40, y: 120 },
  ]
  const clockwise = lassoRegion(points, size, true)
  const counterclockwise = lassoRegion([...points].reverse(), size, true)
  assert.deepEqual({ ...clockwise, outline: null }, { ...counterclockwise, outline: null })
})
