import { useState } from 'react'
import { jogadoresService, goleirosService } from '../services/api'
import './CadastroAtleta.css'

const INICIAL = { nome: '', dataNascimento: '', telefone: '', pontuacaoInicial: 0 }

export default function CadastroAtleta() {
  const [tipo, setTipo] = useState('Linha')
  const [form, setForm] = useState(INICIAL)
  const [status, setStatus] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: name === 'pontuacaoInicial' ? Number(value) : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setStatus(null)
    try {
      const service = tipo === 'Linha' ? jogadoresService : goleirosService
      await service.cadastrar(form)
      setStatus({ tipo: 'sucesso', msg: `${tipo === 'Linha' ? 'Jogador' : 'Goleiro'} "${form.nome}" cadastrado com sucesso!` })
      setForm(INICIAL)
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao cadastrar. Tente novamente.'
      setStatus({ tipo: 'erro', msg })
    } finally {
      setEnviando(false)
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
          <button
            className={`toggle-btn ${tipo === 'Linha' ? 'ativo' : ''}`}
            onClick={() => setTipo('Linha')}
            type="button"
          >
            👟 Jogador de Linha
          </button>
          <button
            className={`toggle-btn ${tipo === 'Goleiro' ? 'ativo' : ''}`}
            onClick={() => setTipo('Goleiro')}
            type="button"
          >
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
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: Cristiano Ronaldo"
              required
            />
          </div>

          <div className="campo">
            <label>Data de Nascimento *</label>
            <input
              type="date"
              name="dataNascimento"
              value={form.dataNascimento}
              onChange={handleChange}
              required
            />
          </div>

          <div className="campo">
            <label>Telefone *</label>
            <input
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              placeholder="Ex: 11999998888"
              required
            />
          </div>

          <div className="campo">
            <label>Pontuação Inicial <span className="opcional">(opcional)</span></label>
            <input
              type="number"
              name="pontuacaoInicial"
              value={form.pontuacaoInicial}
              onChange={handleChange}
              min={0}
            />
          </div>

          <button type="submit" className="btn-primario btn-submit" disabled={enviando}>
            {enviando ? '⏳ Cadastrando...' : `⚽ Cadastrar ${tipo === 'Linha' ? 'Jogador' : 'Goleiro'}`}
          </button>
        </form>
      </div>
    </div>
  )
}
