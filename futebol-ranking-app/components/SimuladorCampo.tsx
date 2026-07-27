'use client'

import { useState, useEffect } from 'react'
import type { Atleta } from '@/types'

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type Pos    = 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA' | 'CA'
type PosMap = Map<number, Pos>
type Slot   = { pos: Pos; atleta: Atleta | null; sai: boolean; entering: boolean }
type SubPar = { saindo: Atleta; saindoPos: Pos; entrando: Atleta }

const SLOTS_TIME: Record<Pos, number>  = { ZAG: 2, LAT: 2, VOL: 2, MEI: 2, ATA: 2, CA: 1 }
const SLOTS_TOTAL: Record<Pos, number> = { ZAG: 4, LAT: 4, VOL: 4, MEI: 4, ATA: 4, CA: 2 }
const POS_ORDER: Pos[] = ['ZAG', 'LAT', 'VOL', 'MEI', 'ATA', 'CA']

const ATTRS = ['visao_jogo', 'passe', 'preparo_fisico', 'drible', 'chute', 'desarme'] as const
type AttrKey = typeof ATTRS[number]

const ATTR_LABEL: Record<AttrKey, string> = {
  visao_jogo: 'Visão', passe: 'Passe', preparo_fisico: 'Físico',
  drible: 'Drible', chute: 'Chute', desarme: 'Desarme',
}

const COR: Record<Pos, string> = {
  ZAG: 'bg-blue-500/25 text-blue-200 border-blue-400/40',
  LAT: 'bg-purple-500/25 text-purple-200 border-purple-400/40',
  VOL: 'bg-orange-500/25 text-orange-200 border-orange-400/40',
  MEI: 'bg-yellow-500/25 text-yellow-200 border-yellow-400/40',
  ATA: 'bg-red-500/25 text-red-200 border-red-400/40',
  CA:  'bg-pink-500/25 text-pink-200 border-pink-400/40',
}

const PARES_FAMILIA: [string, string][] = [
  ['jacare', 'leandro'],
  ['gustavo', 'alcir'],
  ['elizio', 'victor'],
  ['marcao', 'maurinho'],
  ['duduzinho', 'joao gabriel'],
]

