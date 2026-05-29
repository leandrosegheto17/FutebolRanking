import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [rj, rg] = await Promise.all([
    supabase.from('jogadores').select('*').order('pontuacao_atual', { ascending: false }),
    supabase.from('goleiros').select('*').order('pontuacao_atual', { ascending: false }),
  ])

  return NextResponse.json({
    jogadores: rj.data ?? [],
    goleiros:  rg.data ?? [],
    errors: {
      jogadores: rj.error?.message ?? null,
      goleiros:  rg.error?.message ?? null,
    },
  })
}
