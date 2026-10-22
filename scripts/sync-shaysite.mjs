import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const editorRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const siteRoot = resolve(process.argv[2] ?? resolve(editorRoot, '../../shaysite'))
const appPath = 'apps/midjourney-editor-canvas'
const publicPath = '/work/midjourney/editor-canvas'
const sitePackagePath = resolve(siteRoot, 'package.json')
const siteConfigPath = resolve(siteRoot, 'next.config.ts')
const ignorePath = resolve(siteRoot, '.gitignore')
const marker = '// Midjourney editor canvas: standalone page, without the portfolio layout.'

// Validate the destination and configuration before changing any files.
if (siteRoot === editorRoot || !relative(editorRoot, siteRoot).startsWith('..')) {
  throw new Error('Choose the shaysite checkout, outside the editor source folder.')
}
const sitePackage = JSON.parse(await readFile(sitePackagePath, 'utf8'))
if (!sitePackage.dependencies?.next) throw new Error('The destination must be the Next.js shaysite project.')
const ignore = await readFile(ignorePath, 'utf8')
let siteConfig = await readFile(siteConfigPath, 'utf8')
if (!siteConfig.includes(marker)) {
  if (/\brewrites\s*[:(]/.test(siteConfig)) {
    throw new Error('next.config.ts already defines rewrites. Merge the editor route into them manually before syncing.')
  }
  const insertion = /^(\s*pageExtensions:\s*\[[^\n]+\],?\s*)$/m
  if (!insertion.test(siteConfig)) throw new Error('Could not locate pageExtensions in next.config.ts; no files were changed.')
  siteConfig = siteConfig.replace(insertion, `$1
  ${marker}
  async rewrites() {
    return [
      { source: '${publicPath}', destination: '${publicPath}/index.html' },
    ]
  },`)
}

const appRoot = resolve(siteRoot, appPath)
await mkdir(appRoot, { recursive: true })
for (const path of ['src', 'public', 'tests', 'scripts', 'index.html', 'vite.config.js', 'package.json', 'package-lock.json', '.gitignore', '.oxlintrc.json']) {
  await cp(resolve(editorRoot, path), resolve(appRoot, path), { recursive: true })
}
// The standalone development folder syncs into shaysite; the embedded copy does not sync itself.
const embeddedPackagePath = resolve(appRoot, 'package.json')
const embeddedPackage = JSON.parse(await readFile(embeddedPackagePath, 'utf8'))
delete embeddedPackage.scripts['sync:shaysite']
embeddedPackage.scripts['build:shaysite'] = `vite build --base=${publicPath}/ --outDir=../../public${publicPath} --emptyOutDir`
await writeFile(embeddedPackagePath, `${JSON.stringify(embeddedPackage, null, 2)}\n`)

sitePackage.scripts ??= {}
sitePackage.scripts['build:editor-canvas'] = `npm --prefix ${appPath} ci --include=dev && npm --prefix ${appPath} run build:shaysite`
if (!sitePackage.scripts.prebuild?.includes('npm run build:editor-canvas')) {
  sitePackage.scripts.prebuild = [sitePackage.scripts.prebuild, 'npm run build:editor-canvas'].filter(Boolean).join(' && ')
}
await writeFile(sitePackagePath, `${JSON.stringify(sitePackage, null, 2)}\n`)
await writeFile(siteConfigPath, siteConfig)
const generated = '/public/work/midjourney/editor-canvas/'
if (!ignore.split(/\r?\n/).includes(generated)) {
  await writeFile(ignorePath, `${ignore.trimEnd()}\n\n# Built from ${appPath} during deployment\n${generated}\n`)
}

console.log(`Synced the editor into ${appRoot}`)
console.log(`Next build will serve ${publicPath} as a standalone editor.`)
console.log('Review, commit, and push the shaysite changes to its Vercel production branch to publish.')
