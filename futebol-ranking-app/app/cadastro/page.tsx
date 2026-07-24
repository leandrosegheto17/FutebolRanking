'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import ModalConfirmar from '@/components/ModalConfirmar'
import * as jogadoresActions from '@/actions/jogadores'
import * as goleirosActions from '@/actions/goleiros'
import type { Atleta } from '@/types'

const FORM_VAZIO = { nome: '', telefone: '', pontuacao_inicial: 0 }

type Tipo = 'Linha' | 'Goleiro'

const POSICOES_OPCOES = ['ZAG', 'LAT', 'VOL', 'MEI', 'ATA', 'CA'] as const

const ATRIBUTOS = [
  { key: 'visao_jogo',     label: 'Visão de Jogo' },
  { key: 'passe',          label: 'Passe' },
  { key: 'preparo_fisico', label: 'Preparo Físico' },
  { key: 'drible',         label: 'Drible' },
  { key: 'chute',          label: 'Chute' },
  { key: 'desarme',        label: 'Desarme' },
] as const

type AtributoKey = typeof ATRIBUTOS[number]['key']

function BaraAtributo({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-0.5 flex-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button key={n} type="button"
          onClick={() => onChange(valor === n ? null : n)}
          className={`flex-1 h-3 rounded-sm cursor-pointer transition-colors border-0
            ${(valor ?? 0) >= n
              ? n <= 3 ? 'bg-red-500' : n <= 6 ? 'bg-yellow-400' : 'bg-green-400'
              : 'bg-white/10 hover:bg-white/20'}`}
        />
      ))}
      <span className="text-xs font-bold text-dourado w-5 text-right shrink-0 ml-1.5">
        {valor ?? '—'}
      </span>
    </div>
  )
}

