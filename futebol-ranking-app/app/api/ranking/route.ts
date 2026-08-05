import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Ranking
  const rj = await supabase.from('jogadores').select('*').order('pontuacao_atual', { ascending: false })

  // Última rodada registrada
  const { data: ultimaRodadaRow } = await supabase
    .from('presencas_rodada')
    .select('data_rodada')
    .order('data_rodada', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ultimaRodada = ultimaRodadaRow?.data_rodada ?? null

  // Presenças da última rodada
  let presencasUltima: Record<string, { presente: boolean; pontos_ganhos: number }> = {}
  if (ultimaRodada) {
    const { data: pres } = await supabase
      .from('presencas_rodada')
      .select('atleta_id, tipo_atleta, presente, pontos_ganhos')
      .eq('data_rodada', ultimaRodada)

    for (const p of pres ?? []) {
      presencasUltima[`${p.tipo_atleta}-${p.atleta_id}`] = {
        presente: p.presente,
        pontos_ganhos: p.pontos_ganhos,
      }
    }
  }

  return NextResponse.json({
    jogadores: rj.data ?? [],
    ultimaRodada,
    presencasUltima,
    errors: {
      jogadores: rj.error?.message ?? null,
    },
  })
}
