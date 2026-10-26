import { useLayoutEffect, useRef } from 'react'
import { PROMPT_REVEAL_DURATION, PROMPT_REVEAL_STAGGER } from '../model/prompts.js'

// The native input always holds the complete, editable value. This decorative
// layer reveals it without streaming partial prompts into document history.
export default function PromptCompletion({ value, completion, inputRef, onFinish, children }) {
  const active = Boolean(completion && completion.text === value)
  const textRef = useRef(null)

  useLayoutEffect(() => {
    const input = inputRef?.current
    const text = textRef.current
    if (!active || !input || !text) return
    // Narrow inputs scroll to the caret. Keep the reveal at the same offset so
    // handing back to native text doesn't jump horizontally when it finishes.
    const syncScroll = () => { text.style.transform = `translateX(${-input.scrollLeft}px)` }
    syncScroll()
    input.addEventListener('scroll', syncScroll)
    return () => input.removeEventListener('scroll', syncScroll)
  }, [active, completion, inputRef])

  return (
    <div
      className={`prompt-field${active ? ' is-completing' : ''}`}
      onKeyDownCapture={active ? onFinish : undefined}
      onPointerDownCapture={active ? onFinish : undefined}
      onBlurCapture={active ? onFinish : undefined}
    >
      {children}
      {active && (
        <span
          key={completion.id}
          className="prompt-completion"
          aria-hidden="true"
          style={{ '--reveal-duration': `${PROMPT_REVEAL_DURATION}ms` }}
        >
          <span ref={textRef} className="prompt-completion-text">
            {Array.from(value).map((letter, index) => (
              <span
                key={index}
                className="prompt-completion-letter"
                style={{ '--reveal-delay': `${index * PROMPT_REVEAL_STAGGER}ms` }}
              >
                {letter}
              </span>
            ))}
          </span>
        </span>
      )}
    </div>
  )
}
