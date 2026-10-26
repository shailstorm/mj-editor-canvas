import InfoTooltip from './InfoTooltip.jsx'

export default function PanelHeading({ children, info, infoIcon, action, id }) {
  return (
    <div className="prompt-panel-heading">
      <div className="prompt-panel-label">
        <h2 id={id}>{children}</h2>
        {info && (
          <InfoTooltip label={children} icon={infoIcon}>{info}</InfoTooltip>
        )}
      </div>
      {action}
    </div>
  )
}
