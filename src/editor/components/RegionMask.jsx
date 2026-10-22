import { boxStyle } from '../model/geometry.js'
import { canvasBox } from '../model/layout.js'

export default function RegionMask({ region, frame, stage, view, drawing = false }) {
  return (
    <svg
      className={`region-mask${drawing ? ' is-drawing' : ''}`}
      style={boxStyle(canvasBox(frame, stage, view))}
      viewBox={`0 0 ${region.outline.width} ${region.outline.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={region.outline.path} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
