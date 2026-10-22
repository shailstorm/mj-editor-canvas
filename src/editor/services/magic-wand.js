import { IMAGE_SIZE } from '../model/layout.js'
import { regionFromPixels } from '../model/magic-wand.js'

const MAX_SIDE = 640

export function selectPhotoRegion(element, point, frame, tolerance) {
  const image = element.tagName === 'IMG' ? element : element.querySelector('img')
  if (!image?.complete || !image.naturalWidth)
    throw new Error('Wait for the photo to finish loading.')
  const scale = Math.min(1, MAX_SIDE / Math.max(frame.width, frame.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(frame.width * scale))
  canvas.height = Math.max(1, Math.round(frame.height * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  // Match the centered object-fit: cover crop used by the canvas photos.
  const cover = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
  const width = image.naturalWidth * cover
  const height = image.naturalHeight * cover
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const imageSize = {
    width: IMAGE_SIZE.width,
    height: (IMAGE_SIZE.width * frame.height) / frame.width,
  }
  return regionFromPixels(pixels, point, imageSize, tolerance)
}
