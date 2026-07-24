'use client'

import type { Atleta } from '@/types'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Pos = 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA' | 'CA'

// Esquema fixo por time: 2 ZAG + 2 LAT + 2 VOL + 2 MEI + 2 ATA + 1 CA = 11
const SLOTS_TIME: Record<Pos, number> = { ZAG: 2, LAT: 2, VOL: 2, MEI: 2, ATA: 2, CA: 1 }

// Pares que não podem jogar em times opostos
const PARES_FAMILIA: [string, string][] = [
  ['jacare', 'leandro'],
  ['gustavo', 'alcir'],
  ['elizio', 'victor'],
  ['marcao', 'maurinho'],
  ['duduzinho', 'joao gabriel'],
]

type Slot  = { pos: Pos; atleta: Atleta | null; sai: boolean }
type SubPar = { saindo: Atleta; saindoPos: Pos; entrando: Atleta }
type PosMap = Map<number, Pos>

// ─── Helpers ────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function saoParentes(a: Atleta, b: Atleta): boolean {
  const na = norm(a.nome)
  const nb = norm(b.nome)
  return PARES_FAMILIA.some(([p1, p2]) =>
    (na.includes(p1) && nb.includes(p2)) ||
    (na.includes(p2) && nb.includes(p1))
  )
}

// Atribui posições respeitando posicoes_preferidas; fallback na ordem ZAG→CA
function assignPos(players: Atleta[], slotsInit: Record<Pos, number>): PosMap {
  const slots = { ...slotsInit }
  const map: PosMap = new Map()
  const rest: Atleta[] = []

  for (const p of players) {
    const prefs = (p.posicoes_preferidas ?? []) as Pos[]
    let ok = false
    for (const pos of prefs) {
      if (slots[pos] > 0) { map.set(p.id, pos); slots[pos]--; ok = true; break }
    }
    if (!ok) rest.push(p)
  }

  const fallback: Pos[] = ['ZAG', 'LAT', 'VOL', 'MEI', 'ATA', 'CA']
  for (const p of rest) {
    for (const pos of fallback) {
      if (slots[pos] > 0) { map.set(p.id, pos); slots[pos]--; break }
    }
  }
  return map
}

// Snake draft com restrição familiar: par sempre vai para o mesmo time
function distribuir(players: Atleta[]): { A: Atleta[]; B: Atleta[] } {
  const A: Atleta[] = []
  const B: Atleta[] = []
  const done = new Set<number>()
  let slot = 0

  for (const p of players) {
    if (done.has(p.id)) continue

    const cycle = Math.floor(slot / 2) % 2
    const half  = slot % 2
    const team: 'A' | 'B' = cycle === 0 ? (half === 0 ? 'A' : 'B') : (half === 0 ? 'B' : 'A')

    ;(team === 'A' ? A : B).push(p)
    done.add(p.id)
    slot++

    // Arrasta familiar junto, sem consumir slot extra no draft
    const par = players.find(pp => !done.has(pp.id) && saoParentes(p, pp))
    if (par) { ;(team === 'A' ? A : B).push(par); done.add(par.id) }
  }
  return { A, B }
}

// Distribui subs respeitando família e balanceando 3-3
function distribuirSubs(subs: Atleta[], tA: Atleta[], tB: Atleta[]): { A: Atleta[]; B: Atleta[] } {
  const A: Atleta[] = []
  const B: Atleta[] = []
  const done = new Set<number>()

  for (const p of subs) {
    if (done.has(p.id)) continue
    const inA = tA.some(s => saoParentes(p, s))
    const inB = tB.some(s => saoParentes(p, s))
    const team: 'A' | 'B' = inA && !inB ? 'A' : inB && !inA ? 'B' : A.length <= B.length ? 'A' : 'B'
    ;(team === 'A' ? A : B).push(p)
    done.add(p.id)
    const par = subs.find(pp => !done.has(pp.id) && saoParentes(p, pp))
    if (par) { ;(team === 'A' ? A : B).push(par); done.add(par.id) }
  }
  return { A, B }
}

// Constrói as 3 linhas do campo: [DEF, MID, FWD]
function buildRows(players: Atleta[], posMap: PosMap, saindoIds: Set<number>): Slot[][] {
  const by: Record<Pos, Atleta[]> = { ZAG: [], LAT: [], VOL: [], MEI: [], ATA: [], CA: [] }
  for (const p of players) {
    const pos = posMap.get(p.id)
    if (pos) by[pos].push(p)
  }
  const pick = (pos: Pos): Slot => {
    const atleta = by[pos].shift() ?? null
    return { pos, atleta, sai: atleta ? saindoIds.has(atleta.id) : false }
  }
  return [
    [pick('LAT'), pick('ZAG'), pick('ZAG'), pick('LAT')],   // DEF
    [pick('VOL'), pick('MEI'), pick('MEI'), pick('VOL')],   // MID
    [pick('ATA'), pick('CA'),  pick('ATA')],                 // FWD
  ]
}

