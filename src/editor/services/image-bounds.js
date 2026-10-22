import { imageBoundsPlan } from '../model/image-bounds.js'

export async function renderImageBounds(photo, box) {
  const image = new Image()
  image.src = photo.src
  await image.decode()
  const plan = imageBoundsPlan(photo, box, { width: image.naturalWidth, height: image.naturalHeight })
  if (plan.width > 16384 || plan.height > 16384 || plan.width * plan.height > 64_000_000)
    throw new Error('This rectangle is too large. Choose a smaller area.')
  const canvas = document.createElement('canvas')
  canvas.width = plan.width
  canvas.height = plan.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not edit this photo. Please try again.')
  const { source: s, destination: d } = plan
  context.drawImage(image, s.x, s.y, s.width, s.height, d.x, d.y, d.width, d.height)
  return canvas.toDataURL('image/png')
}
