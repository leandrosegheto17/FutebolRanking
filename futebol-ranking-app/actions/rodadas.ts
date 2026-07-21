'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Formacao, PresencaInput, PresencaRodada, RodadaResumo, Substituicao } from '@/types'

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

export async function presencasPorMes(
  ano: number,
  mes: number
): Promise<ActionResult<{ pontos: Record<string, number>; totalRodadas: number }>> {
  const mesStr = `${ano}-${String(mes).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('presencas_rodada')
    .select('atleta_id, tipo_atleta, pontos_ganhos, data_rodada')
    .like('data_rodada', `${mesStr}-%`)

  if (error) return { data: { pontos: {}, totalRodadas: 0 }, error: error.message }

  const pontos: Record<string, number> = {}
  const datas = new Set<string>()
  for (const row of data ?? []) {
    const key = `${row.tipo_atleta}-${row.atleta_id}`
    pontos[key] = (pontos[key] ?? 0) + row.pontos_ganhos
    datas.add(row.data_rodada)
  }

  return { data: { pontos, totalRodadas: datas.size }, error: null }
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