function ModalEditar({ atleta, tipo, onSalvar, onFechar }: {
  atleta: Atleta; tipo: Tipo; onSalvar: () => void; onFechar: () => void
}) {
  const [form, setForm] = useState({
    nome: atleta.nome,
    telefone: atleta.telefone ?? '',
    pontuacao_inicial: atleta.pontuacao_inicial,
    visao_jogo: (atleta.visao_jogo ?? null) as number | null,
    passe: (atleta.passe ?? null) as number | null,
    preparo_fisico: (atleta.preparo_fisico ?? null) as number | null,
    drible: (atleta.drible ?? null) as number | null,
    chute: (atleta.chute ?? null) as number | null,
    desarme: (atleta.desarme ?? null) as number | null,
    idade: (atleta.idade ?? null) as number | null,
    posicoes_preferidas: (atleta.posicoes_preferidas ?? []) as string[],
  })
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const action = tipo === 'Linha' ? jogadoresActions.editar : goleirosActions.editar
    startTransition(async () => {
      const result = await action(atleta.id, { ...form, pontuacao_inicial: Number(form.pontuacao_inicial) })
      if (result.error) setErro(result.error)
      else onSalvar()
    })
  }

  function addPosicao(pos: string) {
    if (form.posicoes_preferidas.includes(pos) || form.posicoes_preferidas.length >= 5) return
    setForm(f => ({ ...f, posicoes_preferidas: [...f.posicoes_preferidas, pos] }))
  }

  function removePosicao(idx: number) {
    setForm(f => ({ ...f, posicoes_preferidas: f.posicoes_preferidas.filter((_, i) => i !== idx) }))
  }

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={onFechar}>
      <div className="bg-card-bg border border-dourado/25 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 shrink-0">
          <h2 className="text-xl font-bold text-dourado">✏️ Editar Atleta</h2>
        </div>
        <div className="overflow-y-auto flex-1 px-6 sm:px-8">
          {erro && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 mb-4">{erro}</p>}
          <form id="form-editar" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
            {(['nome', 'telefone'] as const).map((campo) => (
              <label key={campo} className="flex flex-col gap-1">
                <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold">
                  {campo === 'nome' ? 'Nome' : 'Telefone'}
                </span>
                <input
                  type="text"
                  value={form[campo]}
                  onChange={(e) => setForm(f => ({ ...f, [campo]: e.target.value }))}
                  required
                  className="bg-black/25 border border-white/10 focus:border-dourado rounded-lg px-3 py-2.5 text-texto outline-none transition-colors"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold">Pontuação Inicial</span>
              <input
                type="number" min={0}
                value={form.pontuacao_inicial}
                onChange={(e) => setForm(f => ({ ...f, pontuacao_inicial: Number(e.target.value) }))}
                required
                className="bg-black/25 border border-white/10 focus:border-dourado rounded-lg px-3 py-2.5 text-texto outline-none transition-colors"
              />
            </label>

            {tipo === 'Linha' && (
              <>
                <div className="border-t border-white/7 pt-4">
                  <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold block mb-3">Atributos</span>
                  <div className="flex flex-col gap-2.5">
                    {ATRIBUTOS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-texto/60 w-28 shrink-0">{label}</span>
                        <BaraAtributo
                          valor={form[key as AtributoKey]}
                          onChange={(v) => setForm(f => ({ ...f, [key]: v }))}
                        />
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5 mt-1">
                      <span className="text-xs text-texto/60 w-28 shrink-0">Idade</span>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number" min={1} max={100}
                          value={form.idade ?? ''}
                          placeholder="—"
                          onChange={(e) => setForm(f => ({ ...f, idade: e.target.value ? Number(e.target.value) : null }))}
                          className="w-20 bg-black/30 border border-white/10 focus:border-dourado rounded px-2 py-1 text-sm text-texto outline-none text-center"
                        />
                        <span className="text-xs text-texto/30">anos (1–100)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/7 pt-4 pb-2">
                  <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold block mb-2">
                    Posições Preferidas{' '}
                    <span className="font-normal normal-case text-texto/30">({form.posicoes_preferidas.length}/5 por prioridade)</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {POSICOES_OPCOES.map(pos => {
                      const adicionado = form.posicoes_preferidas.includes(pos)
                      return (
                        <button key={pos} type="button"
                          disabled={adicionado || form.posicoes_preferidas.length >= 5}
                          onClick={() => addPosicao(pos)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-colors
                            ${adicionado
                              ? 'bg-dourado/10 border-dourado/40 text-dourado/40 cursor-not-allowed'
                              : 'border-white/15 text-texto/50 hover:border-dourado/60 hover:text-dourado'}`}>
                          {pos}
                        </button>
                      )
                    })}
                  </div>
                  {form.posicoes_preferidas.length === 0 ? (
                    <p className="text-texto/25 text-xs">Clique nas posições para adicionar em ordem de preferência</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {form.posicoes_preferidas.map((pos, idx) => (
                        <div key={`${pos}-${idx}`} className="flex items-center gap-1.5 bg-dourado/10 border border-dourado/30 rounded-lg px-2.5 py-1">
                          <span className="text-verde-claro text-[10px] font-semibold">{idx + 1}°</span>
                          <span className="text-dourado text-sm font-bold">{pos}</span>
                          <button type="button" onClick={() => removePosicao(idx)}
                            className="text-texto/30 hover:text-red-400 cursor-pointer text-xs leading-none border-0 bg-transparent ml-0.5">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </form>
        </div>
        <div className="px-6 sm:px-8 py-4 shrink-0 border-t border-white/7">
          <div className="flex gap-3 flex-col sm:flex-row-reverse">
            <button type="submit" form="form-editar" disabled={isPending}
              className="flex-1 bg-verde-campo hover:bg-verde-medio disabled:opacity-60 border border-dourado text-dourado font-bold py-2.5 rounded-lg transition-colors cursor-pointer">
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={onFechar}
              className="flex-1 bg-transparent border border-white/12 text-verde-claro hover:bg-white/5 font-semibold py-2.5 rounded-lg transition-colors cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CadastroForm({ tipo, onCadastrado }: { tipo: Tipo; onCadastrado?: () => void }) {
  const [form, setForm] = useState(FORM_VAZIO)
  const [status, setStatus] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    const action = tipo === 'Linha' ? jogadoresActions.cadastrar : goleirosActions.cadastrar
    startTransition(async () => {
      const result = await action({ ...form, pontuacao_inicial: Number(form.pontuacao_inicial) })
      if (result.error) {
        setStatus({ tipo: 'erro', msg: result.error })
      } else {
        setStatus({ tipo: 'sucesso', msg: `"${form.nome}" cadastrado com sucesso!` })
        setForm(FORM_VAZIO)
        onCadastrado?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {status && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          status.tipo === 'sucesso'
            ? 'bg-green-500/15 border border-green-500/30 text-green-400'
            : 'bg-red-500/15 border border-red-500/30 text-red-400'
        }`}>
          {status.tipo === 'sucesso' ? '✅' : '❌'} {status.msg}
        </div>
      )}
      {[
        { name: 'nome',     label: 'Nome completo *', ph: 'Ex: Cristiano Ronaldo' },
        { name: 'telefone', label: 'Telefone *',       ph: 'Ex: 11999998888' },
      ].map(({ name, label, ph }) => (
        <label key={name} className="flex flex-col gap-1">
          <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold">{label}</span>
          <input
            type="text" placeholder={ph} required
            value={form[name as keyof typeof form]}
            onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
            className="bg-black/25 border border-white/10 focus:border-dourado rounded-lg px-3 py-2.5 text-texto outline-none transition-colors placeholder:text-white/20"
          />
        </label>
      ))}
      <label className="flex flex-col gap-1">
        <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold">
          Pontuação Inicial <span className="text-verde-campo normal-case font-normal">(opcional)</span>
        </span>
        <input
          type="number" min={0}
          value={form.pontuacao_inicial}
          onChange={(e) => setForm(f => ({ ...f, pontuacao_inicial: Number(e.target.value) }))}
          className="bg-black/25 border border-white/10 focus:border-dourado rounded-lg px-3 py-2.5 text-texto outline-none transition-colors"
        />
      </label>
      <button type="submit" disabled={isPending}
        className="bg-verde-campo hover:bg-verde-medio disabled:opacity-60 border-0 text-dourado font-bold py-3 rounded-lg transition-colors cursor-pointer mt-1">
        {isPending ? '⏳ Cadastrando...' : `⚽ Cadastrar ${tipo === 'Linha' ? 'Jogador' : 'Goleiro'}`}
      </button>
    </form>
  )
}

const ATRIBUTOS_KEYS: AtributoKey[] = ['visao_jogo', 'passe', 'preparo_fisico', 'drible', 'chute', 'desarme']

function somaAtributos(a: Atleta): number {
  return ATRIBUTOS_KEYS.reduce((acc, k) => acc + (a[k] ?? 0), 0)
}

function atletaCompleto(a: Atleta): boolean {
  return ATRIBUTOS_KEYS.every(k => a[k] != null) &&
    a.idade != null &&
    (a.posicoes_preferidas?.length ?? 0) > 0
}

function ListaAtletas({ tipo, reload }: { tipo: Tipo; reload: number }) {
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Atleta | null>(null)
  const [excluindo, setExcluindo] = useState<Atleta | null>(null)
  const [isPending, startTransition] = useTransition()

  const carregar = useCallback(async () => {
    setLoading(true)
    const action = tipo === 'Linha' ? jogadoresActions.listarRanking : goleirosActions.listarRanking
    const { data } = await action()
    setAtletas(data ?? [])
    setLoading(false)
  }, [tipo])

  useEffect(() => { carregar() }, [carregar, reload])

  function handleExcluir() {
    if (!excluindo) return
    const action = tipo === 'Linha' ? jogadoresActions.excluir : goleirosActions.excluir
    startTransition(async () => {
      await action(excluindo.id)
      setExcluindo(null)
      carregar()
    })
  }

  return (
    <>
      <div className="mt-7 pt-6 border-t border-white/7">
        <h3 className="text-dourado text-xs uppercase tracking-wider font-bold mb-3">
          {tipo === 'Linha' ? '👟 Jogadores cadastrados' : '🧤 Goleiros cadastrados'}
        </h3>
        {loading ? (
          <p className="text-verde-claro text-sm text-center py-4">Carregando...</p>
        ) : atletas.length === 0 ? (
          <p className="text-verde-claro text-sm text-center py-4">Nenhum atleta cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {atletas.map((a, i) => (
              <li key={a.id} className="flex items-center gap-2 bg-black/15 border border-white/6 rounded-lg px-3 py-2 hover:bg-dourado/4 transition-colors">
                <span className="text-verde-claro text-xs w-5 text-center flex-shrink-0">{i + 1}</span>
                <span className="flex-1 font-medium text-sm truncate">{a.nome}</span>
                {tipo === 'Linha' && (
                  <>
                    <span className="text-xs text-texto/50 bg-white/5 border border-white/8 rounded-full px-2 py-0.5 flex-shrink-0 tabular-nums">
                      {somaAtributos(a)}<span className="text-texto/25">/60</span>
                    </span>
                    {atletaCompleto(a) && (
                      <span className="text-green-400 text-sm flex-shrink-0" title="Todos os atributos preenchidos">✓</span>
                    )}
                  </>
                )}
                <span className="text-dourado text-xs bg-dourado/10 border border-dourado/20 rounded-full px-2 py-0.5 flex-shrink-0">
                  {a.pontuacao_atual} pts
                </span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditando(a)}
                    className="text-sm bg-transparent border border-white/10 hover:border-dourado hover:bg-dourado/15 rounded px-1.5 py-0.5 transition-colors cursor-pointer">
                    ✏️
                  </button>
                  <button onClick={() => setExcluindo(a)}
                    className="text-sm bg-transparent border border-white/10 hover:border-red-500 hover:bg-red-500/15 rounded px-1.5 py-0.5 transition-colors cursor-pointer">
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <ModalEditar atleta={editando} tipo={tipo}
          onSalvar={() => { setEditando(null); carregar() }}
          onFechar={() => setEditando(null)}
        />
      )}
      {excluindo && (
        <ModalConfirmar nome={excluindo.nome}
          onConfirmar={handleExcluir}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </>
  )
}

export default function CadastroPage() {
  const [tipo, setTipo] = useState<Tipo>('Linha')
  const [reload, setReload] = useState(0)

  return (
    <ProtectedRoute>
      <div className="flex justify-center px-4 py-8">
        <div className="bg-card-bg border border-white/7 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-dourado mb-1">➕ Cadastro de Atleta</h1>
            <p className="text-verde-claro text-sm">Adicione um novo jogador ou goleiro ao campeonato</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-black/20 p-1 rounded-xl mb-6">
            {(['Linha', 'Goleiro'] as Tipo[]).map((t) => (
              <button key={t} onClick={() => setTipo(t)}
                className={`py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer border-0
                  ${tipo === t ? 'bg-verde-campo text-dourado shadow' : 'bg-transparent text-verde-claro hover:text-texto'}`}>
                {t === 'Linha' ? '👟 Jogador de Linha' : '🧤 Goleiro'}
              </button>
            ))}
          </div>

          <CadastroForm key={tipo} tipo={tipo} onCadastrado={() => setReload(r => r + 1)} />
          <ListaAtletas tipo={tipo} reload={reload} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
