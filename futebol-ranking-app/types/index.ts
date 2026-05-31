export type Atleta = {
  id: number
  nome: string
  data_nascimento: string
  telefone: string
  pontuacao_inicial: number
  pontuacao_atual: number
  criado_em?: string
}

export type StatusPresenca = 'presente' | 'ausente' | 'lesionado'
export type Posicao = 'DEF' | 'MEI' | 'ATA'
export type Formacao = '3-3-3' | '4-3-3' | '4-4-3'

export type PresencaRodada = {
  id?: number
  data_rodada: string
  atleta_id: number
  tipo_atleta: 'Linha' | 'Goleiro'
  presente: boolean
  status?: StatusPresenca
  gols_marcados: number
  cartao_amarelo: number
  cartao_vermelho: boolean
  pontos_ganhos: number
  posicao?: string | null
  time?: string | null
  nome?: string
}

export type PresencaInput = {
  atletaId: number
  tipoAtleta: 'Linha' | 'Goleiro'
  status: StatusPresenca
  golsMarcados: number
  cartaoAmarelo: number
  cartaoVermelho: boolean
  posicao?: Posicao
  time?: 'A' | 'B'
}

export type Substituicao = {
  time: 'A' | 'B'
  atletaSaindoId: number
  tipoAtletaSaindo: 'Linha' | 'Goleiro'
  atletaEntrandoId: number
  tipoAtletaEntrando: 'Linha' | 'Goleiro'
}

export type Rodada = {
  id?: number
  data_rodada: string
  nome_time_a: string
  nome_time_b: string
  formacao: Formacao
  criado_em?: string
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
