'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Atleta } from '@/types'

export async function listarRanking(): Promise<ActionResult<Atleta[]>> {
  const { data, error } = await supabase
    .from('jogadores')
    .select('*')
    .order('pontuacao_atual', { ascending: false })
  return { data: data ?? [], error: error?.message ?? null }
}

export async function cadastrar(form: {
  nome: string
  telefone: string
  pontuacao_inicial: number
}): Promise<ActionResult> {
  const { data: dup } = await supabase
    .from('jogadores')
    .select('id')
    .eq('nome', form.nome)
    .eq('telefone', form.telefone)
    .maybeSingle()

  if (dup) return { error: 'Jogador já cadastrado com este nome e telefone.' }

  const { error } = await supabase.from('jogadores').insert({
    ...form,
    pontuacao_atual: form.pontuacao_inicial,
  })

  if (!error) revalidatePath('/cadastro')
  return { error: error?.message ?? null }
}

export async function editar(
  id: number,
  form: {
    nome: string
    telefone: string
    pontuacao_inicial: number
    visao_jogo?: number | null
    passe?: number | null
    preparo_fisico?: number | null
    drible?: number | null
    chute?: number | null
    desarme?: number | null
    idade?: number | null
    posicoes_preferidas?: string[]
  }
): Promise<ActionResult> {
  const { data: atual } = await supabase
    .from('jogadores')
    .select('pontuacao_inicial, pontuacao_atual')
    .eq('id', id)
    .single()

  if (!atual) return { error: 'Jogador não encontrado.' }

  const { data: dup } = await supabase
    .from('jogadores')
    .select('id')
    .eq('nome', form.nome)
    .eq('telefone', form.telefone)
    .neq('id', id)
    .maybeSingle()

  if (dup) return { error: 'Já existe outro jogador com este nome e telefone.' }

  const delta = form.pontuacao_inicial - atual.pontuacao_inicial

  const { error } = await supabase
    .from('jogadores')
    .update({
      nome: form.nome,
      telefone: form.telefone,
      pontuacao_inicial: form.pontuacao_inicial,
      pontuacao_atual: atual.pontuacao_atual + delta,
      visao_jogo: form.visao_jogo ?? null,
      passe: form.passe ?? null,
      preparo_fisico: form.preparo_fisico ?? null,
      drible: form.drible ?? null,
      chute: form.chute ?? null,
      desarme: form.desarme ?? null,
      idade: form.idade ?? null,
      posicoes_preferidas: form.posicoes_preferidas ?? [],
    })
    .eq('id', id)

  if (!error) revalidatePath('/cadastro')
  return { error: error?.message ?? null }
}

export async function excluir(id: number): Promise<ActionResult> {
  await supabase.from('presencas_rodada').delete().eq('atleta_id', id).eq('tipo_atleta', 'Linha')
  const { error } = await supabase.from('jogadores').delete().eq('id', id)
  if (!error) revalidatePath('/cadastro')
  return { error: error?.message ?? null }
}
