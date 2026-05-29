import { createContext, useContext, useState, useCallback } from 'react'
import { jogadoresService, goleirosService } from '../services/api'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [rankingJogadores, setRankingJogadores] = useState([])
  const [rankingGoleiros, setRankingGoleiros] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  const carregarRankings = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const [rj, rg] = await Promise.all([
        jogadoresService.ranking(),
        goleirosService.ranking(),
      ])
      setRankingJogadores(rj.data)
      setRankingGoleiros(rg.data)
    } catch {
      setErro('Erro ao carregar rankings. Verifique se a API está rodando.')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <AppContext.Provider value={{ rankingJogadores, rankingGoleiros, loading, erro, carregarRankings }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
