import { outputDocument, promptingDocument } from './fixtures/documents.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { initialDocument, deleteSelection, appendResults } from '../src/editor/model/document.js'
import { createHistory, historyReducer } from '../src/editor/model/history.js'
import { moveResults } from '../src/editor/model/geometry.js'

const apply = (state, type, values = {}) => historyReducer(state, { type, ...values })

test('deleting selected results can be undone and redone without losing image positions', () => {
  const original = outputDocument()
  const deleted = apply(createHistory(original), 'update', { patch: deleteSelection })
  assert.deepEqual(
    deleted.present.results.map((result) => result.id),
    ['result-0', 'result-1'],
  )
  assert.equal(original.results.length, 4)

  const undone = apply(deleted, 'undo')
  assert.deepEqual(undone.present, original)
  assert.deepEqual(apply(undone, 'redo').present, deleted.present)
})

test('many pointer moves create a single undo entry when the drag finishes', () => {
  const original = outputDocument()
  let state = createHistory(original)
  for (let x = 1; x <= 40; x++) {
    state = apply(state, 'preview', {
      patch: { results: moveResults(original.results, original.selected, { x, y: 20 }) },
    })
  }
  assert.equal(state.past.length, 0)
  assert.equal(state.present.results[2].x, original.results[2].x + 40)
  assert.equal(state.present.results[0].x, original.results[0].x)

  state = apply(state, 'commit', { before: original })
  assert.equal(state.past.length, 1)
  const undone = apply(state, 'undo')
  assert.deepEqual(undone.present, original)
  assert.deepEqual(apply(undone, 'redo').present, state.present)
})

test('cancelling a gesture restores the document and preserves redo', () => {
  let state = createHistory(initialDocument())
  state = apply(state, 'update', { patch: { prompt: 'new edit' } })
  state = apply(state, 'undo')
  const before = state.present
  state = apply(state, 'preview', { patch: { region: { x: 0, y: 0, width: 2, height: 2 } } })
  state = apply(state, 'preview', { patch: before })
  assert.deepEqual(state.present, before)
  assert.equal(state.past.length, 0)
  assert.equal(apply(state, 'redo').present.prompt, 'new edit')
})

test('editing after undo starts a new branch and clears redo', () => {
  let state = createHistory(initialDocument())
  state = apply(state, 'update', { patch: { prompt: 'first edit' } })
  state = apply(state, 'undo')
  state = apply(state, 'update', { patch: { prompt: 'different edit' } })
  assert.equal(state.future.length, 0)
  assert.equal(apply(state, 'redo'), state)
  assert.equal(apply(state, 'undo').present.prompt, '')
})

test('generated results can be undone without losing the prompt or source image', () => {
  const before = promptingDocument()
  const patch = appendResults(before, [{ src: '/preview.png' }], 'batch')
  const state = apply(createHistory(before), 'update', { patch })
  assert.deepEqual(apply(state, 'undo').present, before)
})

test('history is bounded and a no-op does not create an undo entry', () => {
  let state = createHistory(initialDocument())
  assert.equal(apply(state, 'update', { patch: () => null }), state)
  for (let i = 0; i < 100; i++) state = apply(state, 'update', { patch: { prompt: String(i) } })
  assert.equal(state.past.length, 60)
  assert.equal(state.past[0].prompt, '39')
})
