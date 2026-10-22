import exportedAssets from './figma-assets.json' with { type: 'json' }

export function assetUrls(base = '/') {
  return Object.fromEntries(Object.entries(exportedAssets).map(([collection, assets]) => [
    collection,
    Object.fromEntries(Object.entries(assets).map(([name, path]) => [
      name, `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`,
    ])),
  ]))
}

export default assetUrls(import.meta.env?.BASE_URL ?? '/')
