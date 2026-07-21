'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Atleta } from '@/types'

type PresencaInfo = { presente: boolean; pontos_ganhos: number }
type MapaPresencas = Record<string, PresencaInfo>

function medalha(pos: number) {
  if (pos === 1) return '🥇'
  if (pos === 2) return '🥈'
  if (pos === 3) return '🥉'
  return String(pos)
}

function StatusRodada({ info }: { info: PresencaInfo | undefined }) {
  if (!info) return <span className="text-white/20 text-xs">—</span>
  if (!info.presente)
    return <span className="text-xs text-gray-500 font-semibold">❌</span>
  if (info.pontos_ganhos === 2)
    return <span className="text-xs text-yellow-400 font-semibold">🟨 2</span>
  return <span className="text-xs text-green-400 font-semibold">✅ 3</span>
}

function formatarData(data: string) {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

function TabelaRanking({ titulo, icone, atletas, loading, tipo, presencas, ultimaRodada }: {
  titulo: string
  icone: string
  atletas: Atleta[]
  loading: boolean
  tipo: 'Linha' | 'Goleiro'
  presencas: MapaPresencas
  ultimaRodada: string | null
}) {
  return (
    <div className="bg-card-bg rounded-2xl overflow-hidden border border-white/7 shadow-xl">
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-verde-campo to-verde-medio border-b-2 border-dourado">
        <span className="text-xl">{icone}</span>
        <h2 className="text-dourado font-bold uppercase tracking-wide text-sm">{titulo}</h2>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-white/4">
            <th className="text-left px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">#</th>
            <th className="text-left px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">Atleta</th>
            <th className="text-center px-2 py-2 text-verde-claro text-xs uppercase tracking-wider whitespace-nowrap">
              {ultimaRodada ? formatarData(ultimaRodada) : 'Última'}
            </th>
            <th className="text-right px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="text-center py-8 text-verde-claro text-sm">
                <span className="inline-block animate-bounce text-2xl">⚽</span>
              </td>
            </tr>
          ) : atletas.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-8 text-verde-claro text-sm">
                Nenhum atleta cadastrado.
              </td>
            </tr>
          ) : (
            atletas.map((a, i) => (
              <tr key={a.id} className={`border-b border-white/5 hover:bg-dourado/6 transition-colors ${i < 3 ? 'bg-dourado/4' : ''}`}>
                <td className="px-4 py-3 text-center w-10 text-lg font-bold">{medalha(i + 1)}</td>
                <td className="px-4 py-3 font-medium">{a.nome}</td>
                <td className="px-2 py-3 text-center">
                  <StatusRodada info={presencas[`${tipo}-${a.id}`]} />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="bg-verde-campo text-dourado text-sm font-bold px-3 py-0.5 rounded-full border border-dourado/30">
                    {a.pontuacao_atual}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function Dashboard() {
  const [jogadores, setJogadores] = useState<Atleta[]>([])
  const [goleiros, setGoleiros]   = useState<Atleta[]>([])
  const [presencas, setPresencas] = useState<MapaPresencas>({})
  const [ultimaRodada, setUltimaRodada] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [erro, setErro]           = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch('/api/ranking', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.errors?.jogadores || json.errors?.goleiros)
        setErro(`Supabase: ${json.errors.jogadores ?? json.errors.goleiros}`)
      setJogadores(json.jogadores ?? [])
      setGoleiros(json.goleiros ?? [])
      setPresencas(json.presencasUltima ?? {})
      setUltimaRodada(json.ultimaRodada ?? null)
    } catch (e) {
      setErro(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
      <div className="text-center mb-8 bg-gradient-to-br from-verde-campo to-verde-escuro rounded-2xl p-6 sm:p-10 border border-dourado/30 shadow-xl">
        <Image src="/Logo.jpg" alt="Turma do Rola" width={80} height={80}
          className="rounded-full border-4 border-dourado shadow-lg mx-auto mb-4 object-cover" />
        <h1 className="text-2xl sm:text-4xl font-bold text-dourado mb-1 drop-shadow">
          Turma do Rola - Comary
        </h1>
        <p className="text-muted text-sm sm:text-base opacity-85">
          Classificação atualizada · Temporada 2025/26
        </p>
      </div>

      {erro && (
        <div className="mb-4 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm font-mono break-all">
          ❌ {erro}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        <TabelaRanking titulo="Jogadores de Linha" icone="👟" atletas={jogadores}
          loading={loading} tipo="Linha" presencas={presencas} ultimaRodada={ultimaRodada} />
      </div>

      <div className="text-center mt-6">
        <button onClick={carregar}
          className="border border-dourado text-dourado bg-transparent hover:bg-dourado hover:text-verde-escuro font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer text-sm">
          ↺ Atualizar ranking
        </button>
      </div>
    </div>
  )
}
