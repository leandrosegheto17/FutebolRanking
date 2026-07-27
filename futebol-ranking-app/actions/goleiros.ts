'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Atleta } from '@/types'

function calcIdade(dataNasc: string | null | undefined): number | null {
  if (!dataNasc) return null
  const nasc = new Date(dataNasc)
  const hoje = new Date()
  let anos = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--
  return anos
}

export async function listarRanking(): Promise<ActionResult<Atleta[]>> {
  const { data, error } = await supabase
    .from('goleiros')
    .select('*')
    .order('pontuacao_atual', { ascending: false })
  const atletas = (data ?? []).map(g => ({
    ...g,
    idade: g.data_nascimento ? calcIdade(g.data_nascimento) : (g.idade ?? null),
  }))
  return { data: atletas, error: error?.message ?? null }
}

export async function cadastrar(form: {
  nome: string
  telefone: string
  pontuacao_inicial: number
  data_nascimento?: string
}): Promise<ActionResult> {
  const { data: dup } = await supabase
    .from('goleiros')
    .select('id')
    .eq('nome', form.nome)
    .eq('telefone', form.telefone)
    .maybeSingle()

  if (dup) return { error: 'Goleiro já cadastrado com este nome e telefone.' }

  const { error } = await supabase.from('goleiros').insert({
    ...form,
    data_nascimento: form.data_nascimento || null,
    pontuacao_atual: form.pontuacao_inicial,
  })

  if (!error) revalidatePath('/cadastro')
  return { error: error?.message ?? null }
}

export async function editar(
  id: number,
  form: { nome: string; telefone: string; pontuacao_inicial: number; data_nascimento?: string | null }
): Promise<ActionResult> {
  const { data: atual } = await supabase
    .from('goleiros')
    .select('pontuacao_inicial, pontuacao_atual')
    .eq('id', id)
    .single()

  if (!atual) return { error: 'Goleiro não encontrado.' }

  const { data: dup } = await supabase
    .from('goleiros')
    .select('id')
    .eq('nome', form.nome)
    .eq('telefone', form.telefone)
    .neq('id', id)
    .maybeSingle()

  if (dup) return { error: 'Já existe outro goleiro com este nome e telefone.' }

  const delta = form.pontuacao_inicial - atual.pontuacao_inicial

  const { error } = await supabase
    .from('goleiros')
    .update({
      nome: form.nome,
      telefone: form.telefone,
      pontuacao_inicial: form.pontuacao_inicial,
      pontuacao_atual: atual.pontuacao_atual + delta,
      data_nascimento: form.data_nascimento ?? null,
    })
    .eq('id', id)

  if (!error) revalidatePath('/cadastro')
  return { error: error?.message ?? null }
}

export async function excluir(id: number): Promise<ActionResult> {
  await supabase.from('presencas_rodada').delete().eq('atleta_id', id).eq('tipo_atleta', 'Goleiro')
  const { error } = await supabase.from('goleiros').delete().eq('id', id)
  if (!error) revalidatePath('/cadastro')
  return { error: error?.message ?? null }
}
