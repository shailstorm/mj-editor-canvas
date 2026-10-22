import { clamp } from './geometry.js'

export const DEFAULT_REFERENCE_WEIGHT = 50

export function referenceWeights(document) {
  return document.references.map((_, index) => document.referenceWeights?.[index] ?? DEFAULT_REFERENCE_WEIGHT)
}

export function appendReferences(document, images) {
  return {
    references: [...document.references, ...images].slice(0, 6),
    referenceWeights: [...referenceWeights(document), ...images.map(() => DEFAULT_REFERENCE_WEIGHT)].slice(0, 6),
  }
}

export function changeReferenceWeight(document, index, value) {
  if (!Number.isInteger(index) || index < 0 || index >= document.references.length || !Number.isFinite(value)) return null
  const weights = referenceWeights(document)
  const weight = Math.round(clamp(value, 0, 100))
  if (weights[index] === weight) return null
  return { referenceWeights: weights.map((current, i) => i === index ? weight : current) }
}

export function removeReference(document, index) {
  if (!Number.isInteger(index) || index < 0 || index >= document.references.length) return null
  return {
    references: document.references.filter((_, i) => i !== index),
    referenceWeights: referenceWeights(document).filter((_, i) => i !== index),
  }
}
