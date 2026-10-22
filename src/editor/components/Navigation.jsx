import { Asset } from './Icon.jsx'
import assets from '../../asset-urls.js'

const ITEMS = [
  { icon: 'Compass', label: 'Explore' },
  { icon: 'Create', label: 'Create' },
  { icon: 'Edit', label: 'Editor' },
  { icon: 'Grid', label: 'Organize' },
  { icon: 'ColorSwatchIcon', label: 'Personalize' },
  { icon: 'Moodboard', label: 'Moodboards' },
  { icon: 'Palette', label: 'Style creator' },
  { icon: 'ThumbsUp', label: 'Tasks' },
]

export default function Navigation() {
  return (
    <>
      <nav
        id="main-navigation"
        className="navigation"
        aria-label="Main navigation"
        aria-disabled="true"
      >
        <span className="brand" role="img" aria-label="Projects home">
          MJ
        </span>
        <div className="nav-items">
          {ITEMS.map((item) => (
            <span
              key={item.icon}
              role="img"
              aria-label={item.label}
              className={`nav-button ${item.icon === 'Edit' ? 'active' : ''}`}
            >
              <Asset name={item.icon} />
              <span className="nav-label">{item.label}</span>
            </span>
          ))}
        </div>
        <div className="nav-bottom">
          {[
            { icon: 'CircleQuestion', label: 'Help and keyboard shortcuts' },
            { icon: 'BellIcon', label: 'Notifications' },
            { icon: 'SunIcon', label: 'Appearance' },
            { icon: 'UserCircleIcon', label: 'Account' },
          ].map(({ icon, label }) => (
            <span
              key={icon}
              role="img"
              aria-label={label}
              className={`nav-static-icon ${icon === 'UserCircleIcon' ? 'account' : ''}`}
            >
              <Asset name={icon} />
            </span>
          ))}
        </div>
      </nav>
      <nav className="mobile-navigation" aria-label="Mobile navigation" aria-disabled="true">
        <span role="img" className="mobile-nav-button" aria-label="Menu">
          <span className="mobile-nav-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 6H19M5 12H19M5 18H19"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Menu</span>
        </span>
        {ITEMS.filter((item) => ['Compass', 'Create', 'Grid'].includes(item.icon)).map((item) => (
          <span
            role="img"
            key={item.icon}
            className={`mobile-nav-button ${item.icon === 'Create' ? 'active' : ''}`}
            aria-label={item.label}
          >
            <span
              className="mobile-nav-icon mobile-nav-asset"
              aria-hidden="true"
              style={{ '--nav-icon': `url("${assets.selection['img' + item.icon]}")` }}
            />
            <span>{item.label}</span>
          </span>
        ))}
      </nav>
    </>
  )
}
