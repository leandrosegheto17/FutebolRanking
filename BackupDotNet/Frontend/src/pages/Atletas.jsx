import { useState, useEffect, useCallback } from 'react'
import { jogadoresService, goleirosService } from '../services/api'
import './Atletas.css'

const TIPO_LINHA = 'Linha'
const TIPO_GOLEIRO = 'Goleiro'

function ModalEditar({ atleta, tipo, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: atleta.nome,
    dataNascimento: atleta.dataNascimento ?? '2000-01-01',
    telefone: atleta.telefone ?? '',
    pontuacaoInicial: atleta.pontuacaoInicial,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      const svc = tipo === TIPO_LINHA ? jogadoresService : goleirosService
      await svc.editar(atleta.id, {
        nome: form.nome,
        dataNascimento: form.dataNascimento,
        telefone: form.telefone,
        pontuacaoInicial: Number(form.pontuacaoInicial),
      })
      onSalvar()
    } catch (err) {
      setErro(err.response?.data?.mensagem || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-titulo">✏️ Editar Atleta</h2>

        {erro && <p className="modal-erro">{erro}</p>}

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="campo">
            <label>Nome</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)} required />
          </div>
          <div className="campo">
            <label>Data de Nascimento</label>
            <input type="date" value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} required />
          </div>
          <div className="campo">
            <label>Telefone</label>
            <input value={form.telefone} onChange={e => set('telefone', e.target.value)} required />
          </div>
          <div className="campo">
            <label>Pontuação Inicial</label>
            <input type="number" min={0} value={form.pontuacaoInicial} onChange={e => set('pontuacaoInicial', e.target.value)} required />
          </div>
          <div className="modal-acoes">
            <button type="button" className="btn-secundario" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalConfirmar({ nome, onConfirmar, onFechar }) {
  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-box modal-confirmar" onClick={e => e.stopPropagation()}>
        <div className="modal-icone-aviso">⚠️</div>
        <h2 className="modal-titulo">Excluir atleta?</h2>
        <p className="modal-texto">
          <strong>{nome}</strong> será removido junto com todo o histórico de presenças. Esta ação não pode ser desfeita.
        </p>
        <div className="modal-acoes">
          <button className="btn-secundario" onClick={onFechar}>Cancelar</button>
          <button className="btn-perigo" onClick={onConfirmar}>Excluir</button>
        </div>
      </div>
    </div>
  )
}

export default function Atletas() {
  const [tipo, setTipo] = useState(TIPO_LINHA)
  const [atletas, setAtletas] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const svc = tipo === TIPO_LINHA ? jogadoresService : goleirosService
      const { data } = await svc.ranking()
      setAtletas(data)
    } finally {
      setLoading(false)
    }
  }, [tipo])

  useEffect(() => { carregar() }, [carregar])

  const mostrarFeedback = (msg, sucesso = true) => {
    setFeedback({ msg, sucesso })
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleExcluir() {
    const svc = tipo === TIPO_LINHA ? jogadoresService : goleirosService
    try {
      await svc.excluir(excluindo.id)
      mostrarFeedback(`${excluindo.nome} excluído com sucesso.`)
      setExcluindo(null)
      carregar()
    } catch {
      mostrarFeedback('Erro ao excluir atleta.', false)
      setExcluindo(null)
    }
  }

  const filtrados = atletas.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="atletas-page">
      <div className="atletas-header">
        <div>
          <h1>👥 Gerenciar Atletas</h1>
          <p>Edite ou remova atletas cadastrados</p>
        </div>
      </div>

      <div className="atletas-controles">
        <div className="tipo-toggle">
          <button className={`toggle-btn ${tipo === TIPO_LINHA ? 'ativo' : ''}`} onClick={() => { setTipo(TIPO_LINHA); setBusca('') }}>
            👟 Jogadores de Linha
          </button>
          <button className={`toggle-btn ${tipo === TIPO_GOLEIRO ? 'ativo' : ''}`} onClick={() => { setTipo(TIPO_GOLEIRO); setBusca('') }}>
            🧤 Goleiros
          </button>
        </div>
        <input
          className="busca-input"
          type="text"
          placeholder="🔍 Buscar por nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {feedback && (
        <div className={`alerta ${feedback.sucesso ? 'alerta-sucesso' : 'alerta-erro'}`}>
          {feedback.sucesso ? '✅' : '❌'} {feedback.msg}
        </div>
      )}

      {loading ? (
        <div className="estado-central">
          <div className="bola-loading">⚽</div>
          <p>Carregando...</p>
        </div>
      ) : (
        <div className="atletas-lista">
          {filtrados.length === 0 ? (
            <p className="lista-vazia">Nenhum atleta encontrado.</p>
          ) : (
            filtrados.map((a, i) => (
              <div key={a.id} className="atleta-item">
                <div className="atleta-pos">{i + 1}</div>
                <div className="atleta-info">
                  <span className="atleta-nome">{a.nome}</span>
                  <span className="atleta-pts">{a.pontuacaoAtual} pts</span>
                </div>
                <div className="atleta-acoes">
                  <button className="btn-editar" onClick={() => setEditando(a)} title="Editar">✏️</button>
                  <button className="btn-excluir" onClick={() => setExcluindo(a)} title="Excluir">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {editando && (
        <ModalEditar
          atleta={editando}
          tipo={tipo}
          onSalvar={() => { setEditando(null); mostrarFeedback('Atleta atualizado com sucesso.'); carregar() }}
          onFechar={() => setEditando(null)}
        />
      )}

      {excluindo && (
        <ModalConfirmar
          nome={excluindo.nome}
          onConfirmar={handleExcluir}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </div>
  )
}
