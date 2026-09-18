import { X } from 'lucide-react'
import { OrderChat } from '@/components/OrderChat'

interface Props {
  orderId: string
  title: string
  subtitle?: string
  readOnly?: boolean
  onClose: () => void
}

export function ChatModal({ orderId, title, subtitle, readOnly, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-steel-900 sm:h-[70vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-steel-200 px-4 py-3 dark:border-steel-800">
          <div className="min-w-0">
            <p className="truncate font-semibold">{title}</p>
            {subtitle && <p className="truncate text-xs text-steel-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost !px-2" aria-label="Close chat">
            <X className="h-5 w-5" />
          </button>
        </div>
        <OrderChat orderId={orderId} readOnly={readOnly} className="min-h-0 flex-1" />
      </div>
    </div>
  )
}
