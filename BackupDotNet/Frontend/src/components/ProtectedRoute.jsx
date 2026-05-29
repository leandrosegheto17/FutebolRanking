import { useState } from 'react'
import './ProtectedRoute.css'

const SENHA = 'admin123'
const SESSION_KEY = 'fr_autenticado'

export default function ProtectedRoute({ children }) {
  const [autenticado, setAutenticado] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  )
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)

  if (autenticado) return children

  function handleSubmit(e) {
    e.preventDefault()
    if (senha === SENHA) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAutenticado(true)
    } else {
      setErro(true)
      setSenha('')
    }
  }

  return (
    <div className="pr-overlay">
      <div className="pr-modal">
        <div className="pr-icone">🔒</div>
        <h2 className="pr-titulo">Área Restrita</h2>
        <p className="pr-subtitulo">Digite a senha para continuar</p>

        <form className="pr-form" onSubmit={handleSubmit}>
          <input
            className={`pr-input ${erro ? 'pr-input-erro' : ''}`}
            type="password"
            placeholder="Senha"
            value={senha}
            autoFocus
            onChange={(e) => { setSenha(e.target.value); setErro(false) }}
          />
          {erro && <p className="pr-erro">Senha incorreta. Tente novamente.</p>}
          <button className="pr-btn" type="submit">Entrar</button>
        </form>
      </div>
    </div>
  )
}
