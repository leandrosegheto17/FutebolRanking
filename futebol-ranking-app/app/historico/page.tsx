'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ModalConfirmar from '@/components/ModalConfirmar'
import { listarHistorico, detalharRodada, excluirRodada } from '@/actions/rodadas'
import type { RodadaResumo, PresencaRodada } from '@/types'

function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function DetalheRodada({ dataRodada }: { dataRodada: string }) {
  const [presencas, setPresencas] = useState<PresencaRodada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    detalharRodada(dataRodada).then(({ data }) => {
      setPresencas(data ?? [])
      setLoading(false)
    })
  }, [dataRodada])

  if (loading) return <p className="text-verde-claro text-sm text-center py-3">Carregando...</p>

  const linha   = presencas.filter(p => p.tipo_atleta === 'Linha')
  const goleiro = presencas.filter(p => p.tipo_atleta === 'Goleiro')

  return (
    <div className="mt-3 px-1">
      {[{ label: '👟 Jogadores', lista: linha }, { label: '🧤 Goleiros', lista: goleiro }]
        .filter(g => g.lista.length > 0)
        .map(({ label, lista }) => (
          <div key={label} className="mb-3">
            <p className="text-dourado text-xs font-bold uppercase tracking-wide mb-1.5">{label}</p>
            <div className="flex flex-col gap-1">
              {lista.map(p => (
                <div key={p.id} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg ${!p.presente ? 'opacity-40' : ''}`}>
                  <span className={`w-4 text-center ${p.presente ? 'text-green-400' : 'text-gray-500'}`}>
                    {p.presente ? '✓' : '✗'}
                  </span>
                  <span className="flex-1 font-medium">{p.nome}</span>
                  {p.presente && p.gols_marcados > 0 && (
                    <span className="text-xs text-verde-claro">⚽ {p.gols_marcados}</span>
                  )}
                  {p.cartao_amarelo > 0 && <span className="text-xs">🟨</span>}
                  {p.cartao_vermelho && <span className="text-xs">🟥</span>}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-auto
                    ${p.pontos_ganhos === 3 ? 'text-green-400 bg-green-400/10'
                      : p.pontos_ganhos === 2 ? 'text-yellow-400 bg-yellow-400/10'
                      : 'text-gray-500 bg-gray-500/10'}`}>
                    {p.pontos_ganhos} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

export default function HistoricoPage() {
  const router = useRouter()
  const [rodadas, setRodadas] = useState<RodadaResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function carregar() {
    setLoading(true)
    listarHistorico().then(({ data }) => {
      setRodadas(data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { carregar() }, [])

  function handleExcluir() {
    if (!excluindo) return
    startTransition(async () => {
      await excluirRodada(excluindo)
      setExcluindo(null)
      setExpandida(null)
      carregar()
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dourado mb-1">📅 Histórico de Rodadas</h1>
          <p className="text-verde-claro text-sm">Consulte e gerencie as rodadas registradas</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-verde-claro">
            <span className="text-4xl animate-bounce">⚽</span>
            <p className="text-sm">Carregando...</p>
          </div>
        ) : rodadas.length === 0 ? (
          <div className="text-center py-12 text-verde-claro">
            <p className="text-4xl mb-3">📭</p>
            <p>Nenhuma rodada registrada ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rodadas.map((r) => (
              <div key={r.data_rodada} className="bg-card-bg border border-white/7 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpandida(expandida === r.data_rodada ? null : r.data_rodada)}
                    className="flex-1 flex items-center gap-3 text-left cursor-pointer bg-transparent border-0 p-0"
                  >
                    <span className="text-dourado font-bold">{formatarData(r.data_rodada)}</span>
                    <span className="text-verde-claro text-xs">
                      {r.total_presentes} presentes · {r.total_gols} gols
                    </span>
                    <span className={`ml-auto text-verde-claro text-sm transition-transform ${expandida === r.data_rodada ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  <button
                    onClick={() => router.push(`/rodada?data=${r.data_rodada}`)}
                    className="text-sm bg-transparent border border-white/10 hover:border-dourado hover:bg-dourado/15 rounded px-2 py-1 transition-colors cursor-pointer flex-shrink-0"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setExcluindo(r.data_rodada)}
                    className="text-sm bg-transparent border border-white/10 hover:border-red-500 hover:bg-red-500/15 rounded px-2 py-1 transition-colors cursor-pointer flex-shrink-0"
                  >
                    🗑️
                  </button>
                </div>

                {expandida === r.data_rodada && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    <DetalheRodada dataRodada={r.data_rodada} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {excluindo && (
          <ModalConfirmar
            nome={`rodada de ${formatarData(excluindo)}`}
            onConfirmar={handleExcluir}
            onFechar={() => setExcluindo(null)}
          />
        )}
    </div>
  )
}
