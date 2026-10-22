const HISTORY_LIMIT = 60

export function createHistory(document) {
  return { past: [], present: document, future: [] }
}

function record(state, before) {
  return {
    ...state,
    past: [...state.past, before].slice(-HISTORY_LIMIT),
    future: [],
  }
}

export function historyReducer(state, action) {
  switch (action.type) {
    case 'update':
    case 'preview': {
      const patch = typeof action.patch === 'function' ? action.patch(state.present) : action.patch
      if (!patch) return state
      const next = action.type === 'update' ? record(state, state.present) : state
      return { ...next, present: { ...state.present, ...patch } }
    }
    // Pointer moves preview many states but commit one undo entry when the drag ends.
    case 'commit':
      return record(state, action.before ?? state.present)
    case 'undo': {
      if (!state.past.length) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past.at(-1),
        future: [...state.future, state.present],
      }
    }
    case 'redo': {
      if (!state.future.length) return state
      return {
        past: [...state.past, state.present],
        present: state.future.at(-1),
        future: state.future.slice(0, -1),
      }
    }
    default:
      throw new Error(`Unknown history action: ${action.type}`)
  }
}
