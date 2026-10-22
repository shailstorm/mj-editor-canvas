import test from 'node:test'
import assert from 'node:assert/strict'
import { initialDocument } from '../src/editor/model/document.js'
import { appendReferences, changeReferenceWeight, referenceWeights, removeReference } from '../src/editor/model/references.js'
import { createHistory, historyReducer } from '../src/editor/model/history.js'

test('references have independent weights, including repeated copies of the same photo', () => {
  const original = { ...initialDocument(), references: ['/same.png', '/same.png'] }
  assert.deepEqual(referenceWeights(original), [50, 50])
  const updated = { ...original, ...changeReferenceWeight(original, 1, 83) }
  assert.deepEqual(updated.references, original.references)
  assert.deepEqual(referenceWeights(updated), [50, 83])
  assert.deepEqual(referenceWeights(original), [50, 50])
  assert.deepEqual(changeReferenceWeight(updated, 0, -20), { referenceWeights: [0, 83] })
  assert.deepEqual(changeReferenceWeight(updated, 0, 200), { referenceWeights: [100, 83] })
  assert.equal(changeReferenceWeight(updated, 1, 83), null)
  assert.equal(changeReferenceWeight(updated, 3, 10), null)
  assert.equal(changeReferenceWeight(updated, 0, NaN), null)
})

test('removing a photo keeps every remaining weight paired with its photo and new uploads start at 50%', () => {
  const document = {
    ...initialDocument(), references: ['/a.png', '/b.png', '/c.png'], referenceWeights: [10, 70, 90],
  }
  const removed = { ...document, ...removeReference(document, 0) }
  assert.deepEqual(removed.references, ['/b.png', '/c.png'])
  assert.deepEqual(removed.referenceWeights, [70, 90])
  const uploaded = appendReferences(removed, ['/d.png', '/e.png', '/f.png', '/g.png', '/h.png'])
  assert.deepEqual(uploaded.references, ['/b.png', '/c.png', '/d.png', '/e.png', '/f.png', '/g.png'])
  assert.deepEqual(uploaded.referenceWeights, [70, 90, 50, 50, 50, 50])
  const empty = removeReference({ ...initialDocument(), references: ['/only.png'], referenceWeights: [0] }, 0)
  assert.deepEqual(empty, { references: [], referenceWeights: [] })
})

test('a slider drag can preview many weights and undo as a single edit', () => {
  const before = { ...initialDocument(), references: ['/a.png', '/b.png'], referenceWeights: [25, 75] }
  let history = createHistory(before)
  for (const weight of [30, 40, 60, 85]) history = historyReducer(history, {
    type: 'preview', patch: (document) => changeReferenceWeight(document, 0, weight),
  })
  assert.equal(history.past.length, 0)
  history = historyReducer(history, { type: 'commit', before })
  assert.equal(history.past.length, 1)
  assert.deepEqual(history.present.referenceWeights, [85, 75])
  const undone = historyReducer(history, { type: 'undo' })
  assert.deepEqual(undone.present, before)
  assert.deepEqual(historyReducer(undone, { type: 'redo' }).present.referenceWeights, [85, 75])
})
