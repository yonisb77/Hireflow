// Fetmarkerar den del av texten som matchade sökningen.
export default function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-slate-900 rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
