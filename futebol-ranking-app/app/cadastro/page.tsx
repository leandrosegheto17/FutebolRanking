'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import ModalConfirmar from '@/components/ModalConfirmar'
import * as jogadoresActions from '@/actions/jogadores'
import * as goleirosActions from '@/actions/goleiros'
import type { Atleta } from '@/types'

const FORM_VAZIO = { nome: '', data_nascimento: '', telefone: '', pontuacao_inicial: 0 }

type Tipo = 'Linha' | 'Goleiro'

function ModalEditar({ atleta, tipo, onSalvar, onFechar }: {
  atleta: Atleta; tipo: Tipo; onSalvar: () => void; onFechar: () => void
}) {
  const [form, setForm] = useState({
    nome: atleta.nome,
    data_nascimento: atleta.data_nascimento ?? '2000-01-01',
    telefone: atleta.telefone ?? '',
    pontuacao_inicial: atleta.pontuacao_inicial,
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

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={onFechar}>
      <div className="bg-card-bg border border-dourado/25 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-dourado mb-5">✏️ Editar Atleta</h2>
        {erro && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 mb-4">{erro}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {(['nome', 'data_nascimento', 'telefone'] as const).map((campo) => (
            <label key={campo} className="flex flex-col gap-1">
              <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold">
                {campo === 'nome' ? 'Nome' : campo === 'data_nascimento' ? 'Data de Nascimento' : 'Telefone'}
              </span>
              <input
                type={campo === 'data_nascimento' ? 'date' : 'text'}
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
          <div className="flex gap-3 mt-2 flex-col sm:flex-row-reverse">
            <button type="submit" disabled={isPending}
              className="flex-1 bg-verde-campo hover:bg-verde-medio disabled:opacity-60 border border-dourado text-dourado font-bold py-2.5 rounded-lg transition-colors cursor-pointer">
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={onFechar}
              className="flex-1 bg-transparent border border-white/12 text-verde-claro hover:bg-white/5 font-semibold py-2.5 rounded-lg transition-colors cursor-pointer">
              Cancelar
            </button>
          </div>
        </form>
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
        { name: 'nome',             label: 'Nome completo *',       type: 'text',   ph: 'Ex: Cristiano Ronaldo' },
        { name: 'data_nascimento',  label: 'Data de Nascimento *',  type: 'date',   ph: '' },
        { name: 'telefone',         label: 'Telefone *',            type: 'text',   ph: 'Ex: 11999998888' },
      ].map(({ name, label, type, ph }) => (
        <label key={name} className="flex flex-col gap-1">
          <span className="text-verde-claro text-xs uppercase tracking-wide font-semibold">{label}</span>
          <input
            type={type} placeholder={ph} required
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
