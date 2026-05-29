'use client'

import { useState, useEffect, useTransition } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { listarRanking as listarJogadores } from '@/actions/jogadores'
import { listarRanking as listarGoleiros } from '@/actions/goleiros'
import { registrar } from '@/actions/rodadas'
import type { Atleta, PresencaInput } from '@/types'

type DadosAtleta = { presente: boolean; golsMarcados: number; cartaoAmarelo: number; cartaoVermelho: boolean }
type MapaDados = Record<string, DadosAtleta>

const dadosIniciais = (): DadosAtleta => ({ presente: true, golsMarcados: 0, cartaoAmarelo: 0, cartaoVermelho: false })

function calcPontos(d: DadosAtleta) {
  if (!d.presente) return 0
  return d.cartaoVermelho ? 2 : 3
}

function CardAtleta({ atleta, tipo, dados, onChange }: {
  atleta: Atleta
  tipo: 'Linha' | 'Goleiro'
  dados: DadosAtleta
  onChange: (id: number, tipo: string, campo: keyof DadosAtleta, valor: unknown) => void
}) {
  const pts = calcPontos(dados)
  const ptsClass = !dados.presente ? 'text-gray-500 bg-gray-500/10' : dados.cartaoVermelho ? 'text-yellow-400 bg-yellow-400/10' : 'text-green-400 bg-green-400/10'

  return (
    <div className={`grid gap-x-3 gap-y-2 p-3 rounded-xl border transition-opacity ${!dados.presente ? 'opacity-45 border-white/5 bg-black/10' : 'border-white/7 bg-card-bg'}`}
      style={{ gridTemplateColumns: '36px 1fr auto', gridTemplateRows: 'auto auto' }}>
      {/* Presença */}
      <div className="row-span-2 flex items-center justify-center">
        <input type="checkbox" checked={dados.presente}
          onChange={(e) => onChange(atleta.id, tipo, 'presente', e.target.checked)}
          className="w-5 h-5 cursor-pointer accent-verde-campo" />
      </div>
      {/* Nome + Pts */}
      <span className="font-semibold text-sm self-center">
        {tipo === 'Linha' ? '👟' : '🧤'} {atleta.nome}
      </span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full self-center justify-self-end ${ptsClass}`}>
        {pts} pts
      </span>
      {/* Gols + Cartões */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-verde-claro">⚽</span>
        <input type="number" min={0} value={dados.golsMarcados} disabled={!dados.presente}
          onChange={(e) => onChange(atleta.id, tipo, 'golsMarcados', Number(e.target.value))}
          className="w-12 bg-black/30 border border-white/10 rounded text-center text-sm py-1 text-texto outline-none disabled:opacity-30" />
      </div>
      <div className="flex items-center gap-1 justify-self-end">
        <button type="button" disabled={!dados.presente}
          onClick={() => onChange(atleta.id, tipo, 'cartaoAmarelo', dados.cartaoAmarelo > 0 ? 0 : 1)}
          className={`border rounded px-1.5 py-0.5 text-sm transition-colors cursor-pointer disabled:opacity-30
            ${dados.cartaoAmarelo > 0 ? 'bg-yellow-400/20 border-yellow-400' : 'bg-transparent border-white/10'}`}>
          🟨{dados.cartaoAmarelo > 0 ? ' 1' : ''}
        </button>
        <button type="button" disabled={!dados.presente}
          onClick={() => onChange(atleta.id, tipo, 'cartaoVermelho', !dados.cartaoVermelho)}
          className={`border rounded px-1.5 py-0.5 text-sm transition-colors cursor-pointer disabled:opacity-30
            ${dados.cartaoVermelho ? 'bg-red-500/20 border-red-500' : 'bg-transparent border-white/10'}`}>
          🟥
        </button>
      </div>
    </div>
  )
}

export default function RodadaPage() {
  const [dataRodada, setDataRodada] = useState(() => new Date().toISOString().split('T')[0])
  const [jogadores, setJogadores] = useState<Atleta[]>([])
  const [goleiros, setGoleiros] = useState<Atleta[]>([])
  const [dados, setDados] = useState<MapaDados>({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    Promise.all([listarJogadores(), listarGoleiros()]).then(([rj, rg]) => {
      const todos = [
        ...(rj.data ?? []).map(a => ({ ...a, tipoAtleta: 'Linha' as const })),
        ...(rg.data ?? []).map(a => ({ ...a, tipoAtleta: 'Goleiro' as const })),
      ]
      setJogadores(rj.data ?? [])
      setGoleiros(rg.data ?? [])
      const mapa: MapaDados = {}
      todos.forEach(a => { mapa[`${a.tipoAtleta}-${a.id}`] = dadosIniciais() })
      setDados(mapa)
      setLoading(false)
    })
  }, [])

  function handleChange(id: number, tipo: string, campo: keyof DadosAtleta, valor: unknown) {
    const chave = `${tipo}-${id}`
    setDados(prev => ({ ...prev, [chave]: { ...prev[chave], [campo]: valor } }))
  }

  function handleSubmit() {
    setStatus(null)
    const presencas: PresencaInput[] = [
      ...jogadores.map(a => ({ atletaId: a.id, tipoAtleta: 'Linha' as const, ...dados[`Linha-${a.id}`] })),
      ...goleiros.map(a => ({ atletaId: a.id, tipoAtleta: 'Goleiro' as const, ...dados[`Goleiro-${a.id}`] })),
    ]
    startTransition(async () => {
      const result = await registrar(dataRodada, presencas)
      if (result.error) {
        setStatus({ tipo: 'erro', msg: result.error })
      } else {
        setStatus({ tipo: 'sucesso', msg: 'Rodada gravada com sucesso! Pontuações atualizadas.' })
      }
    })
  }

  const totalPresentes = Object.values(dados).filter(d => d.presente).length
  const total = jogadores.length + goleiros.length

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-verde-claro">
      <span className="text-5xl animate-bounce">⚽</span>
      <p>Carregando atletas...</p>
    </div>
  )

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-dourado mb-1">📋 Painel da Rodada</h1>
            <p className="text-verde-claro text-sm">Registre presenças, gols e cartões do dia</p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold">Data da rodada</span>
            <input type="date" value={dataRodada} onChange={(e) => setDataRodada(e.target.value)}
              className="bg-black/25 border border-dourado/30 rounded-lg px-3 py-2 text-dourado outline-none" />
          </label>
        </div>

        <div className="flex gap-3 mb-5">
          {[
            { label: String(totalPresentes), sub: 'Presentes' },
            { label: String(total - totalPresentes), sub: 'Ausentes' },
            { label: String(total), sub: 'Total' },
          ].map(({ label, sub }) => (
            <div key={sub} className="flex-1 bg-card-bg border border-white/7 rounded-xl py-3 text-center">
              <span className="block text-2xl font-bold text-dourado">{label}</span>
              <span className="text-verde-claro text-xs uppercase tracking-wide">{sub}</span>
            </div>
          ))}
        </div>

        {status && (
          <div className={`rounded-lg px-4 py-3 mb-4 text-sm font-medium ${
            status.tipo === 'sucesso'
              ? 'bg-green-500/15 border border-green-500/30 text-green-400'
              : 'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}>
            {status.tipo === 'sucesso' ? '✅' : '❌'} {status.msg}
          </div>
        )}

        {[{ label: '👟 Jogadores de Linha', lista: jogadores, tipo: 'Linha' as const },
          { label: '🧤 Goleiros', lista: goleiros, tipo: 'Goleiro' as const }].map(({ label, lista, tipo }) => (
          <div key={tipo} className="mb-6">
            <h2 className="text-dourado text-xs uppercase tracking-wider font-bold mb-2 pb-1.5 border-b border-dourado/20">
              {label}
            </h2>
            <div className="flex flex-col gap-2">
              {lista.map(a => (
                <CardAtleta key={a.id} atleta={a} tipo={tipo}
                  dados={dados[`${tipo}-${a.id}`] ?? dadosIniciais()}
                  onChange={handleChange} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-center pt-2 pb-6">
          <button onClick={handleSubmit} disabled={isPending}
            className="w-full sm:w-auto bg-gradient-to-r from-verde-campo to-verde-medio border border-dourado text-dourado font-bold py-3 px-10 rounded-xl text-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 cursor-pointer">
            {isPending ? '⏳ Gravando...' : '💾 Gravar e Fechar Rodada'}
          </button>
        </div>
      </div>
    </ProtectedRoute>
  )
}
