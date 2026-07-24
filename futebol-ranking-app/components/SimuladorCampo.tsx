'use client'

import type { Atleta, Formacao } from '@/types'

const CFG: Record<Formacao, { DEF: number; MEI: number; ATA: number }> = {
  '3-3-3': { DEF: 3, MEI: 3, ATA: 3 },
  '4-3-3': { DEF: 4, MEI: 3, ATA: 3 },
  '4-4-3': { DEF: 4, MEI: 4, ATA: 3 },
}

function mapPos(pref: string): 'DEF' | 'MEI' | 'ATA' | null {
  if (['ZAG', 'LAT'].includes(pref)) return 'DEF'
  if (['VOL', 'MEI'].includes(pref)) return 'MEI'
  if (['ATA', 'CA'].includes(pref)) return 'ATA'
  return null
}

type TimeSlots = { DEF: Atleta[]; MEI: Atleta[]; ATA: Atleta[]; extras: Atleta[] }

function atribuirPosicoes(players: Atleta[], cfg: { DEF: number; MEI: number; ATA: number }): TimeSlots {
  const slots = { DEF: cfg.DEF, MEI: cfg.MEI, ATA: cfg.ATA }
  const result: TimeSlots = { DEF: [], MEI: [], ATA: [], extras: [] }
  const semPosicao: Atleta[] = []

  for (const p of players) {
    const prefs = (p.posicoes_preferidas ?? []).map(mapPos).filter((x): x is 'DEF' | 'MEI' | 'ATA' => x !== null)
    let ok = false
    for (const pos of prefs) {
      if (slots[pos] > 0) { result[pos].push(p); slots[pos]--; ok = true; break }
    }
    if (!ok) semPosicao.push(p)
  }

  for (const p of semPosicao) {
    if (slots.DEF > 0) { result.DEF.push(p); slots.DEF-- }
    else if (slots.MEI > 0) { result.MEI.push(p); slots.MEI-- }
    else if (slots.ATA > 0) { result.ATA.push(p); slots.ATA-- }
    else result.extras.push(p)
  }

  return result
}

function simular(jogadores: Atleta[], formacao: Formacao) {
  const cfg = CFG[formacao]
  const sorted = [...jogadores].sort((a, b) => b.pontuacao_atual - a.pontuacao_atual)

  // Snake draft: A B B A A B B A…  — balanceia a soma de pontos
  const tA: Atleta[] = []
  const tB: Atleta[] = []
  sorted.forEach((p, i) => {
    const cycle = Math.floor(i / 2) % 2
    const odd = i % 2
    ;(cycle === 0 ? (odd === 0 ? tA : tB) : (odd === 0 ? tB : tA)).push(p)
  })

  const sum = (arr: Atleta[], fn: (a: Atleta) => number) => arr.reduce((s, a) => s + fn(a), 0)
  const avg = (arr: Atleta[], fn: (a: Atleta) => number) =>
    arr.length ? Math.round(sum(arr, fn) / arr.length) : 0

  return {
    A: atribuirPosicoes(tA, cfg),
    B: atribuirPosicoes(tB, cfg),
    ptsA: sum(tA, a => a.pontuacao_atual),
    ptsB: sum(tB, a => a.pontuacao_atual),
    idadeA: avg(tA, a => a.idade ?? 0),
    idadeB: avg(tB, a => a.idade ?? 0),
    listA: tA,
    listB: tB,
  }
}

const COR_POS: Record<string, string> = {
  DEF: 'bg-blue-500/25 text-blue-200 border-blue-400/30',
  MEI: 'bg-yellow-500/25 text-yellow-200 border-yellow-400/30',
  ATA: 'bg-red-500/25 text-red-200 border-red-400/30',
}

function PlayerPin({ atleta, pos }: { atleta: Atleta; pos: string }) {
  const primeiroNome = atleta.nome.split(' ')[0]
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ width: '56px' }}>
      <div className="w-9 h-9 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-base shadow-md">
        👟
      </div>
      <span className="text-[9px] sm:text-[10px] text-white font-semibold text-center leading-tight w-full text-center truncate">
        {primeiroNome}
      </span>
      <span className={`text-[8px] font-bold px-1 py-px rounded border ${COR_POS[pos] ?? 'bg-white/10 text-white/50 border-white/20'}`}>
        {pos}
      </span>
    </div>
  )
}

function LinhaJogadores({ atletas, pos }: { atletas: Atleta[]; pos: string }) {
  if (atletas.length === 0) return null
  return (
    <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
      {atletas.map(a => <PlayerPin key={a.id} atleta={a} pos={pos} />)}
    </div>
  )
}

function InfoTime({ nome, pts, idadeMedia }: { nome: string; pts: number; idadeMedia: number }) {
  return (
    <div className="text-center py-1">
      <span className="text-white font-bold text-sm">{nome}</span>
      <div className="flex justify-center gap-3 mt-0.5">
        <span className="text-[11px] text-yellow-300 font-semibold">{pts} pts</span>
        {idadeMedia > 0 && (
          <span className="text-[11px] text-white/40">~{idadeMedia} anos</span>
        )}
      </div>
    </div>
  )
}

