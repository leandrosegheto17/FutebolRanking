import Image from 'next/image'
import { listarRanking as rankingJogadores } from '@/actions/jogadores'
import { listarRanking as rankingGoleiros } from '@/actions/goleiros'
import type { Atleta } from '@/types'

function medalha(pos: number) {
  if (pos === 1) return '🥇'
  if (pos === 2) return '🥈'
  if (pos === 3) return '🥉'
  return String(pos)
}

function TabelaRanking({ titulo, icone, atletas }: { titulo: string; icone: string; atletas: Atleta[] }) {
  return (
    <div className="bg-card-bg rounded-2xl overflow-hidden border border-white/7 shadow-xl">
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-verde-campo to-verde-medio border-b-2 border-dourado">
        <span className="text-xl">{icone}</span>
        <h2 className="text-dourado font-bold uppercase tracking-wide text-sm">{titulo}</h2>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-white/4">
            <th className="text-left px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">#</th>
            <th className="text-left px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">Atleta</th>
            <th className="text-right px-4 py-2 text-verde-claro text-xs uppercase tracking-wider">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {atletas.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-8 text-verde-claro text-sm">
                Nenhum atleta cadastrado.
              </td>
            </tr>
          ) : (
            atletas.map((a, i) => (
              <tr key={a.id} className={`border-b border-white/5 hover:bg-dourado/6 transition-colors ${i < 3 ? 'bg-dourado/4' : ''}`}>
                <td className="px-4 py-3 text-center w-10 text-lg font-bold">{medalha(i + 1)}</td>
                <td className="px-4 py-3 font-medium">{a.nome}</td>
                <td className="px-4 py-3 text-right">
                  <span className="bg-verde-campo text-dourado text-sm font-bold px-3 py-0.5 rounded-full border border-dourado/30">
                    {a.pontuacao_atual}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default async function Dashboard() {
  const [rj, rg] = await Promise.all([rankingJogadores(), rankingGoleiros()])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
      <div className="text-center mb-8 bg-gradient-to-br from-verde-campo to-verde-escuro rounded-2xl p-6 sm:p-10 border border-dourado/30 shadow-xl">
        <Image
          src="/Logo.jpg"
          alt="Turma do Rola"
          width={80}
          height={80}
          className="rounded-full border-4 border-dourado shadow-lg mx-auto mb-4 object-cover"
        />
        <h1 className="text-2xl sm:text-4xl font-bold text-dourado mb-1 drop-shadow">
          Turma do Rola - Comary
        </h1>
        <p className="text-muted text-sm sm:text-base opacity-85">
          Classificação atualizada · Temporada 2025/26
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TabelaRanking titulo="Jogadores de Linha" icone="👟" atletas={rj.data ?? []} />
        <TabelaRanking titulo="Goleiros" icone="🧤" atletas={rg.data ?? []} />
      </div>
    </div>
  )
}
