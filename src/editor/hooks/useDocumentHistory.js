import { useCallback, useReducer } from 'react'
import { createHistory, historyReducer } from '../model/history.js'

export function useDocumentHistory(initialize) {
  const [state, dispatch] = useReducer(historyReducer, initialize, (create) =>
    createHistory(create()),
  )
  const update = useCallback((patch) => dispatch({ type: 'update', patch }), [])
  const preview = useCallback((patch) => dispatch({ type: 'preview', patch }), [])
  const commit = useCallback((before) => dispatch({ type: 'commit', before }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])

  return {
    document: state.present,
    undoCount: state.past.length,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    update,
    preview,
    commit,
    undo,
    redo,
  }
}