export default function SimuladorCampo({
  jogadores, formacao, nomeTimeA, nomeTimeB, onFechar,
}: {
  jogadores: Atleta[]
  formacao: Formacao
  nomeTimeA: string
  nomeTimeB: string
  onFechar: () => void
}) {
  if (jogadores.length === 0) return null

  const r = simular(jogadores, formacao)
  const nA = nomeTimeA || 'Time A'
  const nB = nomeTimeB || 'Time B'
  const diffPts = Math.abs(r.ptsA - r.ptsB)
  const diffIdade = r.idadeA && r.idadeB ? Math.abs(r.idadeA - r.idadeB) : null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-[400] p-3 pt-4 overflow-y-auto"
      onClick={onFechar}
    >
      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-yellow-300 font-bold text-base">🔀 Simulação de Times</h2>
          <button
            onClick={onFechar}
            className="text-white/40 hover:text-white text-xl leading-none cursor-pointer border-0 bg-transparent px-1"
          >
            ✕
          </button>
        </div>

        {/* Campinho */}
        <div
          className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: 'linear-gradient(180deg, #1e5c0a 0%, #2d7a12 45%, #2d7a12 55%, #1e5c0a 100%)' }}
        >
          {/* Marcações do campo */}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute inset-2.5 border border-white/15 rounded-sm" />
            <div className="absolute left-2.5 right-2.5 top-1/2 border-t border-white/25" />
            <div className="absolute left-1/2 top-1/2 w-14 h-14 -translate-x-1/2 -translate-y-1/2 border border-white/15 rounded-full" />
            <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-white/30 rounded-full" />
            {/* Pequena área Time A */}
            <div className="absolute left-[28%] right-[28%] top-2.5 h-[10%] border border-white/10" />
            {/* Pequena área Time B */}
            <div className="absolute left-[28%] right-[28%] bottom-2.5 h-[10%] border border-white/10" />
          </div>

          {/* Time A — metade de cima */}
          <div className="relative px-3 pt-4 pb-3 flex flex-col gap-3">
            <InfoTime nome={nA} pts={r.ptsA} idadeMedia={r.idadeA} />
            <LinhaJogadores atletas={r.A.DEF} pos="DEF" />
            <LinhaJogadores atletas={r.A.MEI} pos="MEI" />
            <LinhaJogadores atletas={r.A.ATA} pos="ATA" />
            {r.A.extras.length > 0 && (
              <p className="text-center text-[10px] text-white/30">+{r.A.extras.length} jogador(es) sem posição</p>
            )}
          </div>

          {/* Divisória do meio */}
          <div className="relative h-6 flex items-center justify-center">
            <span className="text-[10px] text-white/20 uppercase tracking-widest">meio campo</span>
          </div>

          {/* Time B — metade de baixo */}
          <div className="relative px-3 pt-3 pb-4 flex flex-col gap-3">
            <LinhaJogadores atletas={r.B.ATA} pos="ATA" />
            <LinhaJogadores atletas={r.B.MEI} pos="MEI" />
            <LinhaJogadores atletas={r.B.DEF} pos="DEF" />
            {r.B.extras.length > 0 && (
              <p className="text-center text-[10px] text-white/30">+{r.B.extras.length} jogador(es) sem posição</p>
            )}
            <InfoTime nome={nB} pts={r.ptsB} idadeMedia={r.idadeB} />
          </div>
        </div>

        {/* Stats do equilíbrio */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 rounded-lg py-2 px-1">
            <span className="block text-xs text-white/40">Jogadores</span>
            <span className="block text-sm font-bold text-white">{r.listA.length} × {r.listB.length}</span>
          </div>
          <div className={`rounded-lg py-2 px-1 ${diffPts <= 15 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            <span className={`block text-xs ${diffPts <= 15 ? 'text-green-400/60' : 'text-yellow-400/60'}`}>Dif. pontos</span>
            <span className={`block text-sm font-bold ${diffPts <= 15 ? 'text-green-300' : 'text-yellow-300'}`}>{diffPts}</span>
          </div>
          <div className={`rounded-lg py-2 px-1 ${!diffIdade || diffIdade <= 3 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            <span className={`block text-xs ${!diffIdade || diffIdade <= 3 ? 'text-green-400/60' : 'text-yellow-400/60'}`}>Dif. idade</span>
            <span className={`block text-sm font-bold ${!diffIdade || diffIdade <= 3 ? 'text-green-300' : 'text-yellow-300'}`}>
              {diffIdade !== null ? `${diffIdade} a` : '—'}
            </span>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/20 mt-2 pb-2">
          Distribuição automática por pontos · posições respeitam as preferências cadastradas
        </p>
      </div>
    </div>
  )
}
