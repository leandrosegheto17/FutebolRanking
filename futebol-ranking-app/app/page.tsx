'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Atleta } from '@/types'
import { presencasPorMes } from '@/actions/rodadas'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const hoje = new Date()

type MesData = { datas: string[]; porAtleta: Record<string, Record<string, number>> }

function medalha(pos: number) {
  if (pos === 1) return '🥇'
  if (pos === 2) return '🥈'
  if (pos === 3) return '🥉'
  return String(pos)
}

function fmtData(d: string) {
  const [, m, dia] = d.split('-')
  return `${dia}/${m}`
}

function CelulaRodada({ pontos }: { pontos: number | undefined }) {
  if (pontos === undefined) return <span className="text-white/20 text-xs">—</span>
  if (pontos === 0) return <span className="text-xs text-gray-500">❌</span>
  if (pontos === 2) return <span className="text-xs text-yellow-400">🟨</span>
  return <span className="text-xs text-green-400">✅</span>
}

function TabelaRanking({ titulo, icone, atletas, loading, tipo, mesData }: {
  titulo: string
  icone: string
  atletas: Atleta[]
  loading: boolean
  tipo: 'Linha' | 'Goleiro'
  mesData: MesData
}) {
  const { datas, porAtleta } = mesData

  return (
    <div className="bg-card-bg rounded-2xl overflow-hidden border border-white/7 shadow-xl">
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-verde-campo to-verde-medio border-b-2 border-dourado">
        <span className="text-xl">{icone}</span>
        <h2 className="text-dourado font-bold uppercase tracking-wide text-sm">{titulo}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/4">
              <th className="text-left px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">#</th>
              <th className="text-left px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">Atleta</th>
              {datas.map(d => (
                <th key={d} className="text-center px-3 py-2 text-verde-claro text-xs uppercase tracking-wider whitespace-nowrap">
                  {fmtData(d)}
                </th>
              ))}
              <th className="text-right px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3 + datas.length} className="text-center py-8 text-verde-claro text-sm">
                  <span className="inline-block animate-bounce text-2xl">⚽</span>
                </td>
              </tr>
            ) : atletas.length === 0 ? (
              <tr>
                <td colSpan={3 + datas.length} className="text-center py-8 text-verde-claro text-sm">
                  Nenhum atleta cadastrado.
                </td>
              </tr>
            ) : (
              atletas.map((a, i) => {
                const chave = `${tipo}-${a.id}`
                return (
                  <tr key={a.id} className={`border-b border-white/5 hover:bg-dourado/6 transition-colors ${i < 3 ? 'bg-dourado/4' : ''}`}>
                    <td className="px-4 py-3 text-center w-10 text-lg font-bold">{medalha(i + 1)}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{a.nome}</td>
                    {datas.map(d => (
                      <td key={d} className="px-3 py-3 text-center">
                        <CelulaRodada pontos={porAtleta[chave]?.[d]} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <span className="bg-verde-campo text-dourado text-sm font-bold px-3 py-0.5 rounded-full border border-dourado/30">
                        {a.pontuacao_atual}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [jogadores, setJogadores] = useState<Atleta[]>([])
  const [loading, setLoading]   = useState(true)
  const [erro, setErro]         = useState<string | null>(null)
  const [mesSel, setMesSel]     = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 })
  const [mesData, setMesData]   = useState<MesData>({ datas: [], porAtleta: {} })

  async function carregarRanking() {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch('/api/ranking', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.errors?.jogadores) setErro(`Supabase: ${json.errors.jogadores}`)
      setJogadores(json.jogadores ?? [])
    } catch (e) {
      setErro(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregarRanking() }, [])

  useEffect(() => {
    presencasPorMes(mesSel.ano, mesSel.mes).then(({ data }) => {
      setMesData(data ?? { datas: [], porAtleta: {} })
    })
  }, [mesSel])

  function mesAnterior() {
    setMesSel(m => m.mes === 1 ? { ano: m.ano - 1, mes: 12 } : { ...m, mes: m.mes - 1 })
  }
  function mesPosterior() {
    setMesSel(m => m.mes === 12 ? { ano: m.ano + 1, mes: 1 } : { ...m, mes: m.mes + 1 })
  }

  const isMesAtual = mesSel.ano === hoje.getFullYear() && mesSel.mes === hoje.getMonth() + 1
  const totalRodadas = mesData.datas.length

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

      <div className="flex items-center justify-center gap-3 mb-4">
        <button onClick={mesAnterior}
          className="text-verde-claro hover:text-dourado transition-colors text-lg cursor-pointer bg-transparent border-0 px-2 py-1">
          ◀
        </button>
        <div className="text-center min-w-[160px]">
          <span className="text-dourado font-bold text-sm uppercase tracking-wide">
            {MESES[mesSel.mes - 1]} {mesSel.ano}
          </span>
          <span className="block text-verde-claro text-xs mt-0.5">
            {totalRodadas > 0 ? `${totalRodadas} rodada${totalRodadas > 1 ? 's' : ''}` : 'sem rodadas'}
          </span>
        </div>
        <button onClick={mesPosterior} disabled={isMesAtual}
          className="text-verde-claro hover:text-dourado transition-colors text-lg cursor-pointer bg-transparent border-0 px-2 py-1 disabled:opacity-20 disabled:cursor-not-allowed">
          ▶
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <TabelaRanking titulo="Jogadores de Linha" icone="👟" atletas={jogadores}
          loading={loading} tipo="Linha" mesData={mesData} />
      </div>

      <div className="text-center mt-6">
        <button onClick={carregarRanking}
          className="border border-dourado text-dourado bg-transparent hover:bg-dourado hover:text-verde-escuro font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer text-sm">
          ↺ Atualizar ranking
        </button>
      </div>
    </div>
  )
}
