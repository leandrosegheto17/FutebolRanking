'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Formacao, PresencaInput, PresencaRodada, RodadaResumo, StatusPresenca, Substituicao } from '@/types'

function calcularPontos(status: 'presente' | 'ausente' | 'lesionado', cartaoVermelho: boolean): number {
  if (status === 'ausente') return 0
  return cartaoVermelho ? 2 : 3
}

export async function registrar(
  dataRodada: string,
  presencas: PresencaInput[],
  nomeTimeA = '',
  nomeTimeB = '',
  formacao: Formacao = '4-3-3',
  substituicoes: Substituicao[] = []
): Promise<ActionResult> {
  const { data: existe } = await supabase
    .from('presencas_rodada')
    .select('id')
    .eq('data_rodada', dataRodada)
    .limit(1)

  if (existe && existe.length > 0)
    return { error: 'Já existe uma rodada registrada para esta data.' }

  const registros = presencas.map((p) => ({
    data_rodada: dataRodada,
    atleta_id: p.atletaId,
    tipo_atleta: p.tipoAtleta,
    presente: p.status !== 'ausente',
    status: p.status,
    gols_marcados: p.golsMarcados,
    cartao_amarelo: p.cartaoAmarelo,
    cartao_vermelho: p.cartaoVermelho,
    pontos_ganhos: calcularPontos(p.status, p.cartaoVermelho),
    posicao: p.posicao ?? null,
    time: p.time ?? null,
  }))

  const { error: insertError } = await supabase.from('presencas_rodada').insert(registros)
  if (insertError) return { error: insertError.message }

  // Salva metadados da rodada (upsert para tolerar retentativas)
  await supabase.from('rodadas').upsert(
    { data_rodada: dataRodada, nome_time_a: nomeTimeA, nome_time_b: nomeTimeB, formacao },
    { onConflict: 'data_rodada' }
  )

  // Salva substituições
  if (substituicoes.length > 0) {
    const subRegistros = substituicoes.map((s) => ({
      data_rodada: dataRodada,
      time: s.time,
      atleta_saindo_id: s.atletaSaindoId,
      tipo_atleta_saindo: s.tipoAtletaSaindo,
      atleta_entrando_id: s.atletaEntrandoId,
      tipo_atleta_entrando: s.tipoAtletaEntrando,
    }))
    await supabase.from('substituicoes_rodada').insert(subRegistros)
  }

  // Atualiza pontuacao_atual de cada atleta
  for (const r of registros) {
    if (r.pontos_ganhos === 0) continue
    const tabela = r.tipo_atleta === 'Linha' ? 'jogadores' : 'goleiros'
    const { data: atleta } = await supabase
      .from(tabela)
      .select('pontuacao_atual')
      .eq('id', r.atleta_id)
      .single()
    if (atleta) {
      await supabase
        .from(tabela)
        .update({ pontuacao_atual: atleta.pontuacao_atual + r.pontos_ganhos })
        .eq('id', r.atleta_id)
    }
  }

  revalidatePath('/')
  revalidatePath('/historico')
  return { error: null }
}

export async function listarHistorico(): Promise<ActionResult<RodadaResumo[]>> {
  const { data, error } = await supabase
    .from('presencas_rodada')
    .select('data_rodada, presente, status, gols_marcados')
    .order('data_rodada', { ascending: false })

  if (error) return { data: [], error: error.message }

  const mapa: Record<string, RodadaResumo> = {}
  for (const row of data ?? []) {
    if (!mapa[row.data_rodada])
      mapa[row.data_rodada] = { data_rodada: row.data_rodada, total_presentes: 0, total_gols: 0 }
    // Compatibilidade com registros antigos (status null) e novos
    const contou = row.status ? row.status !== 'ausente' : row.presente
    if (contou) mapa[row.data_rodada].total_presentes++
    mapa[row.data_rodada].total_gols += row.gols_marcados
  }

  return { data: Object.values(mapa), error: null }
}

export async function detalharRodada(dataRodada: string): Promise<ActionResult<PresencaRodada[]>> {
  const { data: presencas, error } = await supabase
    .from('presencas_rodada')
    .select('*')
    .eq('data_rodada', dataRodada)
    .order('tipo_atleta')

  if (error) return { data: [], error: error.message }

  const jogadorIds = presencas.filter((p) => p.tipo_atleta === 'Linha').map((p) => p.atleta_id)
  const goleiroIds = presencas.filter((p) => p.tipo_atleta === 'Goleiro').map((p) => p.atleta_id)

  const [rj, rg] = await Promise.all([
    jogadorIds.length > 0
      ? supabase.from('jogadores').select('id, nome').in('id', jogadorIds)
      : { data: [] },
    goleiroIds.length > 0
      ? supabase.from('goleiros').select('id, nome').in('id', goleiroIds)
      : { data: [] },
  ])

  const nomes: Record<string, string> = {}
  ;(rj.data ?? []).forEach((j: { id: number; nome: string }) => { nomes[`Linha-${j.id}`] = j.nome })
  ;(rg.data ?? []).forEach((g: { id: number; nome: string }) => { nomes[`Goleiro-${g.id}`] = g.nome })

  return {
    data: presencas.map((p) => ({
      ...p,
      nome: nomes[`${p.tipo_atleta}-${p.atleta_id}`] ?? 'Desconhecido',
    })),
    error: null,
  }
}

