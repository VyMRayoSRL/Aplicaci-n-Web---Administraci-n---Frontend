import React from 'react'

type ModalProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, footer }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white w-[640px] rounded shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          {title ? <h3 className="font-semibold">{title}</h3> : <div />}
          <button className="text-gray-500 hover:text-gray-700" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>
        <div>
          {children}
        </div>
        <div className="flex justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  )
}

export default Modal