// ─── Simulação principal ─────────────────────────────────────────────────────

function simular(jogadores: Atleta[]) {
  const sorted = [...jogadores].sort((a, b) => b.pontuacao_atual - a.pontuacao_atual)
  const n = sorted.length
  const nSubs = Math.min(Math.max(0, n - 22), 6)

  const starters  = sorted.slice(0, Math.min(n, 22))
  const subs      = sorted.slice(22, 22 + nSubs)
  const excluidos = sorted.slice(22 + nSubs)

  const { A: tA, B: tB }      = distribuir(starters)
  const { A: subsA, B: subsB } = distribuirSubs(subs, tA, tB)

  // Quem sai: os de menor ranking de cada time (mesma qtd que subs do time)
  const saindoA = [...tA].sort((a, b) => a.pontuacao_atual - b.pontuacao_atual).slice(0, subsA.length)
  const saindoB = [...tB].sort((a, b) => a.pontuacao_atual - b.pontuacao_atual).slice(0, subsB.length)

  const posA = assignPos(tA, { ...SLOTS_TIME })
  const posB = assignPos(tB, { ...SLOTS_TIME })

  // Pares de substituição: sub herda a posição do titular que sai
  const paresA: SubPar[] = saindoA.map((saindo, i) => ({
    saindo, saindoPos: posA.get(saindo.id) ?? 'ZAG', entrando: subsA[i],
  })).filter(p => p.entrando)

  const paresB: SubPar[] = saindoB.map((saindo, i) => ({
    saindo, saindoPos: posB.get(saindo.id) ?? 'ZAG', entrando: subsB[i],
  })).filter(p => p.entrando)

  return {
    tA, tB, posA, posB,
    saindoA, saindoB,
    paresA, paresB,
    excluidos,
    ptsA: tA.reduce((s, a) => s + a.pontuacao_atual, 0),
    ptsB: tB.reduce((s, a) => s + a.pontuacao_atual, 0),
  }
}

// ─── Estilos por posição ────────────────────────────────────────────────────

const COR: Record<Pos, string> = {
  ZAG: 'bg-blue-500/25 text-blue-200 border-blue-400/40',
  LAT: 'bg-purple-500/25 text-purple-200 border-purple-400/40',
  VOL: 'bg-orange-500/25 text-orange-200 border-orange-400/40',
  MEI: 'bg-yellow-500/25 text-yellow-200 border-yellow-400/40',
  ATA: 'bg-red-500/25 text-red-200 border-red-400/40',
  CA:  'bg-pink-500/25 text-pink-200 border-pink-400/40',
}

// ─── Componentes visuais ────────────────────────────────────────────────────

