import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export const jogadoresService = {
  cadastrar: (data) => api.post('/jogadores', data),
  editar: (id, data) => api.put(`/jogadores/${id}`, data),
  excluir: (id) => api.delete(`/jogadores/${id}`),
  ranking: () => api.get('/jogadores/ranking'),
  rankingPdf: () => api.get('/jogadores/ranking-pdf'),
}

export const goleirosService = {
  cadastrar: (data) => api.post('/goleiros', data),
  editar: (id, data) => api.put(`/goleiros/${id}`, data),
  excluir: (id) => api.delete(`/goleiros/${id}`),
  ranking: () => api.get('/goleiros/ranking'),
}

export const rodadasService = {
  registrar: (data) => api.post('/rodadas', data),
}

export default api
