export default function ImageFileInput({ inputRef, multiple = false, onFiles }) {
  function change(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    onFiles(files)
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple={multiple}
      hidden
      onChange={change}
    />
  )
}