function PlayerPin({ slot }: { slot: Slot }) {
  if (!slot.atleta) return <div style={{ width: 52 }} />
  const nome = slot.atleta.nome.split(' ')[0]
  return (
    <div className={`flex flex-col items-center gap-0.5 transition-opacity ${slot.sai ? 'opacity-45' : ''}`} style={{ width: 52 }}>
      <div className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm shadow-md
        ${slot.sai ? 'bg-red-900/40 border-red-500/60' : 'bg-white/15 border-white/30'}`}>
        👟
        {slot.sai && (
          <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold text-white leading-none">
            ↓
          </span>
        )}
      </div>
      <span className="text-[9px] text-white font-semibold text-center leading-tight truncate w-full px-px">
        {nome}
      </span>
      <span className={`text-[8px] font-bold px-1 py-px rounded border ${COR[slot.pos]}`}>
        {slot.pos}
      </span>
    </div>
  )
}

function MetadeCampo({ title, pts, rows, isTop }: {
  title: string; pts: number; rows: Slot[][]; isTop: boolean
}) {
  const linhas = isTop ? rows : [...rows].reverse()
  return (
    <div className="flex-1 flex flex-col gap-2.5 py-3 px-2">
      {isTop && (
        <div className="text-center mb-0.5">
          <span className="text-white font-bold text-sm">{title}</span>
          <span className="ml-2 text-[11px] text-yellow-300 font-semibold">{pts} pts</span>
        </div>
      )}
      {linhas.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 sm:gap-2 flex-wrap">
          {row.map((slot, j) => <PlayerPin key={j} slot={slot} />)}
        </div>
      ))}
      {!isTop && (
        <div className="text-center mt-0.5">
          <span className="text-white font-bold text-sm">{title}</span>
          <span className="ml-2 text-[11px] text-yellow-300 font-semibold">{pts} pts</span>
        </div>
      )}
    </div>
  )
}

function PainelSubstituicoes({ paresA, paresB, nomeA, nomeB }: {
  paresA: SubPar[]; paresB: SubPar[]; nomeA: string; nomeB: string
}) {
  if (!paresA.length && !paresB.length) return null
  return (
    <div className="mt-3 bg-white/5 border border-white/8 rounded-xl p-3">
      <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold text-center mb-2.5">
        🔄 Substituições no intervalo
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { pares: paresA, nome: nomeA },
          { pares: paresB, nome: nomeB },
        ].map(({ pares, nome }) => (
          <div key={nome}>
            <p className="text-yellow-300 text-[11px] font-bold mb-1.5">{nome}</p>
            {pares.map((p, i) => (
              <div key={i} className="flex items-center gap-1 mb-1.5">
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-red-400 text-[10px]">↓</span>
                    <span className="text-white/50 text-[10px] truncate">{p.saindo.nome.split(' ')[0]}</span>
                    <span className={`ml-auto text-[8px] px-1 rounded border shrink-0 ${COR[p.saindoPos]}`}>{p.saindoPos}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-green-400 text-[10px]">↑</span>
                    <span className="text-white text-[10px] font-semibold truncate">{p.entrando.nome.split(' ')[0]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Export principal ────────────────────────────────────────────────────────

export default function SimuladorCampo({
  jogadores, nomeTimeA, nomeTimeB, onFechar,
}: {
  jogadores: Atleta[]
  nomeTimeA: string
  nomeTimeB: string
  onFechar: () => void
}) {
  if (jogadores.length === 0) return null

  const r = simular(jogadores)
  const nA = nomeTimeA || 'Time A'
  const nB = nomeTimeB || 'Time B'

  const saindoAIds = new Set(r.saindoA.map(a => a.id))
  const saindoBIds = new Set(r.saindoB.map(a => a.id))
  const rowsA = buildRows(r.tA, r.posA, saindoAIds)
  const rowsB = buildRows(r.tB, r.posB, saindoBIds)
  const diffPts = Math.abs(r.ptsA - r.ptsB)

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-[400] p-3 pt-4 overflow-y-auto"
      onClick={onFechar}
    >
      <div className="w-full max-w-lg pb-8" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-yellow-300 font-bold text-base">🔀 Simulação de Times</h2>
          <button onClick={onFechar}
            className="text-white/40 hover:text-white text-xl cursor-pointer border-0 bg-transparent px-1 leading-none">
            ✕
          </button>
        </div>

        {/* Campo */}
        <div
          className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: 'linear-gradient(180deg,#1a5c0a 0%,#2a7010 47%,#2a7010 53%,#1a5c0a 100%)' }}
        >
          {/* Marcações */}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute inset-2 border border-white/15 rounded-sm" />
            <div className="absolute left-2 right-2 top-1/2 border-t border-white/30" />
            <div className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 border border-white/15 rounded-full" />
            <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-white/30 rounded-full" />
            <div className="absolute left-[25%] right-[25%] top-2 h-[8%] border border-white/10" />
            <div className="absolute left-[25%] right-[25%] bottom-2 h-[8%] border border-white/10" />
          </div>

          {/* Times */}
          <div className="relative flex flex-col divide-y divide-white/25">
            <MetadeCampo title={nA} pts={r.ptsA} rows={rowsA} isTop={true} />
            <MetadeCampo title={nB} pts={r.ptsB} rows={rowsB} isTop={false} />
          </div>
        </div>

        {/* Legenda de posições */}
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {(Object.keys(COR) as Pos[]).map(pos => (
            <span key={pos} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${COR[pos]}`}>{pos}</span>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 rounded-lg py-2">
            <span className="block text-[10px] text-white/40">Titulares</span>
            <span className="block text-sm font-bold text-white">{r.tA.length} × {r.tB.length}</span>
          </div>
          <div className={`rounded-lg py-2 ${diffPts <= 15 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            <span className={`block text-[10px] ${diffPts <= 15 ? 'text-green-400/70' : 'text-yellow-400/70'}`}>Dif. pts</span>
            <span className={`block text-sm font-bold ${diffPts <= 15 ? 'text-green-300' : 'text-yellow-300'}`}>{diffPts}</span>
          </div>
          <div className="bg-white/5 rounded-lg py-2">
            <span className="block text-[10px] text-white/40">Substituições</span>
            <span className="block text-sm font-bold text-white">{r.paresA.length + r.paresB.length}</span>
          </div>
        </div>

        {/* Substituições */}
        <PainelSubstituicoes paresA={r.paresA} paresB={r.paresB} nomeA={nA} nomeB={nB} />

        {/* Excluídos (além dos 28) */}
        {r.excluidos.length > 0 && (
          <div className="mt-3 text-center text-[10px] text-white/25">
            Não entram: {r.excluidos.map(a => a.nome.split(' ')[0]).join(', ')}
          </div>
        )}

        <p className="text-center text-[9px] text-white/15 mt-3">
          Esquema fixo: 2 ZAG · 2 LAT · 2 VOL · 2 MEI · 2 ATA · 1 CA · Top 22 titulares · 6 subs no intervalo
        </p>
      </div>
    </div>
  )
}
