import { selectedImages, selectedRegion } from './selection.js'
import { clamp } from './geometry.js'

export const PROMPT_REVEAL_STAGGER = 18
export const PROMPT_REVEAL_DURATION = 360

export function initialAura() {
  return { left: '', right: '', balance: 50 }
}

// Whole-image selections and an unselected canvas use the same prompt variant.
// The draft stays shared so changing the target never discards an edit.
export function promptType(document) {
  return selectedRegion(document) ? 'region' : 'image'
}

export function auraRange({ left, right }) {
  const min = left.trim() ? 0 : 50
  const max = right.trim() ? 100 : 50
  return { min, max, disabled: min === max }
}

export function changeAura(aura, patch = {}) {
  const next = { ...aura, ...patch }
  const balance = Number(next.balance)
  const { min, max } = auraRange(next)
  return { ...next, balance: clamp(Number.isFinite(balance) ? balance : aura.balance, min, max) }
}

export function canGeneratePrompt(document, { busy = false, selecting = false } = {}) {
  const prompt = document.prompt.trim()
  return Boolean(selectedImages(document).length && prompt && prompt !== '/' && !busy && !selecting)
}
