'use client'

import { useState, useEffect } from 'react'
import type { Atleta } from '@/types'
import { listarRanking, atualizarAtributo } from '@/actions/jogadores'

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type AttrKey = 'visao_jogo' | 'passe' | 'preparo_fisico' | 'drible' | 'chute' | 'desarme'

const ATTRS: { key: AttrKey; label: string }[] = [
  { key: 'visao_jogo',     label: 'Visão de Jogo' },
  { key: 'passe',          label: 'Passe' },
  { key: 'preparo_fisico', label: 'Preparo Físico' },
  { key: 'drible',         label: 'Drible' },
  { key: 'chute',          label: 'Chute' },
  { key: 'desarme',        label: 'Desarme' },
]

type Par = {
  a: Atleta
  b: Atleta
  attr: { key: AttrKey; label: string }
}

type Resultado = 'A' | 'B' | 'igual'

type Feedback = {
  nomeA: string; nomeB: string; label: string
  rA: number; novoA: number
  rB: number; novoB: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortear(jogs: Atleta[], ultimo?: { aId: number; bId: number }): Par | null {
  // Só atributos com pelo menos 2 jogadores que tenham o valor preenchido
  const attrs = ATTRS.filter(({ key }) => jogs.filter(j => j[key] != null).length >= 2)
  if (!attrs.length) return null

  const attr = attrs[Math.floor(Math.random() * attrs.length)]
  const pool = jogs.filter(j => j[attr.key] != null)
  if (pool.length < 2) return null

  // Tenta 5 vezes para não repetir o mesmo par
  for (let t = 0; t < 5; t++) {
    const i = Math.floor(Math.random() * pool.length)
    let j = Math.floor(Math.random() * (pool.length - 1))
    if (j >= i) j++

    const a = pool[i], b = pool[j]
    if (t < 4 && ultimo) {
      const mesmoPar = (a.id === ultimo.aId && b.id === ultimo.bId)
                    || (a.id === ultimo.bId && b.id === ultimo.aId)
      if (mesmoPar) continue
    }
    return { a, b, attr }
  }

  return { a: pool[0], b: pool[1], attr }
}

// Ajuste gradual (±1 por comparação) sem nunca ultrapassar 1-10
function calcularAjuste(rA: number, rB: number, res: Resultado): [number, number] {
  if (res === 'A') {
    if (rA > rB)  return [rA, rB]                                   // já correto
    if (rA === rB) return [Math.min(10, rA + 1), rB]                // incrementa A
    return [Math.min(10, rA + 1), Math.max(1, rB - 1)]             // aproxima
  }
  if (res === 'B') {
    if (rB > rA)  return [rA, rB]                                   // já correto
    if (rA === rB) return [rA, Math.min(10, rB + 1)]                // incrementa B
    return [Math.max(1, rA - 1), Math.min(10, rB + 1)]             // aproxima
  }
  // igual
  if (rA === rB) return [rA, rB]
  const mid = Math.round((rA + rB) / 2)
  return [mid, mid]
}

// ─── Barra visual (10 segmentos, colorida) ────────────────────────────────────

function MiniBar({ valor }: { valor: number }) {
  return (
    <div className="flex gap-0.5 w-full">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`flex-1 h-1.5 rounded-full transition-all ${
            i < valor
              ? i < 3 ? 'bg-red-400' : i < 6 ? 'bg-yellow-400' : 'bg-green-400'
              : 'bg-white/12'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalibradorModal({
  onFechar,
  onAtualizado,
}: {
  onFechar: () => void
  onAtualizado: () => void
}) {
  const [jogadores, setJogadores] = useState<Atleta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [par, setPar] = useState<Par | null>(null)
  const [ultimo, setUltimo] = useState<{ aId: number; bId: number } | undefined>()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [count, setCount] = useState(0)
  const [houveMudanca, setHouveMudanca] = useState(false)

  // Carrega jogadores ao abrir
  useEffect(() => {
    listarRanking().then(({ data }) => {
      const jogs = data ?? []
      setJogadores(jogs)
      setPar(sortear(jogs))
      setCarregando(false)
    })
  }, [])

  function proximoPar(jogs: Atleta[], uid?: { aId: number; bId: number }) {
    setFeedback(null)
    setUltimo(uid)
    setPar(sortear(jogs, uid))
    setCount(c => c + 1)
  }

  async function responder(res: Resultado) {
    if (!par || salvando) return
    setSalvando(true)

    const { a, b, attr } = par
    const rA = a[attr.key] as number
    const rB = b[attr.key] as number
    const [novoA, novoB] = calcularAjuste(rA, rB, res)

    // Salva no banco só o que mudou
    const promises: Promise<unknown>[] = []
    if (novoA !== rA) promises.push(atualizarAtributo(a.id, attr.key, novoA))
    if (novoB !== rB) promises.push(atualizarAtributo(b.id, attr.key, novoB))
    if (promises.length) await Promise.all(promises)

    // Atualiza estado local dos jogadores
    const novosJogs = jogadores.map(j => {
      if (j.id === a.id) return { ...j, [attr.key]: novoA }
      if (j.id === b.id) return { ...j, [attr.key]: novoB }
      return j
    })
    setJogadores(novosJogs)
    if (promises.length) setHouveMudanca(true)

    setFeedback({ nomeA: a.nome, nomeB: b.nome, label: attr.label, rA, novoA, rB, novoB })
    setSalvando(false)

    // Avança automaticamente depois de 1.5 s
    setTimeout(() => proximoPar(novosJogs, { aId: a.id, bId: b.id }), 1500)
  }

  const primeiroNome = (nome: string) => nome.split(' ')[0]

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[400] p-4"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-sm bg-[#0d2b17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/7">
          <h2 className="text-yellow-300 font-bold">⚖️ Calibrador de Habilidades</h2>
          <button
            onClick={() => { if (houveMudanca) onAtualizado(); onFechar() }}
            className="text-white/40 hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          {carregando ? (
            <p className="text-center text-white/40 py-8">Carregando jogadores...</p>
          ) : !par ? (
            <p className="text-center text-white/40 py-8 text-sm">
              Preencha os atributos dos jogadores para poder calibrar.
            </p>
          ) : feedback ? (
            /* ── Estado de feedback ── */
            <div className="text-center py-4">
              <div className="text-2xl mb-2">✓</div>
              {(feedback.novoA !== feedback.rA || feedback.novoB !== feedback.rB) ? (
                <div className="space-y-1 text-sm">
                  {feedback.novoA !== feedback.rA && (
                    <p className="text-white/60">
                      <span className="font-semibold text-white">{primeiroNome(feedback.nomeA)}</span>
                      {' '}{feedback.label}:{' '}
                      <span className="text-white/40 line-through">{feedback.rA}</span>
                      {' → '}
                      <span className="text-yellow-300 font-bold">{feedback.novoA}</span>
                    </p>
                  )}
                  {feedback.novoB !== feedback.rB && (
                    <p className="text-white/60">
                      <span className="font-semibold text-white">{primeiroNome(feedback.nomeB)}</span>
                      {' '}{feedback.label}:{' '}
                      <span className="text-white/40 line-through">{feedback.rB}</span>
                      {' → '}
                      <span className="text-yellow-300 font-bold">{feedback.novoB}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-white/40 text-sm">Já estava correto — sem ajustes.</p>
              )}
              <p className="text-white/20 text-xs mt-3">Próxima comparação...</p>
            </div>
          ) : (
            /* ── Comparação ── */
            <>
              {/* Badge do atributo */}
              <div className="text-center mb-5">
                <span className="bg-yellow-400/12 text-yellow-300 text-xs font-bold px-4 py-1.5 rounded-full border border-yellow-400/25 tracking-wide">
                  {par.attr.label}
                </span>
              </div>

              {/* Cards dos jogadores */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-5">
                {/* Player A */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-lg mx-auto mb-2">
                    👤
                  </div>
                  <p className="text-white font-bold text-sm truncate">{primeiroNome(par.a.nome)}</p>
                  <p className="text-white/30 text-[10px] truncate mb-2">
                    {par.a.nome.split(' ').slice(1).join(' ') || '—'}
                  </p>
                  <p className="text-yellow-300 font-bold text-lg leading-none">
                    {par.a[par.attr.key] ?? '?'}
                  </p>
                  <p className="text-white/25 text-[9px] mb-1.5">/ 10</p>
                  <MiniBar valor={par.a[par.attr.key] as number ?? 0} />
                </div>

                <span className="text-white/20 font-bold text-sm">vs</span>

                {/* Player B */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-lg mx-auto mb-2">
                    👤
                  </div>
                  <p className="text-white font-bold text-sm truncate">{primeiroNome(par.b.nome)}</p>
                  <p className="text-white/30 text-[10px] truncate mb-2">
                    {par.b.nome.split(' ').slice(1).join(' ') || '—'}
                  </p>
                  <p className="text-yellow-300 font-bold text-lg leading-none">
                    {par.b[par.attr.key] ?? '?'}
                  </p>
                  <p className="text-white/25 text-[9px] mb-1.5">/ 10</p>
                  <MiniBar valor={par.b[par.attr.key] as number ?? 0} />
                </div>
              </div>

              <p className="text-white/35 text-xs text-center mb-3">
                Quem tem melhor {par.attr.label.toLowerCase()}?
              </p>

              {/* Botões de resposta */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => responder('A')}
                  disabled={salvando}
                  className="bg-yellow-400/8 hover:bg-yellow-400/20 border border-yellow-400/15 hover:border-yellow-400/50
                    text-yellow-300 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all disabled:opacity-40 text-center leading-tight"
                >
                  ◀{' '}{primeiroNome(par.a.nome)}
                </button>
                <button
                  onClick={() => responder('igual')}
                  disabled={salvando}
                  className="bg-white/5 hover:bg-green-400/15 border border-white/10 hover:border-green-400/40
                    text-white/50 hover:text-green-300 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all disabled:opacity-40"
                >
                  Iguais
                </button>
                <button
                  onClick={() => responder('B')}
                  disabled={salvando}
                  className="bg-blue-400/8 hover:bg-blue-400/20 border border-blue-400/15 hover:border-blue-400/50
                    text-blue-300 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all disabled:opacity-40 text-center leading-tight"
                >
                  {primeiroNome(par.b.nome)}{' '}▶
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 text-[11px] text-white/20">
          <span>Comparações realizadas: <span className="text-white/35 font-semibold">{count}</span></span>
          <button
            onClick={() => { if (houveMudanca) onAtualizado(); onFechar() }}
            className="text-white/30 hover:text-white/60 cursor-pointer bg-transparent border-0 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
