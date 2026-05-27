import { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import './Dashboard.css'

const medalha = (pos) => {
  if (pos === 1) return '🥇'
  if (pos === 2) return '🥈'
  if (pos === 3) return '🥉'
  return pos
}

function TabelaRanking({ titulo, icone, atletas }) {
  return (
    <div className="ranking-card">
      <div className="ranking-card-header">
        <span className="ranking-icone">{icone}</span>
        <h2>{titulo}</h2>
      </div>
      <table className="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Atleta</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {atletas.map((a, i) => (
            <tr key={a.id} className={i < 3 ? 'top-tres' : ''}>
              <td className="pos">{medalha(i + 1)}</td>
              <td className="nome">{a.nome}</td>
              <td className="pts">
                <span className="badge-pts">{a.pontuacaoAtual}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Dashboard() {
  const { rankingJogadores, rankingGoleiros, loading, erro, carregarRankings } = useApp()

  useEffect(() => { carregarRankings() }, [carregarRankings])

  if (loading) return (
    <div className="estado-central">
      <div className="bola-loading">⚽</div>
      <p>Carregando ranking...</p>
    </div>
  )

  if (erro) return (
    <div className="estado-central erro">
      <span>⚠️</span>
      <p>{erro}</p>
      <button className="btn-primario" onClick={carregarRankings}>Tentar novamente</button>
    </div>
  )

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <h1>🏟️ Campeonato do Grupo</h1>
        <p>Classificação atualizada · Temporada 2025/26</p>
      </div>

      <div className="dashboard-grid">
        <TabelaRanking
          titulo="Jogadores de Linha"
          icone="👟"
          atletas={rankingJogadores}
        />
        <TabelaRanking
          titulo="Goleiros"
          icone="🧤"
          atletas={rankingGoleiros}
        />
      </div>

      <div className="dashboard-footer">
        <button className="btn-atualizar" onClick={carregarRankings}>↺ Atualizar ranking</button>
      </div>
    </div>
  )
}
