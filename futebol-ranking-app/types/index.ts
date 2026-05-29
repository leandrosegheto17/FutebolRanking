export type Atleta = {
  id: number
  nome: string
  data_nascimento: string
  telefone: string
  pontuacao_inicial: number
  pontuacao_atual: number
  criado_em?: string
}

export type PresencaRodada = {
  id?: number
  data_rodada: string
  atleta_id: number
  tipo_atleta: 'Linha' | 'Goleiro'
  presente: boolean
  gols_marcados: number
  cartao_amarelo: number
  cartao_vermelho: boolean
  pontos_ganhos: number
  nome?: string
}

export type PresencaInput = {
  atletaId: number
  tipoAtleta: 'Linha' | 'Goleiro'
  presente: boolean
  golsMarcados: number
  cartaoAmarelo: number
  cartaoVermelho: boolean
}

export type RodadaResumo = {
  data_rodada: string
  total_presentes: number
  total_gols: number
}

export type ActionResult<T = null> = {
  data?: T
  error: string | null
}
