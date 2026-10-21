import React, { useEffect } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  ancho?: string
}

const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, footer, ancho = 'max-w-xl' }) => {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`flex max-h-[90vh] w-full ${ancho} flex-col rounded-xl bg-white shadow-xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          {title ? <h3 className="text-base font-semibold text-gray-900">{title}</h3> : <div />}
          <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Cerrar" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
