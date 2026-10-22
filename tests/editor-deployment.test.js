import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { assetUrls } from '../src/asset-urls.js'

test('all runtime image URLs respect the deployment path and keep root development working', () => {
  const root = assetUrls()
  const nested = assetUrls('/editor-canvas/')
  for (const [collection, assets] of Object.entries(root)) {
    for (const [name, path] of Object.entries(assets)) {
      assert.ok(existsSync(resolve('public', path.slice(1))))
      assert.equal(nested[collection][name], `/editor-canvas${path}`)
    }
  }
})

