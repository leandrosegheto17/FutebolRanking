'use client'

import { useState, useEffect, useTransition } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { listarRanking as listarJogadores } from '@/actions/jogadores'
import { registrar, excluirRodada, carregarRodadaParaEdicao } from '@/actions/rodadas'
import SimuladorCampo, {
  type SimulacaoResult, type SubPar, type Pos,
  build2ndHalfRows, Campo, COR,
} from '@/components/SimuladorCampo'
import type { Atleta, Formacao, StatusPresenca, Substituicao } from '@/types'

type TimeID = 'A' | 'B'

type DadosAtleta = {
  status: StatusPresenca
  golsMarcados: number
  cartaoAmarelo: number
  cartaoVermelho: boolean
}

type SubLocal = {
  id: string
  time: TimeID | ''
  saindoKey: string
  entrandoKey: string
}

// Informações fixas dos times
const NOME_TIME_A = 'Colete'
const NOME_TIME_B = 'Sem Colete'
const FORMACAO: Formacao = '4-3-3'

const dadosIniciais = (): DadosAtleta => ({
  status: 'ausente',
  golsMarcados: 0,
  cartaoAmarelo: 0,
  cartaoVermelho: false,
})

function calcPontos(d: DadosAtleta): number {
  if (d.status === 'ausente') return 0
  return d.cartaoVermelho ? 2 : 3
}

function BtnStatus({ label, active, cor, onClick }: {
  label: string; active: boolean; cor: string; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className={`text-[11px] px-2 py-1 rounded border cursor-pointer transition-colors font-medium
        ${active ? cor : 'bg-transparent border-white/10 text-texto/40 hover:border-white/25'}`}>
      {label}
    </button>
  )
}

