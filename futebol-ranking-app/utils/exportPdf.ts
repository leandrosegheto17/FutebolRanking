import { listarRanking as rankingJogadores } from '@/actions/jogadores'
import { listarRanking as rankingGoleiros } from '@/actions/goleiros'

export async function exportarRankingPdf() {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const [rj, rg] = await Promise.all([rankingJogadores(), rankingGoleiros()])

  const doc = new jsPDF()
  const hoje = new Date().toLocaleDateString('pt-BR')

  doc.setFontSize(16)
  doc.text('Turma do Rola - Comary', 14, 18)
  doc.setFontSize(10)
  doc.text(`Ranking gerado em ${hoje}`, 14, 26)

  const linhas: RowInput[] = (rj.data ?? []).map((a, i) => [i + 1, a.nome, a.pontuacao_atual])
  const goleiroRows: RowInput[] = (rg.data ?? []).map((a, i) => [i + 1, a.nome, a.pontuacao_atual])

  autoTable(doc, {
    head: [['#', 'Jogador de Linha', 'Pontos']],
    body: linhas,
    startY: 32,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 92, 46] },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 80

  doc.setFontSize(13)
  doc.text('Goleiros', 14, finalY + 10)

  autoTable(doc, {
    head: [['#', 'Goleiro', 'Pontos']],
    body: goleiroRows,
    startY: finalY + 14,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 92, 46] },
  })

  doc.save(`ranking-turma-rola-${hoje.replace(/\//g, '-')}.pdf`)
}

type RowInput = (string | number)[]
