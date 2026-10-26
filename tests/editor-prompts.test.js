import test from 'node:test'
import assert from 'node:assert/strict'
import { auraRange, changeAura, initialAura } from '../src/editor/model/prompts.js'

test('Aura only moves toward entered words and returns to neutral when those words are cleared', () => {
  const empty = initialAura()
  assert.deepEqual(auraRange(empty), { min: 50, max: 50, disabled: true })
  assert.equal(changeAura(empty, { balance: 100 }).balance, 50)
  const left = changeAura(empty, { left: 'dreamcore', balance: 10 })
  assert.equal(left.balance, 10)
  assert.deepEqual(auraRange(left), { min: 0, max: 50, disabled: false })
  const both = changeAura(left, { right: 'brutalist', balance: 80 })
  assert.equal(both.balance, 80)
  assert.equal(changeAura(both, { right: '' }).balance, 50)
  assert.equal(changeAura(left, { left: ' ' }).balance, 50)
  assert.equal(changeAura(both, { balance: Number.NaN }).balance, 80)
})
