// Hireflow-märket: ett prickmönster där en kandidat är markerad i ett nätverk.
export default function HireflowMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="14" cy="34" r="2.5" opacity="0.4" />
      <circle cx="14" cy="24" r="2.5" opacity="0.4" />
      <circle cx="24" cy="34" r="2.5" opacity="0.4" />
      <circle cx="24" cy="24" r="3.1" opacity="0.72" />
      <circle cx="24" cy="14" r="2.5" opacity="0.4" />
      <circle cx="34" cy="24" r="2.5" opacity="0.4" />
      <circle cx="34" cy="14" r="3.6" />
    </svg>
  )
}
