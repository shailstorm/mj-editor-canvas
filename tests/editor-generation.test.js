import { outputDocument, promptingDocument } from './fixtures/documents.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { generateVariations } from '../src/editor/services/generation.js'
import { initialDocument } from '../src/editor/model/document.js'

test('preview generation returns independent result objects', async () => {
  const results = await generateVariations(promptingDocument(), {
    signal: new AbortController().signal,
  })
  assert.equal(results.length, 4)
  assert.ok(results.every((result) => result.src.startsWith('/figma/')))
  results[0].x = 9999
  assert.equal(outputDocument().results[0].x, 185)
})

test('cancelling a preview rejects it before stale results can replace a new scene', async () => {
  const controller = new AbortController()
  const pending = generateVariations(promptingDocument(), { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
})

test('generation rejects empty prompts and requests already cancelled', async () => {
  await assert.rejects(
    generateVariations(initialDocument(), { signal: new AbortController().signal }),
    /Enter a prompt/,
  )
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(generateVariations(promptingDocument(), { signal: controller.signal }), {
    name: 'AbortError',
  })
})
