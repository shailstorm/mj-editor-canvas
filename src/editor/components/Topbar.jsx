import { Asset, IconButton } from './Icon.jsx'

const ZOOM_LEVELS = [50, 75, 100, 150, 200]

export default function Topbar({
  zoom,
  zoomMenuOpen,
  toggleProjects,
  toggleZoomMenu,
  onZoom,
  onResetView,
  onFitCanvas,
  openHelp,
}) {
  return (
    <header className="topbar">
      <button className="projects-button floating" onClick={toggleProjects}>
        <Asset name="LucideArrowLeft" />
        All Projects
      </button>
      <div className="topbar-controls">
        <IconButton
          label="Help and keyboard shortcuts"
          name="CircleQuestion"
          className="corner-help"
          onClick={openHelp}
        />
        <div className="zoom-container">
          <button
            className="zoom-button floating"
            aria-label="Canvas zoom"
            aria-expanded={zoomMenuOpen}
            onClick={toggleZoomMenu}
          >
            <Asset name="LucideSearch" />
            <span>{Math.round(zoom)}%</span>
            <Asset name="LucideChevronDown" />
          </button>
          {zoomMenuOpen && (
            <div className="zoom-menu floating">
              {ZOOM_LEVELS.map((level) => (
                <button key={level} onClick={() => onZoom(level)}>
                  {level}%
                </button>
              ))}
              <button onClick={onFitCanvas}>Fit canvas</button>
              <button onClick={onResetView}>Reset view</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
