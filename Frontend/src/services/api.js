import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const jogadoresService = {
  cadastrar: (data) => api.post('/jogadores', data),
  ranking: () => api.get('/jogadores/ranking'),
}

export const goleirosService = {
  cadastrar: (data) => api.post('/goleiros', data),
  ranking: () => api.get('/goleiros/ranking'),
}

export const rodadasService = {
  registrar: (data) => api.post('/rodadas', data),
}

export default api