// Pares que NÃO podem jogar no mesmo time
const PARES_RIVAIS: [string, string][] = [
  ['renato', 'carvalho'],
  ['domingos', 'duduzinho'],
  ['boro', 'jorge'],
  ['alcir', 'bideu'],
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function saoParentes(a: Atleta, b: Atleta) {
  const na = norm(a.nome), nb = norm(b.nome)
  return PARES_FAMILIA.some(([p1, p2]) =>
    (na.includes(p1) && nb.includes(p2)) || (na.includes(p2) && nb.includes(p1))
  )
}

function saoRivais(a: Atleta, b: Atleta) {
  const na = norm(a.nome), nb = norm(b.nome)
  return PARES_RIVAIS.some(([p1, p2]) =>
    (na.includes(p1) && nb.includes(p2)) || (na.includes(p2) && nb.includes(p1))
  )
}

function compositeScore(p: Atleta) {
  return p.pontuacao_atual + ATTRS.reduce((s, k) => s + (p[k] ?? 5), 0) * 2
}

function shuffleWithinBands(players: Atleta[], band = 40): Atleta[] {
  const r = [...players]
  let i = 0
  while (i < r.length) {
    const top = compositeScore(r[i])
    let j = i
    while (j + 1 < r.length && top - compositeScore(r[j + 1]) <= band) j++
    for (let k = j; k > i; k--) {
      const m = i + Math.floor(Math.random() * (k - i + 1))
      ;[r[k], r[m]] = [r[m], r[k]]
    }
    i = j + 1
  }
  return r
}

// ─── Fase 1: Atribuição de posições (global) ─────────────────────────────────

function assignPositions(players: Atleta[]): PosMap {
  const n  = players.length
  // Escala os slots proporcionalmente ao número de titulares
  const scale = Math.min(n / 22, 1)
  const slots: Record<Pos, number> = {
    ZAG: Math.round(SLOTS_TOTAL.ZAG * scale),
    LAT: Math.round(SLOTS_TOTAL.LAT * scale),
    VOL: Math.round(SLOTS_TOTAL.VOL * scale),
    MEI: Math.round(SLOTS_TOTAL.MEI * scale),
    ATA: Math.round(SLOTS_TOTAL.ATA * scale),
    CA:  Math.max(2, Math.round(SLOTS_TOTAL.CA * scale)),
  }
  // Garante que a soma dos slots cobre todos os jogadores
  let total = Object.values(slots).reduce((s, v) => s + v, 0)
  let i = 0
  while (total < n) { slots[POS_ORDER[i % POS_ORDER.length]]++; total++; i++ }
  while (total > n) {
    const pos = POS_ORDER.find(p => slots[p] > 0) ?? 'ZAG'
    slots[pos]--; total--
  }

  const posMap: PosMap = new Map()
  const unassigned: Atleta[] = []
  const sorted = [...players].sort(
    (a, b) => (a.posicoes_preferidas?.length ?? 0) - (b.posicoes_preferidas?.length ?? 0)
  )
  for (const p of sorted) {
    let ok = false
    for (const pos of (p.posicoes_preferidas ?? []) as Pos[]) {
      if (slots[pos] > 0) { posMap.set(p.id, pos); slots[pos]--; ok = true; break }
    }
    if (!ok) unassigned.push(p)
  }
  for (const p of unassigned) {
    for (const pos of POS_ORDER) {
      if (slots[pos] > 0) { posMap.set(p.id, pos); slots[pos]--; break }
    }
  }
  return posMap
}

// ─── Fase 2: Distribuição por grupo de posição ───────────────────────────────
// Família: propagada entre grupos. Overflow: jogador vai para o outro time.

function distribuirPorPosicao(starters: Atleta[], posMap: PosMap): { A: Atleta[]; B: Atleta[] } {
  const A: Atleta[] = [], B: Atleta[] = []
  const preAssigned = new Map<number, 'A' | 'B'>()
  const placed      = new Set<number>()

  const byPos: Record<Pos, Atleta[]> = { ZAG: [], LAT: [], VOL: [], MEI: [], ATA: [], CA: [] }
  for (const p of starters) {
    const pos = posMap.get(p.id)
    if (pos) byPos[pos].push(p)
  }

  for (const pos of POS_ORDER) {
    const group = shuffleWithinBands(byPos[pos].sort((a, b) => compositeScore(b) - compositeScore(a)))
    const limit = SLOTS_TIME[pos]
    let draftSlot = 0

    for (const p of group) {
      let team: 'A' | 'B' = preAssigned.has(p.id)
        ? preAssigned.get(p.id)!
        : (() => {
            const cycle = Math.floor(draftSlot / 2) % 2
            const odd   = draftSlot % 2
            draftSlot++
            return cycle === 0 ? (odd === 0 ? 'A' : 'B') : (odd === 0 ? 'B' : 'A')
          })()

      // Garante que nenhum time ultrapasse o limite por posição (pode ocorrer com família)
      const countInTarget = (team === 'A' ? A : B).filter(p2 => byPos[pos].some(pp => pp.id === p2.id)).length
      if (countInTarget >= limit) team = team === 'A' ? 'B' : 'A'

      ;(team === 'A' ? A : B).push(p)
      placed.add(p.id)

      // Propaga restrição familiar (mesmo time) para grupos ainda não processados
      const partner = starters.find(pp => !placed.has(pp.id) && !preAssigned.has(pp.id) && saoParentes(p, pp))
      if (partner) preAssigned.set(partner.id, team)

      // Propaga restrição de rivalidade (times opostos) para grupos ainda não processados
      const rival = starters.find(pp => !placed.has(pp.id) && !preAssigned.has(pp.id) && saoRivais(p, pp))
      if (rival) preAssigned.set(rival.id, team === 'A' ? 'B' : 'A')
    }
  }

  return { A, B }
}

// ─── Distribuição de substitutos ─────────────────────────────────────────────

function distribuirSubs(subs: Atleta[], tA: Atleta[], tB: Atleta[]): { A: Atleta[]; B: Atleta[] } {
  const A: Atleta[] = [], B: Atleta[] = []
  const done = new Set<number>()
  for (const p of subs) {
    if (done.has(p.id)) continue

    // Família: acompanha o parente titular
    const familiaA = tA.some(s => saoParentes(p, s)) || A.some(s => saoParentes(p, s))
    const familiaB = tB.some(s => saoParentes(p, s)) || B.some(s => saoParentes(p, s))
    // Rivalidade: vai para o time oposto ao rival
    const rivalA = tA.some(s => saoRivais(p, s)) || A.some(s => saoRivais(p, s))
    const rivalB = tB.some(s => saoRivais(p, s)) || B.some(s => saoRivais(p, s))

    let team: 'A' | 'B'
    if (familiaA && !familiaB)       team = 'A'
    else if (familiaB && !familiaA)  team = 'B'
    else if (rivalA && !rivalB)      team = 'B'  // rival no A → vai pro B
    else if (rivalB && !rivalA)      team = 'A'  // rival no B → vai pro A
    else                             team = A.length <= B.length ? 'A' : 'B'

    ;(team === 'A' ? A : B).push(p)
    done.add(p.id)

    // Propaga família entre reservas
    const par = subs.find(pp => !done.has(pp.id) && saoParentes(p, pp))
    if (par) { ;(team === 'A' ? A : B).push(par); done.add(par.id) }
  }
  return { A, B }
}

// ─── Criação dos pares de substituição por posição ───────────────────────────
//
// Passa 1: subs com preferência pela posição do saindo têm prioridade.
// Passa 2: subs restantes substituem quem sobrou (fallback por score).

function criarPares(starters: Atleta[], subs: Atleta[], posMap: PosMap): SubPar[] {
  const pares: SubPar[]     = []
  const subsDone            = new Set<number>()
  const startersDone        = new Set<number>()

  // Titulares de cada time ordenados do mais fraco para o mais forte (saem primeiro)
  const startersByScore = [...starters].sort((a, b) => compositeScore(a) - compositeScore(b))

  // Passa 1: match posição a posição
  for (const pos of POS_ORDER) {
    const subsPos      = subs.filter(s => !subsDone.has(s.id) && (s.posicoes_preferidas ?? []).includes(pos))
    const startersPos  = startersByScore.filter(s => !startersDone.has(s.id) && posMap.get(s.id) === pos)
    const n = Math.min(subsPos.length, startersPos.length)
    for (let i = 0; i < n; i++) {
      pares.push({ saindo: startersPos[i], saindoPos: pos, entrando: subsPos[i] })
      subsDone.add(subsPos[i].id)
      startersDone.add(startersPos[i].id)
    }
  }

  // Passa 2: subs sem posição preferida encaixada → substituem o mais fraco restante
  const remainingSubs     = subs.filter(s => !subsDone.has(s.id))
  const remainingStarters = startersByScore.filter(s => !startersDone.has(s.id))
  const n2 = Math.min(remainingSubs.length, remainingStarters.length)
  for (let i = 0; i < n2; i++) {
    const saindo    = remainingStarters[i]
    const saindoPos = posMap.get(saindo.id) ?? 'ZAG'
    pares.push({ saindo, saindoPos, entrando: remainingSubs[i] })
  }

  return pares
}

// ─── Layout de linhas do campo ────────────────────────────────────────────────

function buildRows(
  players: Atleta[],
  posMap: PosMap,
  saindoIds: Set<number>,
  enteringIds: Set<number> = new Set()
): Slot[][] {
  const by: Record<Pos, Atleta[]> = { ZAG: [], LAT: [], VOL: [], MEI: [], ATA: [], CA: [] }
  for (const p of players) {
    const pos = posMap.get(p.id)
    if (pos) by[pos].push(p)
  }
  const pick = (pos: Pos): Slot => {
    const atleta = by[pos].shift() ?? null
    return {
      pos, atleta,
      sai:      atleta ? saindoIds.has(atleta.id)    : false,
      entering: atleta ? enteringIds.has(atleta.id)  : false,
    }
  }
  return [
    [pick('LAT'), pick('ZAG'), pick('ZAG'), pick('LAT')],
    [pick('VOL'), pick('MEI'), pick('MEI'), pick('VOL')],
    [pick('ATA'), pick('CA'),  pick('ATA')],
  ]
}

function build2ndHalfRows(starters: Atleta[], pares: SubPar[], posMap: PosMap): Slot[][] {
  const posMap2    = new Map(posMap)
  const saindoIds  = new Set(pares.map(p => p.saindo.id))
  const enteringIds = new Set(pares.map(p => p.entrando.id))
  const players2nd: Atleta[] = [
    ...starters.filter(p => !saindoIds.has(p.id)),
    ...pares.map(p => { posMap2.set(p.entrando.id, p.saindoPos); return p.entrando }),
  ]
  return buildRows(players2nd, posMap2, new Set(), enteringIds)
}

// ─── Simulação principal ─────────────────────────────────────────────────────

function simular(jogadores: Atleta[]) {
  const sorted   = [...jogadores].sort((a, b) => compositeScore(b) - compositeScore(a))
  const starters = sorted.slice(0, Math.min(jogadores.length, 22))
  const subs     = sorted.slice(22)

  const posMap          = assignPositions(starters)
  const { A: tA, B: tB } = distribuirPorPosicao(starters, posMap)
  const { A: subsA, B: subsB } = distribuirSubs(subs, tA, tB)

  // Pares com match de posição: sub entra na posição do titular que sai
  const paresA = criarPares(tA, subsA, posMap)
  const paresB = criarPares(tB, subsB, posMap)

  const sum = (arr: Atleta[], fn: (a: Atleta) => number) => arr.reduce((s, a) => s + fn(a), 0)
  const avg = (arr: Atleta[], k: AttrKey) => arr.length ? sum(arr, a => a[k] ?? 5) / arr.length : 0

  const avgIdade = (arr: Atleta[]) => {
    const com = arr.filter(p => p.idade != null)
    return com.length ? com.reduce((s, p) => s + p.idade!, 0) / com.length : null
  }

  return {
    tA, tB, posMap,
    paresA, paresB,
    ptsA: sum(tA, a => a.pontuacao_atual),
    ptsB: sum(tB, a => a.pontuacao_atual),
    idadeA: avgIdade(tA),
    idadeB: avgIdade(tB),
    skillsA: Object.fromEntries(ATTRS.map(k => [k, avg(tA, k)])) as Record<AttrKey, number>,
    skillsB: Object.fromEntries(ATTRS.map(k => [k, avg(tB, k)])) as Record<AttrKey, number>,
  }
}

// ─── Otimização: balance por pontos + idade, variação mínima ─────────────────

function balanceScore(r: ReturnType<typeof simular>): number {
  const ptsDiff  = Math.abs(r.ptsA - r.ptsB)
  const ageDiff  = (r.idadeA != null && r.idadeB != null)
    ? Math.abs(r.idadeA - r.idadeB)
    : 0
  // 1 ano de diferença de idade equivale a ~10 pts
  return ptsDiff + ageDiff * 10
}

function contarDiferencas(
  prev: ReturnType<typeof simular>,
  curr: ReturnType<typeof simular>,
): number {
  const map = new Map<number, 'A' | 'B'>()
  prev.tA.forEach(p => map.set(p.id, 'A'))
  prev.tB.forEach(p => map.set(p.id, 'B'))
  let d = 0
  curr.tA.forEach(p => { if (map.get(p.id) === 'B') d++ })
  curr.tB.forEach(p => { if (map.get(p.id) === 'A') d++ })
  return d
}

// Roda N tentativas e retorna a mais equilibrada (pts + idade).
// Se prevResult fornecido, exige pelo menos minDiff jogadores trocando de time.
function simularOtimizado(
  jogadores: Atleta[],
  tentativas = 50,
  prevResult?: ReturnType<typeof simular>,
  minDiff = 4,
): ReturnType<typeof simular> {
  const candidatos = Array.from({ length: tentativas }, () => simular(jogadores))
  const validos = prevResult
    ? candidatos.filter(c => contarDiferencas(prevResult, c) >= minDiff)
    : candidatos
  // Fallback: se nenhum candidato atingiu minDiff, usa o pool completo
  const pool = validos.length > 0 ? validos : candidatos
  return pool.reduce((best, c) => balanceScore(c) < balanceScore(best) ? c : best)
}

// ─── Componentes visuais ─────────────────────────────────────────────────────

function PlayerPin({ slot, compact = false }: { slot: Slot; compact?: boolean }) {
  if (!slot.atleta) {
    return (
      <div
        className="flex items-center justify-center opacity-15"
        style={{ width: compact ? 36 : 48, height: compact ? 44 : 58 }}
      >
        <div className={`rounded-full border border-dashed border-white/40
          ${compact ? 'w-4 h-4' : 'w-8 h-8'}`} />
      </div>
    )
  }

  const nome = slot.atleta.nome.split(' ')[0]

  if (compact) {
    const initials = nome.slice(0, 3).toUpperCase()
    const avatarCls = slot.entering
      ? 'bg-green-500/35 border-green-400/80'
      : slot.sai
        ? 'bg-red-800/40 border-red-500/50'
        : 'bg-white/12 border-white/25'

    return (
      <div className={`flex flex-col items-center gap-px ${slot.sai ? 'opacity-35' : ''}`} style={{ width: 36 }}>
        <div className={`relative w-[22px] h-[22px] rounded-full border flex items-center justify-center
          text-[7px] font-bold text-white select-none ${avatarCls}`}>
          {initials}
          {slot.sai && (
            <span className="absolute -top-[3px] -right-[3px] bg-red-500 rounded-full w-[9px] h-[9px]
              flex items-center justify-center text-[5px] font-bold text-white leading-none">↓</span>
          )}
          {slot.entering && (
            <span className="absolute -top-[3px] -right-[3px] bg-green-500 rounded-full w-[9px] h-[9px]
              flex items-center justify-center text-[5px] font-bold text-white leading-none">↑</span>
          )}
        </div>
        <span className="text-[7px] text-white/85 font-medium leading-tight truncate w-full text-center px-px">
          {nome.length > 5 ? nome.slice(0, 5) + '.' : nome}
        </span>
        <span className={`text-[5.5px] font-bold px-0.5 rounded border leading-tight ${COR[slot.pos]}`}>
          {slot.pos}
        </span>
      </div>
    )
  }

  // Modo normal
  return (
    <div className={`flex flex-col items-center gap-0.5 ${slot.sai ? 'opacity-40' : ''}`} style={{ width: 48 }}>
      <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm shadow
        ${slot.sai ? 'bg-red-900/40 border-red-500/60' : 'bg-white/15 border-white/30'}`}>
        👟
        {slot.sai && (
          <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3.5 h-3.5 flex items-center
            justify-center text-[8px] font-bold text-white leading-none">↓</span>
        )}
      </div>
      <span className="text-[9px] text-white font-semibold text-center leading-tight truncate w-full px-px">
        {nome}
      </span>
      <span className={`text-[7px] font-bold px-1 py-px rounded border ${COR[slot.pos]}`}>
        {slot.pos}
      </span>
    </div>
  )
}

// Metade do campo (time) — sem flex-wrap nas linhas
function MetadeCampo({ title, pts, rows, isTop, compact = false }: {
  title: string; pts: number; rows: Slot[][]; isTop: boolean; compact?: boolean
}) {
  const linhas = isTop ? rows : [...rows].reverse()
  const gap    = compact ? 'gap-1' : 'gap-2'
  const rowGap = compact ? 'gap-0.5' : 'gap-1'
  const py     = compact ? 'py-1.5' : 'py-2.5'

  return (
    <div className={`flex flex-col ${gap} ${py} px-1`}>
      {isTop && (
        <div className="text-center">
          <span className={`text-white font-bold ${compact ? 'text-[10px]' : 'text-sm'}`}>{title}</span>
          <span className={`ml-1 text-yellow-300 font-semibold ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
            {pts}p
          </span>
        </div>
      )}
      {linhas.map((row, i) => (
        <div key={i} className={`flex justify-center ${rowGap}`}>
          {row.map((slot, j) => <PlayerPin key={j} slot={slot} compact={compact} />)}
        </div>
      ))}
      {!isTop && (
        <div className="text-center">
          <span className={`text-white font-bold ${compact ? 'text-[10px]' : 'text-sm'}`}>{title}</span>
          <span className={`ml-1 text-yellow-300 font-semibold ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
            {pts}p
          </span>
        </div>
      )}
    </div>
  )
}

// Campo completo (ambos os times)
function Campo({
  label, nA, nB, ptsA, ptsB, rowsA, rowsB,
}: {
  label: string; nA: string; nB: string; ptsA: number; ptsB: number;
  rowsA: Slot[][]; rowsB: Slot[][]
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 shadow-xl"
      style={{ background: 'linear-gradient(180deg,#1a5c0a 0%,#2d7a0e 47%,#2d7a0e 53%,#1a5c0a 100%)' }}>

      {/* Header do campo */}
      <div className="text-center py-1 bg-black/25 border-b border-white/10">
        <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{label}</span>
      </div>

      {/* Decorações do campo */}
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute left-1 right-1 top-1/2 border-t border-white/20" />
          <div className="absolute left-1/2 top-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 border border-white/12 rounded-full" />
          <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-white/25 rounded-full" />
        </div>

        <div className="relative flex flex-col divide-y divide-white/20">
          <MetadeCampo title={nA} pts={ptsA} rows={rowsA} isTop={true}  compact />
          <MetadeCampo title={nB} pts={ptsB} rows={rowsB} isTop={false} compact />
        </div>
      </div>
    </div>
  )
}

// Painel de substituições compacto
function PainelSubstituicoes({ paresA, paresB, nomeA, nomeB }: {
  paresA: SubPar[]; paresB: SubPar[]; nomeA: string; nomeB: string
}) {
  const total = paresA.length + paresB.length
  if (!total) return null
  return (
    <div className="mt-3 bg-white/5 border border-white/8 rounded-xl p-3">
      <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold text-center mb-2">
        🔄 {total} substituições no intervalo
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[{ pares: paresA, nome: nomeA }, { pares: paresB, nome: nomeB }].map(({ pares, nome }) => (
          <div key={nome}>
            <p className="text-yellow-300 text-[10px] font-bold mb-1">
              {nome} <span className="text-white/30 font-normal">({pares.length})</span>
            </p>
            <div className="flex flex-col gap-px">
              {pares.map((p, i) => (
                <div key={i} className="flex items-center gap-1 py-px border-b border-white/4 last:border-0">
                  <span className="text-green-400 text-[9px] shrink-0">↑</span>
                  <span className="text-white text-[9px] font-semibold truncate flex-1">
                    {p.entrando.nome.split(' ')[0]}
                  </span>
                  <span className="text-white/25 text-[9px]">↓</span>
                  <span className="text-white/40 text-[9px] truncate w-14">
                    {p.saindo.nome.split(' ')[0]}
                  </span>
                  <span className={`text-[6px] font-bold px-0.5 rounded border shrink-0 ${COR[p.saindoPos]}`}>
                    {p.saindoPos}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Equilíbrio de habilidades
function BalancoHabilidades({ skillsA, skillsB, nomeA, nomeB }: {
  skillsA: Record<AttrKey, number>; skillsB: Record<AttrKey, number>
  nomeA: string; nomeB: string
}) {
  return (
    <div className="mt-3 bg-white/5 border border-white/8 rounded-xl p-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Equilíbrio</p>
        <div className="flex gap-3 text-[10px]">
          <span className="text-yellow-300 font-bold">{nomeA}</span>
          <span className="text-blue-300 font-bold">{nomeB}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {ATTRS.map(k => {
          const mA = skillsA[k], mB = skillsB[k], total = mA + mB || 1
          const diff = Math.abs(mA - mB)
          const winner = mA > mB ? 'A' : mA < mB ? 'B' : null
          return (
            <div key={k} className="flex items-center gap-2">
              <span className="text-white/40 text-[10px] w-11 shrink-0">{ATTR_LABEL[k]}</span>
              <span className={`text-[10px] w-6 text-right shrink-0 tabular-nums
                ${winner === 'A' ? 'text-yellow-300 font-bold' : 'text-white/30'}`}>
                {mA.toFixed(1)}
              </span>
              <div className="flex-1 flex h-2 rounded-full overflow-hidden gap-px">
                <div className={`rounded-l-full ${diff > 1.5 ? 'bg-yellow-400/60' : 'bg-yellow-400/30'}`}
                  style={{ flex: mA / total }} />
                <div className={`rounded-r-full ${diff > 1.5 ? 'bg-blue-400/60' : 'bg-blue-400/30'}`}
                  style={{ flex: mB / total }} />
              </div>
              <span className={`text-[10px] w-6 shrink-0 tabular-nums
                ${winner === 'B' ? 'text-blue-300 font-bold' : 'text-white/30'}`}>
                {mB.toFixed(1)}
              </span>
              {diff > 1.5 && <span className="text-orange-400 text-[9px]">!</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Exports para uso externo (rodada page) ──────────────────────────────────

export type SimulacaoResult = ReturnType<typeof simular>
export type { Pos, PosMap, SubPar, Slot }
export { simular, buildRows, build2ndHalfRows, COR, Campo }

// ─── Export principal ─────────────────────────────────────────────────────────

export default function SimuladorCampo({
  jogadores, nomeTimeA, nomeTimeB, onFechar, inline = false, onResultado,
}: {
  jogadores: Atleta[]
  nomeTimeA: string
  nomeTimeB: string
  onFechar?: () => void
  inline?: boolean
  onResultado?: (r: SimulacaoResult) => void
}) {
  const [r, setR]         = useState<SimulacaoResult>(() => simularOtimizado(jogadores))
  const [prevR, setPrevR] = useState<SimulacaoResult | null>(null)

  // Notifica o pai sempre que o resultado mudar (sorteio ou mount)
  useEffect(() => { onResultado?.(r) }, [r]) // eslint-disable-line react-hooks/exhaustive-deps

  if (jogadores.length === 0) return null

  const nA = nomeTimeA || 'Time A'
  const nB = nomeTimeB || 'Time B'

  const saindoAIds = new Set(r.paresA.map(p => p.saindo.id))
  const saindoBIds = new Set(r.paresB.map(p => p.saindo.id))
  const rows1A = buildRows(r.tA, r.posMap, saindoAIds)
  const rows1B = buildRows(r.tB, r.posMap, saindoBIds)
  const rows2A = build2ndHalfRows(r.tA, r.paresA, r.posMap)
  const rows2B = build2ndHalfRows(r.tB, r.paresB, r.posMap)
  const diffPts  = Math.abs(r.ptsA - r.ptsB)
  const diffIdade = (r.idadeA != null && r.idadeB != null)
    ? Math.abs(r.idadeA - r.idadeB)
    : null
  const numDiffs = prevR ? contarDiferencas(prevR, r) : null

  function novoSorteio() {
    const novo = simularOtimizado(jogadores, 50, r, 4)
    setPrevR(r)
    setR(novo)
  }

  const sorteioBtn = (
    <button
      onClick={novoSorteio}
      className="text-xs bg-white/8 hover:bg-white/15 border border-white/15 text-white/60
        hover:text-white px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
    >
      🔄 Novo sorteio
    </button>
  )

  // ── Modo inline: apenas 1° tempo, sem overlay ─────────────────────────────
  if (inline) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-2">
            <div className="bg-white/5 rounded-lg px-2.5 py-1.5 text-center">
              <span className="block text-[10px] text-white/40">Titulares</span>
              <span className="block text-sm font-bold text-white">{r.tA.length} × {r.tB.length}</span>
            </div>
            <div className={`rounded-lg px-2.5 py-1.5 text-center ${diffPts <= 15 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
              <span className={`block text-[10px] ${diffPts <= 15 ? 'text-green-400/70' : 'text-yellow-400/70'}`}>Dif. pts</span>
              <span className={`block text-sm font-bold ${diffPts <= 15 ? 'text-green-300' : 'text-yellow-300'}`}>{diffPts}</span>
            </div>
            {diffIdade != null && (
              <div className={`rounded-lg px-2.5 py-1.5 text-center ${diffIdade <= 2 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                <span className={`block text-[10px] ${diffIdade <= 2 ? 'text-green-400/70' : 'text-yellow-400/70'}`}>Dif. idade</span>
                <span className={`block text-sm font-bold ${diffIdade <= 2 ? 'text-green-300' : 'text-yellow-300'}`}>{diffIdade.toFixed(1)}a</span>
              </div>
            )}
          </div>
          {sorteioBtn}
        </div>
        <Campo label="1° Tempo" nA={nA} nB={nB} ptsA={r.ptsA} ptsB={r.ptsB} rowsA={rows1A} rowsB={rows1B} />
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {(Object.keys(COR) as Pos[]).map(pos => (
            <span key={pos} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${COR[pos]}`}>{pos}</span>
          ))}
        </div>
      </div>
    )
  }

  // ── Modo modal: overlay com 1° e 2° tempo lado a lado ────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-[400]
        p-3 pt-4 overflow-y-auto"
      onClick={onFechar}
    >
      <div className="w-full max-w-lg pb-8" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-yellow-300 font-bold text-base">🔀 Simulação de Times</h2>
          <div className="flex items-center gap-2">
            {sorteioBtn}
            <button onClick={onFechar}
              className="text-white/40 hover:text-white text-xl cursor-pointer border-0 bg-transparent px-1 leading-none">
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Campo label="1° Tempo" nA={nA} nB={nB} ptsA={r.ptsA} ptsB={r.ptsB} rowsA={rows1A} rowsB={rows1B} />
          <Campo label="2° Tempo" nA={nA} nB={nB} ptsA={r.ptsA} ptsB={r.ptsB} rowsA={rows2A} rowsB={rows2B} />
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {(Object.keys(COR) as Pos[]).map(pos => (
            <span key={pos} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${COR[pos]}`}>{pos}</span>
          ))}
          <span className="text-[8px] text-red-300 border border-red-500/30 bg-red-500/10 rounded px-1.5 py-0.5">↓ sai</span>
          <span className="text-[8px] text-green-300 border border-green-500/30 bg-green-500/10 rounded px-1.5 py-0.5">↑ entra</span>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          <div className="bg-white/5 rounded-lg py-2">
            <span className="block text-[10px] text-white/40">Titulares</span>
            <span className="block text-sm font-bold text-white">{r.tA.length} × {r.tB.length}</span>
          </div>
          <div className={`rounded-lg py-2 ${diffPts <= 15 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            <span className={`block text-[10px] ${diffPts <= 15 ? 'text-green-400/70' : 'text-yellow-400/70'}`}>Dif. pts</span>
            <span className={`block text-sm font-bold ${diffPts <= 15 ? 'text-green-300' : 'text-yellow-300'}`}>{diffPts}</span>
          </div>
          <div className={`rounded-lg py-2 ${diffIdade == null ? 'bg-white/5' : diffIdade <= 2 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            <span className={`block text-[10px] ${diffIdade == null ? 'text-white/40' : diffIdade <= 2 ? 'text-green-400/70' : 'text-yellow-400/70'}`}>Dif. idade</span>
            <span className={`block text-sm font-bold ${diffIdade == null ? 'text-white/30' : diffIdade <= 2 ? 'text-green-300' : 'text-yellow-300'}`}>
              {diffIdade != null ? `${diffIdade.toFixed(1)}a` : '—'}
            </span>
          </div>
          <div className={`rounded-lg py-2 ${numDiffs == null ? 'bg-white/5' : numDiffs >= 4 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            <span className={`block text-[10px] ${numDiffs == null ? 'text-white/40' : numDiffs >= 4 ? 'text-green-400/70' : 'text-yellow-400/70'}`}>Variação</span>
            <span className={`block text-sm font-bold ${numDiffs == null ? 'text-white/30' : numDiffs >= 4 ? 'text-green-300' : 'text-yellow-300'}`}>
              {numDiffs != null ? `${numDiffs} troc.` : '1° sim'}
            </span>
          </div>
        </div>

        <BalancoHabilidades skillsA={r.skillsA} skillsB={r.skillsB} nomeA={nA} nomeB={nB} />
        <PainelSubstituicoes paresA={r.paresA} paresB={r.paresB} nomeA={nA} nomeB={nB} />

        <p className="text-center text-[9px] text-white/15 mt-3">
          2 ZAG · 2 LAT · 2 VOL · 2 MEI · 2 ATA · 1 CA · top 22 titulares · todos os demais no 2° tempo
        </p>
      </div>
    </div>
  )
}
