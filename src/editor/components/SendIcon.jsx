export default function SendIcon({ active }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#2e3038' : '#c7c9d1'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2 11 13M22 2 15 22 11 13 2 9Z" />
    </svg>
  )
}
