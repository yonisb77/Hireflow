import { AlertCircle, CheckCircle2, Undo2 } from 'lucide-react'
import type { Toast } from '../hooks/useToasts'

export default function ToastStack({ toasts, dismissToast }: { toasts: Toast[]; dismissToast: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg shadow-lg text-xs font-semibold text-white animate-toast-in ${t.type === 'error' ? 'bg-red-600' : 'bg-gradient-to-r from-slate-800 to-slate-900'}`}
        >
          {t.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {t.message}
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); dismissToast(t.id) }}
              className="ml-1.5 inline-flex items-center gap-1 text-blue-300 hover:text-white font-bold underline underline-offset-2"
            >
              <Undo2 className="w-3 h-3" /> {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
