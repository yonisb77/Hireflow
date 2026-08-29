import { useRef, useState } from 'react'

export type ToastAction = { label: string; onClick: () => void }
export type Toast = { id: number; message: string; type: 'success' | 'error'; action?: ToastAction }

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  const showToast = (message: string, type: 'success' | 'error' = 'success', action?: ToastAction, durationMs = 3000) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, message, type, action }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), durationMs)
  }

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return { toasts, showToast, dismissToast }
}
