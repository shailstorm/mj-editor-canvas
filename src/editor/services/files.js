const MAX_IMAGE_BYTES = 15 * 1024 * 1024

function readImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export async function readImageFiles(files) {
  const valid = files.filter(
    (file) => file.type.startsWith('image/') && file.size < MAX_IMAGE_BYTES,
  )
  const images = (await Promise.all(valid.map(readImage))).filter(Boolean)
  return { images, rejectedCount: files.length - images.length }
}

export function downloadImages(results) {
  results.forEach((result, index) => {
    const link = document.createElement('a')
    link.href = result.src
    link.download = `mj-edit-${index + 1}.png`
    link.click()
  })
}
