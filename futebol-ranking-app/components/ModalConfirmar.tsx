'use client'

interface Props {
  nome: string
  onConfirmar: () => void
  onFechar: () => void
}

export default function ModalConfirmar({ nome, onConfirmar, onFechar }: Props) {
  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={onFechar}>
      <div className="bg-card-bg border border-dourado/25 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-4xl mb-2">⚠️</div>
        <h2 className="text-xl font-bold text-dourado mb-3">Confirmar exclusão</h2>
        <p className="text-muted text-sm leading-relaxed mb-6">
          <strong className="text-texto">{nome}</strong> será removido junto com todo o histórico de presenças. Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onFechar} className="flex-1 bg-transparent border border-white/12 text-verde-claro hover:bg-white/5 font-semibold py-2.5 rounded-lg transition-colors cursor-pointer">
            Cancelar
          </button>
          <button onClick={onConfirmar} className="flex-1 bg-red-500/15 border border-red-500 text-red-400 hover:bg-red-500/30 font-bold py-2.5 rounded-lg transition-colors cursor-pointer">
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
