import type { Atleta } from '@/types'

export async function exportarRankingPdf() {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  // Busca dados via API (evita problemas de CORS/server actions)
  const res = await fetch('/api/ranking', { cache: 'no-store' })
  const { jogadores }: { jogadores: Atleta[] } = await res.json()

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // 210mm
  const H = doc.internal.pageSize.getHeight()  // 297mm
  const hoje = new Date().toLocaleDateString('pt-BR')

  // ── Fundo geral ───────────────────────────────────────────
  doc.setFillColor(14, 31, 21)
  doc.rect(0, 0, W, H, 'F')

  // ── Cabeçalho ─────────────────────────────────────────────
  doc.setFillColor(13, 43, 23)
  doc.rect(0, 0, W, 36, 'F')

  // Linha dourada inferior do cabeçalho
  doc.setDrawColor(244, 196, 48)
  doc.setLineWidth(0.8)
  doc.line(0, 36, W, 36)

  // Título principal
  doc.setTextColor(244, 196, 48)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('TURMA DO ROLA - COMARY', W / 2, 13, { align: 'center' })

  // Subtítulo
  doc.setTextColor(205, 232, 197)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Ranking · Jogadores de Linha', W / 2, 21, { align: 'center' })

  // Data
  doc.setTextColor(143, 186, 133)
  doc.setFontSize(7.5)
  doc.text(`Gerado em ${hoje}`, W / 2, 29, { align: 'center' })

  // ── Tabela ────────────────────────────────────────────────
  const rows = jogadores.map((a, i) => [i + 1, a.nome, a.pontuacao_atual])

  autoTable(doc, {
    head: [['#', 'Atleta', 'Pts']],
    body: rows,
    startY: 41,
    margin: { left: 14, right: 14 },
    tableWidth: W - 28,

    styles: {
      fontSize: 8,
      cellPadding: { top: 1.8, bottom: 1.8, left: 4, right: 4 },
      textColor: [232, 245, 226],
      fillColor: [21, 43, 30],
      lineColor: [40, 70, 50],
      lineWidth: 0.2,
      font: 'helvetica',
    },

    headStyles: {
      fillColor: [26, 92, 46],
      textColor: [244, 196, 48],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
    },

    alternateRowStyles: {
      fillColor: [17, 37, 25],
    },

    columnStyles: {
      0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
    },

    didParseCell(data) {
      if (data.section !== 'body') return
      const pos = (data.row.index as number) + 1

      // Top 3 — texto dourado
      if (pos <= 3) {
        data.cell.styles.textColor = [244, 196, 48]
        if (data.column.index === 0) {
          data.cell.styles.fontSize = 9
        }
      }

      // Coluna de pontos — destaque dourado
      if (data.column.index === 2) {
        data.cell.styles.textColor = [244, 196, 48]
      }
    },
  })

  // ── Rodapé ────────────────────────────────────────────────
  doc.setTextColor(60, 100, 70)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('futebol-ranking-comary.vercel.app', W / 2, H - 5, { align: 'center' })

  // Linha dourada acima do rodapé
  doc.setDrawColor(30, 60, 40)
  doc.setLineWidth(0.3)
  doc.line(14, H - 9, W - 14, H - 9)

  doc.save(`ranking-turma-rola-${hoje.replace(/\//g, '-')}.pdf`)
}
