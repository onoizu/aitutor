/** Simple robot head — used for AI Tutor branding and chat avatar. */
export default function RobotTutorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="3" x2="12" y2="6" />
      <circle cx="12" cy="2" r="1.2" fill="currentColor" stroke="none" />
      <rect x="5" y="6" width="14" height="13" rx="3" />
      <circle cx="9.25" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="14.75" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <path d="M9 16.5h6" />
    </svg>
  );
}
