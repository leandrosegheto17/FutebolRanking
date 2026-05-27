import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { jogadoresService } from '../services/api'

const VERDE  = [26, 92, 46]
const DOURADO = [244, 196, 48]
const BRANCO  = [255, 255, 255]
const CINZA   = [240, 240, 240]
const VERDE_CLARO = [220, 240, 220]
const VERMELHO_CLARO = [255, 230, 230]

function formatarData(iso) {
  // "2025-03-15" → "15/03"
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

export async function exportarRankingPdf() {
  const { data } = await jogadoresService.rankingPdf()
  const { datas, jogadores } = data

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // 297
  const H = doc.internal.pageSize.getHeight()  // 210

  // Cabeçalho
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, W, 22, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...DOURADO)
  doc.text('FUTEBOL RANKING', W / 2, 10, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRANCO)
  doc.text('Ranking de Jogadores de Linha · Temporada 2025/26', W / 2, 16, { align: 'center' })

  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  doc.setFontSize(7)
  doc.text(`Gerado em ${hoje}`, W - 8, 19, { align: 'right' })

  // Legenda de presenças
  const legendaY = 26
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...VERDE)
  doc.text('✓ Presente   ✗ Ausente', 8, legendaY)

  const cabecalho = ['#', 'Nome', 'Pt. Inicial', ...datas.map(formatarData), 'Pt. Final']

  autoTable(doc, {
    startY: 30,
    margin: { left: 8, right: 8 },
    head: [cabecalho],
    body: jogadores.map((j, i) => [
      `${i + 1}°`,
      j.nome,
      j.pontuacaoInicial,
      ...j.presencas.map(p => (p ? '✓' : '✗')),
      j.pontuacaoAtual,
    ]),
    headStyles: {
      fillColor: VERDE,
      textColor: DOURADO,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 22 },
      // colunas de presença (índices 3..3+datas.length-1)
      ...Object.fromEntries(
        datas.map((_, idx) => [idx + 3, { halign: 'center', cellWidth: 18 }])
      ),
      [3 + datas.length]: { halign: 'center', cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: CINZA },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        const colPresencaInicio = 3
        const colPresencaFim = 3 + datas.length - 1

        // Destaque top 3
        if (data.row.index < 3) {
          doc.setFillColor(...DOURADO)
          doc.rect(data.cell.x, data.cell.y, 1.5, data.cell.height, 'F')
        }

        // Colorir células de presença
        if (data.column.index >= colPresencaInicio && data.column.index <= colPresencaFim) {
          const presente = data.cell.raw === '✓'
          doc.setFillColor(...(presente ? VERDE_CLARO : VERMELHO_CLARO))
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
          doc.setTextColor(presente ? 0 : 180, presente ? 100 : 0, 0)
          doc.setFontSize(7)
          doc.text(
            data.cell.raw,
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height / 2 + 1,
            { align: 'center' }
          )
        }
      }
    },
    theme: 'grid',
    styles: { lineColor: [200, 200, 200], lineWidth: 0.1 },
  })

  // Rodapé
  doc.setFillColor(...VERDE)
  doc.rect(0, H - 8, W, 8, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...DOURADO)
  doc.text('Futebol Ranking — Documento gerado automaticamente', W / 2, H - 3, { align: 'center' })

  doc.save(`ranking_jogadores_${hoje.replace(/\//g, '-')}.pdf`)
}