type DadosEdicao = {
  nomeTimeA: string
  nomeTimeB: string
  formacao: Formacao
  presencas: Array<{
    atleta_id: number
    tipo_atleta: 'Linha' | 'Goleiro'
    status: StatusPresenca
    gols_marcados: number
    cartao_amarelo: number
    cartao_vermelho: boolean
    posicao: string | null
    time: string | null
  }>
  substituicoes: Array<{
    time: 'A' | 'B'
    atleta_saindo_id: number
    tipo_atleta_saindo: 'Linha' | 'Goleiro'
    atleta_entrando_id: number
    tipo_atleta_entrando: 'Linha' | 'Goleiro'
  }>
}

export async function carregarRodadaParaEdicao(dataRodada: string): Promise<ActionResult<DadosEdicao>> {
  const [{ data: rodada }, { data: presencas }, { data: substituicoes }] = await Promise.all([
    supabase.from('rodadas').select('nome_time_a, nome_time_b, formacao').eq('data_rodada', dataRodada).single(),
    supabase.from('presencas_rodada').select('atleta_id, tipo_atleta, status, gols_marcados, cartao_amarelo, cartao_vermelho, posicao, time').eq('data_rodada', dataRodada),
    supabase.from('substituicoes_rodada').select('time, atleta_saindo_id, tipo_atleta_saindo, atleta_entrando_id, tipo_atleta_entrando').eq('data_rodada', dataRodada),
  ])

  return {
    data: {
      nomeTimeA: rodada?.nome_time_a ?? '',
      nomeTimeB: rodada?.nome_time_b ?? '',
      formacao: (rodada?.formacao as Formacao) ?? '4-3-3',
      presencas: (presencas ?? []).map(p => ({
        atleta_id: p.atleta_id,
        tipo_atleta: p.tipo_atleta as 'Linha' | 'Goleiro',
        status: ((p.status ?? 'presente') as StatusPresenca),
        gols_marcados: p.gols_marcados,
        cartao_amarelo: p.cartao_amarelo,
        cartao_vermelho: p.cartao_vermelho,
        posicao: p.posicao,
        time: p.time,
      })),
      substituicoes: (substituicoes ?? []).map(s => ({
        time: s.time as 'A' | 'B',
        atleta_saindo_id: s.atleta_saindo_id,
        tipo_atleta_saindo: s.tipo_atleta_saindo as 'Linha' | 'Goleiro',
        atleta_entrando_id: s.atleta_entrando_id,
        tipo_atleta_entrando: s.tipo_atleta_entrando as 'Linha' | 'Goleiro',
      })),
    },
    error: null,
  }
}

export async function presencasPorMes(
  ano: number,
  mes: number
): Promise<ActionResult<{ datas: string[]; porAtleta: Record<string, Record<string, number>> }>> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const inicio = `${ano}-${pad(mes)}-01`
  const fimAno = mes === 12 ? ano + 1 : ano
  const fimMes = mes === 12 ? 1 : mes + 1
  const fim = `${fimAno}-${pad(fimMes)}-01`

  const { data, error } = await supabase
    .from('presencas_rodada')
    .select('atleta_id, tipo_atleta, pontos_ganhos, data_rodada')
    .gte('data_rodada', inicio)
    .lt('data_rodada', fim)
    .order('data_rodada', { ascending: true })

  if (error) return { data: { datas: [], porAtleta: {} }, error: error.message }

  const datasSet = new Set<string>()
  const porAtleta: Record<string, Record<string, number>> = {}
  for (const row of data ?? []) {
    datasSet.add(row.data_rodada)
    const key = `${row.tipo_atleta}-${row.atleta_id}`
    if (!porAtleta[key]) porAtleta[key] = {}
    porAtleta[key][row.data_rodada] = row.pontos_ganhos
  }

  return { data: { datas: [...datasSet].sort(), porAtleta }, error: null }
}

export async function excluirRodada(dataRodada: string): Promise<ActionResult> {
  const { data: presencas } = await supabase
    .from('presencas_rodada')
    .select('atleta_id, tipo_atleta, pontos_ganhos')
    .eq('data_rodada', dataRodada)

  if (!presencas) return { error: 'Rodada não encontrada.' }

  for (const p of presencas) {
    if (p.pontos_ganhos === 0) continue
    const tabela = p.tipo_atleta === 'Linha' ? 'jogadores' : 'goleiros'
    const { data: atleta } = await supabase
      .from(tabela)
      .select('pontuacao_atual')
      .eq('id', p.atleta_id)
      .single()
    if (atleta) {
      await supabase
        .from(tabela)
        .update({ pontuacao_atual: Math.max(0, atleta.pontuacao_atual - p.pontos_ganhos) })
        .eq('id', p.atleta_id)
    }
  }

  await supabase.from('substituicoes_rodada').delete().eq('data_rodada', dataRodada)
  const { error } = await supabase.from('presencas_rodada').delete().eq('data_rodada', dataRodada)
  await supabase.from('rodadas').delete().eq('data_rodada', dataRodada)

  if (!error) {
    revalidatePath('/')
    revalidatePath('/historico')
  }
  return { error: error?.message ?? null }
}
