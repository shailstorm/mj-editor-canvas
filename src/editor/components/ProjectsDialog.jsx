import Dialog from './Dialog.jsx'

export default function ProjectsDialog({ image, onClose, onUpload }) {
  return (
    <Dialog
      className="projects-panel"
      label="Projects"
      title="All Projects"
      closeLabel="Close projects"
      onClose={onClose}
    >
      {image && (
        <button className="project-card" onClick={onClose}>
          <img src={image} alt="Current canvas" />
          <span>
            Current canvas<small>Current session</small>
          </span>
        </button>
      )}
      <div className="project-actions">
        <button className="primary-button" onClick={onUpload}>
          Upload an image
        </button>
      </div>
    </Dialog>
  )
}
