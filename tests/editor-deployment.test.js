import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { assetUrls } from '../src/asset-urls.js'

test('all runtime image URLs respect the deployment path and keep root development working', () => {
  const root = assetUrls()
  const nested = assetUrls('/work/midjourney/editor-canvas/')
  for (const [collection, assets] of Object.entries(root)) {
    for (const [name, path] of Object.entries(assets)) {
      assert.ok(existsSync(resolve('public', path.slice(1))))
      assert.equal(nested[collection][name], `/work/midjourney/editor-canvas${path}`)
    }
  }
})

test('shaysite integration preserves existing build hooks, copies the editor source, and is repeatable', async () => {
  const site = mkdtempSync(join(tmpdir(), 'editor-deployment-test-'))
  try {
    writeFileSync(join(site, 'package.json'), JSON.stringify({
      dependencies: { next: '15.5.19' },
      scripts: { build: 'next build', prebuild: 'node existing-setup.js' },
    }))
    writeFileSync(join(site, 'next.config.ts'), `
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
}
export default withMDX(nextConfig)
`)
    writeFileSync(join(site, '.gitignore'), 'node_modules\n')
    const sync = () => execFileSync(process.execPath, ['scripts/sync-shaysite.mjs', site])
    sync()
    const first = Object.fromEntries(['package.json', 'next.config.ts', '.gitignore'].map((path) => [
      path, readFileSync(join(site, path), 'utf8'),
    ]))
    sync()
    for (const [path, contents] of Object.entries(first)) assert.equal(readFileSync(join(site, path), 'utf8'), contents)
    const pkg = JSON.parse(first['package.json'])
    assert.equal(pkg.scripts.build, 'next build')
    assert.equal(pkg.scripts.prebuild, 'node existing-setup.js && npm run build:editor-canvas')
    const config = first['next.config.ts'].replace('export default withMDX(nextConfig)', 'return nextConfig')
    const routes = await new Function(config)().rewrites()
    assert.deepEqual(routes, [{
      source: '/work/midjourney/editor-canvas',
      destination: '/work/midjourney/editor-canvas/index.html',
    }])
    const app = join(site, 'apps/midjourney-editor-canvas')
    assert.ok(existsSync(join(app, 'src/editor/Editor.jsx')))
    assert.ok(existsSync(join(app, 'public/figma/selection-CircleQuestion.svg')))
    assert.ok(!existsSync(join(app, '.env.local')))
    assert.ok(!existsSync(join(app, 'node_modules')))
  } finally {
    rmSync(site, { recursive: true, force: true })
  }
})
