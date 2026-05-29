import { useState, useEffect } from 'react'
import { jogadoresService, goleirosService, rodadasService } from '../services/api'
import './Rodada.css'

function LinhaAtleta({ atleta, tipo, dados, onChange }) {
  return (
    <tr className={!dados.presente ? 'ausente' : ''}>
      <td className="col-presenca">
        <input
          type="checkbox"
          checked={dados.presente}
          onChange={(e) => onChange(atleta.id, tipo, 'presente', e.target.checked)}
          className="check-presenca"
        />
      </td>
      <td className="col-nome">
        <span className="tipo-badge">{tipo === 'Linha' ? '👟' : '🧤'}</span>
        {atleta.nome}
      </td>
      <td className="col-gols">
        <input
          type="number"
          min={0}
          value={dados.golsMarcados}
          disabled={!dados.presente}
          onChange={(e) => onChange(atleta.id, tipo, 'golsMarcados', Number(e.target.value))}
          className="input-numero"
        />
      </td>
      <td className="col-cartoes">
        <button
          type="button"
          disabled={!dados.presente}
          className={`btn-cartao amarelo ${dados.cartaoAmarelo > 0 ? 'ativo' : ''}`}
          onClick={() => onChange(atleta.id, tipo, 'cartaoAmarelo', dados.cartaoAmarelo > 0 ? 0 : 1)}
        >
          🟨 {dados.cartaoAmarelo > 0 ? '1' : ''}
        </button>
        <button
          type="button"
          disabled={!dados.presente}
          className={`btn-cartao vermelho ${dados.cartaoVermelho ? 'ativo' : ''}`}
          onClick={() => onChange(atleta.id, tipo, 'cartaoVermelho', !dados.cartaoVermelho)}
        >
          🟥
        </button>
      </td>
      <td className="col-pts">
        <span className={`preview-pts ${!dados.presente ? 'zero' : dados.cartaoVermelho ? 'expulso' : 'ok'}`}>
          {!dados.presente ? 0 : dados.cartaoVermelho ? 2 : 3} pts
        </span>
      </td>
    </tr>
  )
}

export default function Rodada() {
  const [dataRodada, setDataRodada] = useState(() => new Date().toISOString().split('T')[0])
  const [atletas, setAtletas] = useState([])
  const [presencas, setPresencas] = useState({})
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    Promise.all([jogadoresService.ranking(), goleirosService.ranking()])
      .then(([rj, rg]) => {
        const jogadores = rj.data.map((a) => ({ ...a, tipoAtleta: 'Linha' }))
        const goleiros = rg.data.map((a) => ({ ...a, tipoAtleta: 'Goleiro' }))
        const todos = [...jogadores, ...goleiros]
        setAtletas(todos)
        const inicial = {}
        todos.forEach((a) => {
          inicial[`${a.tipoAtleta}-${a.id}`] = {
            presente: true, golsMarcados: 0, cartaoAmarelo: 0, cartaoVermelho: false,
          }
        })
        setPresencas(inicial)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (id, tipo, campo, valor) => {
    const chave = `${tipo}-${id}`
    setPresencas((prev) => ({ ...prev, [chave]: { ...prev[chave], [campo]: valor } }))
  }

  const handleSubmit = async () => {
    setEnviando(true)
    setStatus(null)
    try {
      const presencasList = atletas.map((a) => {
        const chave = `${a.tipoAtleta}-${a.id}`
        const d = presencas[chave]
        return {
          atletaId: a.id,
          tipoAtleta: a.tipoAtleta,
          presente: d.presente,
          golsMarcados: d.golsMarcados,
          cartaoAmarelo: d.cartaoAmarelo,
          cartaoVermelho: d.cartaoVermelho,
        }
      })
      await rodadasService.registrar({ dataRodada, presencas: presencasList })
      setStatus({ tipo: 'sucesso', msg: 'Rodada gravada com sucesso! Pontuações atualizadas.' })
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao gravar a rodada.'
      setStatus({ tipo: 'erro', msg })
    } finally {
      setEnviando(false)
    }
  }

  const presentes = Object.values(presencas).filter((p) => p.presente).length
  const jogadores = atletas.filter((a) => a.tipoAtleta === 'Linha')
  const goleiros  = atletas.filter((a) => a.tipoAtleta === 'Goleiro')

  if (loading) return (
    <div className="estado-central">
      <div className="bola-loading">⚽</div>
      <p>Carregando atletas...</p>
    </div>
  )

  return (
    <div className="rodada-page">
      <div className="rodada-header">
        <div>
          <h1>📋 Painel da Rodada</h1>
          <p>Registre presenças, gols e cartões do dia</p>
        </div>
        <div className="rodada-data">
          <label>Data da rodada</label>
          <input type="date" value={dataRodada} onChange={(e) => setDataRodada(e.target.value)} />
        </div>
      </div>

      <div className="rodada-stats">
        <div className="stat"><span>{presentes}</span><small>Presentes</small></div>
        <div className="stat"><span>{atletas.length - presentes}</span><small>Ausentes</small></div>
        <div className="stat"><span>{atletas.length}</span><small>Total</small></div>
      </div>

      {status && (
        <div className={`alerta alerta-${status.tipo}`}>
          {status.tipo === 'sucesso' ? '✅' : '❌'} {status.msg}
        </div>
      )}

      {[{ label: '👟 Jogadores de Linha', lista: jogadores, tipo: 'Linha' },
        { label: '🧤 Goleiros', lista: goleiros, tipo: 'Goleiro' }].map(({ label, lista, tipo }) => (
        <div key={tipo} className="grupo-atletas">
          <h2 className="grupo-titulo">{label}</h2>
          <div className="table-wrapper">
            <table className="rodada-table">
              <thead>
                <tr>
                  <th>✓</th>
                  <th>Atleta</th>
                  <th>⚽ Gols</th>
                  <th>Cartões</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((a) => (
                  <LinhaAtleta
                    key={a.id}
                    atleta={a}
                    tipo={tipo}
                    dados={presencas[`${tipo}-${a.id}`] || { presente: false, golsMarcados: 0, cartaoAmarelo: 0, cartaoVermelho: false }}
                    onChange={handleChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="rodada-actions">
        <button className="btn-gravar" onClick={handleSubmit} disabled={enviando}>
          {enviando ? '⏳ Gravando...' : '💾 Gravar e Fechar Rodada'}
        </button>
      </div>
    </div>
  )
}
