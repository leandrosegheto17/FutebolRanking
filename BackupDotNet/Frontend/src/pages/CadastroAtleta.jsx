import { useState, useEffect, useCallback } from 'react'
import { jogadoresService, goleirosService } from '../services/api'
import './CadastroAtleta.css'

const FORM_VAZIO = { nome: '', dataNascimento: '', telefone: '', pontuacaoInicial: 0 }

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
      const svc = tipo === 'Linha' ? jogadoresService : goleirosService
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

export default function CadastroAtleta() {
  const [tipo, setTipo] = useState('Linha')
  const [form, setForm] = useState(FORM_VAZIO)
  const [status, setStatus] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const [atletas, setAtletas] = useState([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)

  const carregarAtletas = useCallback(async () => {
    setLoadingLista(true)
    try {
      const svc = tipo === 'Linha' ? jogadoresService : goleirosService
      const { data } = await svc.ranking()
      setAtletas(data)
    } finally {
      setLoadingLista(false)
    }
  }, [tipo])

  useEffect(() => { carregarAtletas() }, [carregarAtletas])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: name === 'pontuacaoInicial' ? Number(value) : value }))
  }

  const handleTipo = (novoTipo) => {
    setTipo(novoTipo)
    setForm(FORM_VAZIO)
    setStatus(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setStatus(null)
    try {
      const svc = tipo === 'Linha' ? jogadoresService : goleirosService
      await svc.cadastrar(form)
      setStatus({ tipo: 'sucesso', msg: `"${form.nome}" cadastrado com sucesso!` })
      setForm(FORM_VAZIO)
      carregarAtletas()
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao cadastrar. Tente novamente.'
      setStatus({ tipo: 'erro', msg })
    } finally {
      setEnviando(false)
    }
  }

  const handleExcluir = async () => {
    const svc = tipo === 'Linha' ? jogadoresService : goleirosService
    try {
      await svc.excluir(excluindo.id)
      setExcluindo(null)
      carregarAtletas()
    } catch {
      setExcluindo(null)
    }
  }

  return (
    <div className="cadastro-page">
      <div className="cadastro-card">
        <div className="cadastro-header">
          <h1>➕ Cadastro de Atleta</h1>
          <p>Adicione um novo jogador ou goleiro ao campeonato</p>
        </div>

        <div className="tipo-toggle">
          <button className={`toggle-btn ${tipo === 'Linha' ? 'ativo' : ''}`} onClick={() => handleTipo('Linha')} type="button">
            👟 Jogador de Linha
          </button>
          <button className={`toggle-btn ${tipo === 'Goleiro' ? 'ativo' : ''}`} onClick={() => handleTipo('Goleiro')} type="button">
            🧤 Goleiro
          </button>
        </div>

        {status && (
          <div className={`alerta alerta-${status.tipo}`}>
            {status.tipo === 'sucesso' ? '✅' : '❌'} {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cadastro-form">
          <div className="campo">
            <label>Nome completo *</label>
            <input name="nome" value={form.nome} onChange={handleChange} placeholder="Ex: Cristiano Ronaldo" required />
          </div>
          <div className="campo">
            <label>Data de Nascimento *</label>
            <input type="date" name="dataNascimento" value={form.dataNascimento} onChange={handleChange} required />
          </div>
          <div className="campo">
            <label>Telefone *</label>
            <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="Ex: 11999998888" required />
          </div>
          <div className="campo">
            <label>Pontuação Inicial <span className="opcional">(opcional)</span></label>
            <input type="number" name="pontuacaoInicial" value={form.pontuacaoInicial} onChange={handleChange} min={0} />
          </div>
          <button type="submit" className="btn-primario btn-submit" disabled={enviando}>
            {enviando ? '⏳ Cadastrando...' : `⚽ Cadastrar ${tipo === 'Linha' ? 'Jogador' : 'Goleiro'}`}
          </button>
        </form>

        <div className="lista-section">
          <h3 className="lista-titulo">
            {tipo === 'Linha' ? '👟 Jogadores cadastrados' : '🧤 Goleiros cadastrados'}
          </h3>

          {loadingLista ? (
            <p className="lista-carregando">Carregando...</p>
          ) : atletas.length === 0 ? (
            <p className="lista-vazia">Nenhum atleta cadastrado.</p>
          ) : (
            <ul className="lista-atletas">
              {atletas.map((a, i) => (
                <li key={a.id} className="atleta-item">
                  <span className="atleta-pos">{i + 1}</span>
                  <span className="atleta-nome">{a.nome}</span>
                  <span className="atleta-pts">{a.pontuacaoAtual} pts</span>
                  <div className="atleta-acoes">
                    <button className="btn-editar" onClick={() => setEditando(a)} title="Editar">✏️</button>
                    <button className="btn-excluir" onClick={() => setExcluindo(a)} title="Excluir">🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editando && (
        <ModalEditar
          atleta={editando}
          tipo={tipo}
          onSalvar={() => { setEditando(null); carregarAtletas() }}
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
