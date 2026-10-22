import { initialDocument } from '../../src/editor/model/document.js'
import { resultImages, SAMPLE_PROMPT, sampleReferences } from '../../src/editor/model/assets.js'

export function regionDocument() {
  const document = initialDocument()
  return {
    ...document,
    selected: [document.imageId],
    region: { x: 426, y: 688, width: 225, height: 134 },
  }
}

export function promptingDocument() {
  return {
    ...regionDocument(),
    imageFrame: { x: 52, y: -350, width: 1245, height: 1245 },
    prompt: SAMPLE_PROMPT,
    references: [...sampleReferences],
  }
}

export function outputDocument() {
  return {
    ...initialDocument(),
    imageFrame: { x: 317, y: -442, width: 883, height: 883 },
    results: resultImages.map((src, index) => ({
      id: `result-${index}`,
      src,
      x: 185 + index * 295,
      y: 543,
      width: 263,
      height: 264,
    })),
    selected: ['result-2', 'result-3'],
  }
}
