import { cloneElement, useId } from 'react'

export const REFERENCE_TOOLTIP = 'Edit or combine images, or use the style or elements of an image. Slide the dial to adjust how much the image influences the result.'

export default function Tooltip({ text, children }) {
  const id = useId()
  return (
    <span className="tooltip-trigger">
      {cloneElement(children, {
        key: children.key ?? 'trigger',
        'aria-describedby': [children.props['aria-describedby'], id].filter(Boolean).join(' '),
      })}
      <span className="tooltip" id={id} role="tooltip">{text}</span>
    </span>
  )
}
