// src/components/push/PushInstructionsModal.tsx

interface PushInstructionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PushInstructionsModal({ isOpen, onClose }: PushInstructionsModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Cómo activar las notificaciones
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Toca el ícono de candado o los tres puntos junto a la dirección del sitio, arriba del navegador.</li>
          <li>Busca la opción &quot;Permisos del sitio&quot; o &quot;Notificaciones&quot;.</li>
          <li>Cambia el permiso de notificaciones a &quot;Permitir&quot;.</li>
          <li>Cierra esta ventana y recarga la app para que el cambio quede activo.</li>
        </ol>

        <button
          onClick={onClose}
          className="w-full rounded-md bg-slate-600 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}