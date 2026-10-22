export default function Dialog({ label, title, closeLabel, className, onClose, children }) {
  return (
    <div className="panel-scrim" onClick={onClose}>
      <section
        className={`${className} floating`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-heading">
          <h1>{title}</h1>
          <button type="button" aria-label={closeLabel} onClick={onClose}>
            <svg
              width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