function CardPresenca({ atleta, dados, onChange }: {
  atleta: Atleta
  dados: DadosAtleta
  onChange: (id: number, campo: keyof DadosAtleta, valor: unknown) => void
}) {
  const pts = calcPontos(dados)
  const ptsClass =
    dados.status === 'ausente' ? 'text-gray-500 bg-gray-500/10' :
    dados.cartaoVermelho ? 'text-yellow-400 bg-yellow-400/10' :
    dados.status === 'lesionado' ? 'text-amber-400 bg-amber-400/10' :
    'text-green-400 bg-green-400/10'

  return (
    <div className={`p-3 rounded-xl border transition-opacity
      ${dados.status === 'ausente' ? 'opacity-40 border-white/5 bg-black/10' : 'border-white/7 bg-card-bg'}`}>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 shrink-0">
          <BtnStatus label="Pres" active={dados.status === 'presente'} cor="bg-green-500/20 border-green-500 text-green-400"
            onClick={() => onChange(atleta.id, 'status', 'presente')} />
          <BtnStatus label="Aus" active={dados.status === 'ausente'} cor="bg-gray-500/20 border-gray-500 text-gray-400"
            onClick={() => onChange(atleta.id, 'status', 'ausente')} />
          <BtnStatus label="Les" active={dados.status === 'lesionado'} cor="bg-amber-500/20 border-amber-500 text-amber-400"
            onClick={() => onChange(atleta.id, 'status', 'lesionado')} />
        </div>
        <span className="font-semibold text-sm flex-1 min-w-0 truncate">👟 {atleta.nome}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${ptsClass}`}>{pts} pts</span>
      </div>
      {dados.status === 'presente' && (
        <div className="flex items-center gap-2 mt-2 pl-1">
          <span className="text-xs text-verde-claro">⚽</span>
          <input type="number" min={0} value={dados.golsMarcados}
            onChange={(e) => onChange(atleta.id, 'golsMarcados', Number(e.target.value))}
            className="w-12 bg-black/30 border border-white/10 rounded text-center text-sm py-1 text-texto outline-none" />
          <button type="button"
            onClick={() => onChange(atleta.id, 'cartaoAmarelo', dados.cartaoAmarelo > 0 ? 0 : 1)}
            className={`border rounded px-1.5 py-0.5 text-sm cursor-pointer transition-colors
              ${dados.cartaoAmarelo > 0 ? 'bg-yellow-400/20 border-yellow-400' : 'bg-transparent border-white/10'}`}>
            🟨{dados.cartaoAmarelo > 0 ? ' 1' : ''}
          </button>
          <button type="button"
            onClick={() => onChange(atleta.id, 'cartaoVermelho', !dados.cartaoVermelho)}
            className={`border rounded px-1.5 py-0.5 text-sm cursor-pointer transition-colors
              ${dados.cartaoVermelho ? 'bg-red-500/20 border-red-500' : 'bg-transparent border-white/10'}`}>
            🟥
          </button>
        </div>
      )}
    </div>
  )
}

function CampoVazio({ mensagem }: { mensagem: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-white/10 overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#1a5c0a 0%,#2d7a0e 47%,#2d7a0e 53%,#1a5c0a 100%)', minHeight: 180 }}
    >
      <div className="text-center opacity-25 pointer-events-none select-none">
        <div className="text-4xl mb-2">⚽</div>
        <div className="text-sm text-white font-semibold">{mensagem}</div>
      </div>
    </div>
  )
}

export default function RodadaPage() {
  const [editando, setEditando] = useState<string | null>(null)
  const [dataRodada, setDataRodada] = useState(() => new Date().toISOString().split('T')[0])
  const [jogadores, setJogadores] = useState<Atleta[]>([])
  const [dados, setDados] = useState<Record<string, DadosAtleta>>({})
  const [showSimulador, setShowSimulador] = useState(false)
  const [simResultado, setSimResultado] = useState<SimulacaoResult | null>(null)
  const [substituicoes, setSubstituicoes] = useState<SubLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [msgStatus, setMsgStatus] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dataParam = params.get('data')
    if (dataParam) setEditando(dataParam)

    const fetchAtletas = listarJogadores()
    const fetchEdicao = dataParam ? carregarRodadaParaEdicao(dataParam) : Promise.resolve(null)

    Promise.all([fetchAtletas, fetchEdicao]).then(([rj, edicao]) => {
      const j = rj.data ?? []
      setJogadores(j)

      const mapa: Record<string, DadosAtleta> = {}
      j.forEach(a => { mapa[`Linha-${a.id}`] = dadosIniciais() })

      if (dataParam && edicao?.data) {
        const ed = edicao.data
        setDataRodada(dataParam)
        for (const p of ed.presencas) {
          const key = `${p.tipo_atleta}-${p.atleta_id}`
          mapa[key] = {
            status: p.status,
            golsMarcados: p.gols_marcados,
            cartaoAmarelo: p.cartao_amarelo,
            cartaoVermelho: p.cartao_vermelho,
          }
        }
        setSubstituicoes(ed.substituicoes.map(s => ({
          id: crypto.randomUUID(),
          time: s.time,
          saindoKey: `${s.tipo_atleta_saindo}-${s.atleta_saindo_id}`,
          entrandoKey: `${s.tipo_atleta_entrando}-${s.atleta_entrando_id}`,
        })))
      }

      setDados(mapa)
      setLoading(false)
    })
  }, [])

  function handleChange(id: number, campo: keyof DadosAtleta, valor: unknown) {
    setDados(prev => ({ ...prev, [`Linha-${id}`]: { ...prev[`Linha-${id}`], [campo]: valor } }))
  }

  function addSubstituicao() {
    setSubstituicoes(prev => [...prev, { id: crypto.randomUUID(), time: '', saindoKey: '', entrandoKey: '' }])
  }

  function updateSub(id: string, campo: keyof SubLocal, valor: string) {
    setSubstituicoes(prev => prev.map(s => {
      if (s.id !== id) return s
      const novo = { ...s, [campo]: valor }
      if (campo === 'time') { novo.saindoKey = ''; novo.entrandoKey = '' }
      return novo
    }))
  }

  function removeSub(id: string) {
    setSubstituicoes(prev => prev.filter(s => s.id !== id))
  }

  function buildPayload() {
    const presencas = jogadores.map(a => {
      const d = dados[`Linha-${a.id}`] ?? dadosIniciais()
      const inA = simResultado?.tA.some(t => t.id === a.id)
      const inB = simResultado?.tB.some(t => t.id === a.id)
      return {
        atletaId: a.id, tipoAtleta: 'Linha' as const,
        status: d.status, golsMarcados: d.golsMarcados,
        cartaoAmarelo: d.cartaoAmarelo, cartaoVermelho: d.cartaoVermelho,
        posicao: undefined,
        time: inA ? 'A' as const : inB ? 'B' as const : undefined,
      }
    })
    const subs: Substituicao[] = substituicoes
      .filter(s => s.time && s.saindoKey && s.entrandoKey)
      .map(s => ({
        time: s.time as TimeID,
        atletaSaindoId: Number(s.saindoKey.split('-')[1]),
        tipoAtletaSaindo: s.saindoKey.split('-')[0] as 'Linha' | 'Goleiro',
        atletaEntrandoId: Number(s.entrandoKey.split('-')[1]),
        tipoAtletaEntrando: s.entrandoKey.split('-')[0] as 'Linha' | 'Goleiro',
      }))
    return { presencas, subs }
  }

  function handleSubmit() {
    setMsgStatus(null)
    const { presencas, subs } = buildPayload()
    if (editando) {
      startTransition(async () => {
        const del = await excluirRodada(dataRodada)
        if (del.error) { setMsgStatus({ tipo: 'erro', msg: `Erro ao salvar: ${del.error}` }); return }
        const result = await registrar(dataRodada, presencas, NOME_TIME_A, NOME_TIME_B, FORMACAO, subs)
        if (result.error) setMsgStatus({ tipo: 'erro', msg: result.error })
        else setMsgStatus({ tipo: 'sucesso', msg: 'Rodada editada com sucesso! Pontuações atualizadas.' })
      })
      return
    }
    startTransition(async () => {
      const result = await registrar(dataRodada, presencas, NOME_TIME_A, NOME_TIME_B, FORMACAO, subs)
      if (result.error === 'Já existe uma rodada registrada para esta data.') {
        setShowConfirm(true)
      } else if (result.error) {
        setMsgStatus({ tipo: 'erro', msg: result.error })
      } else {
        setMsgStatus({ tipo: 'sucesso', msg: 'Rodada gravada com sucesso! Pontuações atualizadas.' })
      }
    })
  }

  function handleConfirmarSobrescrita() {
    setShowConfirm(false)
    setMsgStatus(null)
    const { presencas, subs } = buildPayload()
    startTransition(async () => {
      const del = await excluirRodada(dataRodada)
      if (del.error) { setMsgStatus({ tipo: 'erro', msg: `Erro ao sobrescrever: ${del.error}` }); return }
      const result = await registrar(dataRodada, presencas, NOME_TIME_A, NOME_TIME_B, FORMACAO, subs)
      if (result.error) setMsgStatus({ tipo: 'erro', msg: result.error })
      else setMsgStatus({ tipo: 'sucesso', msg: 'Rodada sobrescrita com sucesso! Pontuações atualizadas.' })
    })
  }

  // ── Derivados ──────────────────────────────────────────────────────────────
  const totalPresentes  = Object.values(dados).filter(d => d.status === 'presente').length
  const totalLesionados = Object.values(dados).filter(d => d.status === 'lesionado').length
  const totalAusentes   = Object.values(dados).filter(d => d.status === 'ausente').length

  const jogadoresPresentes = jogadores.filter(a => dados[`Linha-${a.id}`]?.status === 'presente')

  // Dropdowns de substituições: usa times do simulador quando disponível
  const atletasEscalados = simResultado
    ? [
        ...simResultado.tA.map(a => ({ key: `Linha-${a.id}`, nome: `👟 ${a.nome}`, time: 'A' as TimeID })),
        ...simResultado.tB.map(a => ({ key: `Linha-${a.id}`, nome: `👟 ${a.nome}`, time: 'B' as TimeID })),
      ]
    : jogadoresPresentes.map(a => ({ key: `Linha-${a.id}`, nome: `👟 ${a.nome}`, time: '' as unknown as TimeID }))

  const atletasReservas = simResultado
    ? jogadoresPresentes
        .filter(a => !simResultado.tA.some(t => t.id === a.id) && !simResultado.tB.some(t => t.id === a.id))
        .map(a => ({ key: `Linha-${a.id}`, nome: `👟 ${a.nome}` }))
    : jogadoresPresentes.map(a => ({ key: `Linha-${a.id}`, nome: `👟 ${a.nome}` }))

  // 2° tempo: aplica as substituições registradas sobre o resultado do simulador
  function buildSubPar(s: SubLocal): SubPar | null {
    if (!simResultado || !s.saindoKey || !s.entrandoKey) return null
    const saindoId   = Number(s.saindoKey.split('-')[1])
    const entrandoId = Number(s.entrandoKey.split('-')[1])
    const saindo   = jogadores.find(j => j.id === saindoId)
    const entrando = jogadores.find(j => j.id === entrandoId)
    if (!saindo || !entrando) return null
    return { saindo, saindoPos: (simResultado.posMap.get(saindoId) ?? 'ZAG') as Pos, entrando }
  }

  const subsA2T = substituicoes.filter(s => s.time === 'A').flatMap(s => { const p = buildSubPar(s); return p ? [p] : [] })
  const subsB2T = substituicoes.filter(s => s.time === 'B').flatMap(s => { const p = buildSubPar(s); return p ? [p] : [] })
  const rows2A  = simResultado ? build2ndHalfRows(simResultado.tA, subsA2T, simResultado.posMap) : []
  const rows2B  = simResultado ? build2ndHalfRows(simResultado.tB, subsB2T, simResultado.posMap) : []
  const show2Tempo = simResultado != null && substituicoes.some(s => s.saindoKey && s.entrandoKey)

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-verde-claro">
      <span className="text-5xl animate-bounce">⚽</span>
      <p>Carregando atletas...</p>
    </div>
  )

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-dourado mb-1">
              {editando ? '✏️ Editar Rodada' : '📋 Painel da Rodada'}
            </h1>
            <p className="text-verde-claro text-sm">
              {editando ? `Editando rodada de ${editando}` : 'Registre presenças e substituições'}
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold">Data da rodada</span>
            <input type="date" value={dataRodada}
              onChange={(e) => { if (!editando) setDataRodada(e.target.value) }}
              readOnly={!!editando}
              className={`bg-black/25 border rounded-lg px-3 py-2 text-dourado outline-none
                ${editando ? 'border-white/10 opacity-60 cursor-not-allowed' : 'border-dourado/30'}`} />
          </label>
        </div>

        {/* Stats */}
        <div className="flex gap-2 mb-5">
          {[
            { n: totalPresentes,   sub: 'Presentes',  cor: 'text-green-400' },
            { n: totalLesionados,  sub: 'Lesionados', cor: 'text-amber-400' },
            { n: totalAusentes,    sub: 'Ausentes',   cor: 'text-gray-400' },
            { n: jogadores.length, sub: 'Total',      cor: 'text-dourado' },
          ].map(({ n, sub, cor }) => (
            <div key={sub} className="flex-1 bg-card-bg border border-white/7 rounded-xl py-3 text-center">
              <span className={`block text-xl font-bold ${cor}`}>{n}</span>
              <span className="text-verde-claro text-[10px] uppercase tracking-wide">{sub}</span>
            </div>
          ))}
        </div>

        {/* Alerta */}
        {msgStatus && (
          <div className={`rounded-lg px-4 py-3 mb-4 text-sm font-medium ${
            msgStatus.tipo === 'sucesso'
              ? 'bg-green-500/15 border border-green-500/30 text-green-400'
              : 'bg-red-500/15 border border-red-500/30 text-red-400'
          }`}>
            {msgStatus.tipo === 'sucesso' ? '✅' : '❌'} {msgStatus.msg}
          </div>
        )}

        {/* Seção 1: Presenças */}
        <div className="mb-6">
          <h2 className="text-dourado text-xs uppercase tracking-wider font-bold mb-1.5 pb-1.5 border-b border-dourado/20">
            👟 Jogadores de Linha
          </h2>
          <p className="text-[11px] text-verde-claro/50 mb-2">
            Pres = Presente (3 pts) · Aus = Ausente (0 pts) · Les = Lesionado (3 pts)
          </p>
          <div className="flex flex-col gap-2">
            {jogadores.map(a => (
              <CardPresenca key={a.id} atleta={a}
                dados={dados[`Linha-${a.id}`] ?? dadosIniciais()}
                onChange={handleChange} />
            ))}
          </div>
        </div>

        {/* Seção 2: Simulação de Escalação */}
        {jogadoresPresentes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-dourado text-xs uppercase tracking-wider font-bold pb-1.5 border-b border-dourado/20 mb-3">
              ⚽ Escalação
            </h2>

            {!showSimulador ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowSimulador(true)}
                  className="w-full bg-gradient-to-r from-verde-campo/60 to-verde-medio/60 border border-dourado/40
                    text-dourado font-bold py-4 rounded-xl text-base hover:from-verde-campo hover:to-verde-medio
                    hover:border-dourado cursor-pointer transition-all mb-3"
                >
                  ⚽ Simulação de Escalação
                </button>
                <CampoVazio mensagem="Clique para simular a escalação" />
              </>
            ) : (
              <SimuladorCampo
                jogadores={jogadoresPresentes}
                nomeTimeA={NOME_TIME_A}
                nomeTimeB={NOME_TIME_B}
                inline
                onResultado={setSimResultado}
              />
            )}
          </div>
        )}

        {/* Seção 3: Substituições */}
        <div className="mb-6">
          <div className="flex items-center justify-between pb-1.5 border-b border-dourado/20 mb-3">
            <h2 className="text-dourado text-xs uppercase tracking-wider font-bold">
              🔄 Substituições no Intervalo
            </h2>
            <button type="button" onClick={addSubstituicao}
              className="text-xs bg-card-bg border border-dourado/30 text-dourado px-2.5 py-1 rounded-lg
                hover:bg-dourado/10 cursor-pointer transition-colors">
              + Adicionar
            </button>
          </div>

          {substituicoes.length === 0 && (
            <p className="text-texto/25 text-sm text-center py-2">Nenhuma substituição registrada</p>
          )}

          <div className="flex flex-col gap-2">
            {substituicoes.map(sub => {
              const saindoOpts = atletasEscalados.filter(a => !sub.time || a.time === sub.time)
              return (
                <div key={sub.id} className="bg-card-bg border border-white/7 rounded-xl p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex gap-1 shrink-0">
                      {(['A', 'B'] as TimeID[]).map(t => (
                        <button key={t} type="button"
                          onClick={() => updateSub(sub.id, 'time', sub.time === t ? '' : t)}
                          className={`text-xs px-2.5 py-1 rounded border cursor-pointer font-semibold transition-colors
                            ${sub.time === t
                              ? 'bg-dourado/20 border-dourado text-dourado'
                              : 'border-white/10 text-texto/50 hover:border-white/25'}`}>
                          {t === 'A' ? NOME_TIME_A : NOME_TIME_B}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                      <span className="text-xs text-red-400 shrink-0">Sai:</span>
                      <select value={sub.saindoKey} onChange={(e) => updateSub(sub.id, 'saindoKey', e.target.value)}
                        className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-texto outline-none">
                        <option value="">Selecionar...</option>
                        {saindoOpts.map(a => <option key={a.key} value={a.key}>{a.nome}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                      <span className="text-xs text-green-400 shrink-0">Entra:</span>
                      <select value={sub.entrandoKey} onChange={(e) => updateSub(sub.id, 'entrandoKey', e.target.value)}
                        className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-texto outline-none">
                        <option value="">Selecionar...</option>
                        {atletasReservas.map(a => <option key={a.key} value={a.key}>{a.nome}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => removeSub(sub.id)}
                      className="text-red-400/50 hover:text-red-400 cursor-pointer text-base shrink-0 leading-none">
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Seção 4: Campinho do 2° Tempo */}
        <div className="mb-6">
          <h2 className="text-dourado text-xs uppercase tracking-wider font-bold pb-1.5 border-b border-dourado/20 mb-3">
            🔄 2° Tempo
          </h2>
          {show2Tempo ? (
            <>
              <Campo
                label="2° Tempo"
                nA={NOME_TIME_A} nB={NOME_TIME_B}
                ptsA={simResultado!.ptsA} ptsB={simResultado!.ptsB}
                rowsA={rows2A} rowsB={rows2B}
              />
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {(Object.keys(COR) as Pos[]).map(pos => (
                  <span key={pos} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${COR[pos]}`}>{pos}</span>
                ))}
                <span className="text-[8px] text-green-300 border border-green-500/30 bg-green-500/10 rounded px-1.5 py-0.5">
                  ↑ entra
                </span>
              </div>
            </>
          ) : (
            <CampoVazio mensagem="Adicione substituições para ver o 2° tempo" />
          )}
        </div>

        {/* Gravar */}
        <div className="flex justify-center pt-2 pb-6">
          <button onClick={handleSubmit} disabled={isPending}
            className="w-full sm:w-auto bg-gradient-to-r from-verde-campo to-verde-medio border border-dourado
              text-dourado font-bold py-3 px-10 rounded-xl text-lg transition-all hover:-translate-y-0.5
              hover:shadow-xl disabled:opacity-60 cursor-pointer">
            {isPending ? '⏳ Salvando...' : editando ? '💾 Salvar Edições' : '💾 Gravar e Fechar Rodada'}
          </button>
        </div>
      </div>

      {/* Modal de confirmação de sobrescrita */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d2b17] border border-dourado/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <p className="text-lg font-bold text-dourado mb-2">⚠️ Rodada já registrada</p>
            <p className="text-sm text-verde-claro mb-5">
              Já existe uma rodada em <strong className="text-texto">{dataRodada}</strong>. Os dados existentes serão apagados e substituídos. Tem certeza?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowConfirm(false)}
                className="flex-1 border border-white/20 text-texto/60 rounded-xl py-2.5 text-sm cursor-pointer
                  hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmarSobrescrita} disabled={isPending}
                className="flex-1 bg-red-600/20 border border-red-500/50 text-red-400 font-semibold rounded-xl
                  py-2.5 text-sm cursor-pointer hover:bg-red-600/30 transition-colors disabled:opacity-50">
                {isPending ? '⏳ Sobrescrevendo...' : 'Sim, sobrescrever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
