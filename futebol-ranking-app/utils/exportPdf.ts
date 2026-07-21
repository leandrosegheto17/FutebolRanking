import type { Atleta } from '@/types'
import { supabase } from '@/lib/supabase'

type PresRow = { atleta_id: number; data_rodada: string; pontos_ganhos: number }

export async function exportarRankingPdf() {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  // Busca ranking e última rodada
  const res = await fetch('/api/ranking', { cache: 'no-store' })
  const { jogadores }: { jogadores: Atleta[] } = await res.json()

  // Busca as 5 últimas datas de rodada
  const { data: datas } = await supabase
    .from('presencas_rodada')
    .select('data_rodada')
    .eq('tipo_atleta', 'Linha')
    .order('data_rodada', { ascending: false })

  const ultimasDatas: string[] = [...new Set((datas ?? []).map(d => d.data_rodada))].slice(0, 5)

  // Presença por atleta em cada rodada
  const mapaPresencas: Record<string, Record<string, number>> = {}
  if (ultimasDatas.length > 0) {
    const { data: pres } = await supabase
      .from('presencas_rodada')
      .select('atleta_id, data_rodada, pontos_ganhos')
      .eq('tipo_atleta', 'Linha')
      .in('data_rodada', ultimasDatas)

    for (const p of (pres ?? []) as unknown as PresRow[]) {
      if (!mapaPresencas[p.atleta_id]) mapaPresencas[p.atleta_id] = {}
      mapaPresencas[p.atleta_id][p.data_rodada] = p.pontos_ganhos
    }
  }

  const fmt = (d: string) => { const [, m, dia] = d.split('-'); return `${dia}/${m}` }
  const hoje = new Date().toLocaleDateString('pt-BR')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // ── Fundo ──────────────────────────────────────────────────
  doc.setFillColor(14, 31, 21)
  doc.rect(0, 0, W, H, 'F')

  // ── Cabeçalho ──────────────────────────────────────────────
  doc.setFillColor(13, 43, 23)
  doc.rect(0, 0, W, 24, 'F')
  doc.setDrawColor(244, 196, 48)
  doc.setLineWidth(0.6)
  doc.line(0, 24, W, 24)

  doc.setTextColor(244, 196, 48)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('TURMA DO ROLA - COMARY', W / 2, 9, { align: 'center' })

  doc.setTextColor(205, 232, 197)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Ranking · Jogadores de Linha', W / 2, 15, { align: 'center' })

  doc.setTextColor(143, 186, 133)
  doc.setFontSize(6.5)
  doc.text(`Gerado em ${hoje}`, W / 2, 21, { align: 'center' })

  // ── Tabela ─────────────────────────────────────────────────
  const cabecalhos = ['#', 'Atleta', 'Pts Ini',
    ...ultimasDatas.map(fmt).reverse(),   // mais antiga → mais recente
    'Pts Final',
  ]

  // Inverte para exibir em ordem cronológica (mais antiga primeiro)
  const datasOrdenadas = [...ultimasDatas].reverse()

  const rows = jogadores.map((a, i) => {
    const pIni = a.pontuacao_inicial
    const rodadaCells = datasOrdenadas.map(d => {
      const pts = mapaPresencas[a.id]?.[d]
      if (pts === undefined) return '—'
      return pts === 0 ? '0' : String(pts)
    })
    return [i + 1, a.nome, pIni, ...rodadaCells, a.pontuacao_atual]
  })

  // Larguras das colunas — total fixo ~94mm, Atleta preenche o resto (~92mm)
  const colRodada = ultimasDatas.length > 0 ? 11 : 0
  const colStyles: Record<number, object> = {
    0: { halign: 'center', cellWidth: 9, fontStyle: 'bold' },
    1: { halign: 'left' },
    2: { halign: 'center', cellWidth: 14, textColor: [143, 186, 133] },
    [3 + ultimasDatas.length]: { halign: 'center', cellWidth: 16, fontStyle: 'bold', textColor: [244, 196, 48] },
  }
  for (let i = 0; i < ultimasDatas.length; i++) {
    colStyles[3 + i] = { halign: 'center', cellWidth: colRodada }
  }

  autoTable(doc, {
    head: [cabecalhos],
    body: rows,
    startY: 28,
    margin: { left: 12, right: 12 },
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.2, bottom: 1.2, left: 2.5, right: 2.5 },
      textColor: [232, 245, 226],
      fillColor: [21, 43, 30],
      lineColor: [40, 70, 50],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [26, 92, 46],
      textColor: [244, 196, 48],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
    },
    alternateRowStyles: { fillColor: [17, 37, 25] },
    columnStyles: colStyles,
    didParseCell(data) {
      if (data.section !== 'body') return
      const pos = (data.row.index as number) + 1
      const nCols = cabecalhos.length
      const isRodada = data.column.index >= 3 && data.column.index < nCols - 1

      if (pos <= 3 && data.column.index === 0) {
        data.cell.styles.textColor = [244, 196, 48]
        data.cell.styles.fontSize = 7.5
      }

      if (isRodada) {
        const val = String(data.cell.raw)
        if (val === '3') data.cell.styles.textColor = [74, 222, 128]
        else if (val === '2') data.cell.styles.textColor = [251, 191, 36]
        else if (val === '0') data.cell.styles.textColor = [107, 114, 128]
        else data.cell.styles.textColor = [60, 80, 65]
      }
    },
  })

  // ── Legenda ─────────────────────────────────────────────────
  const tY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? H - 20
  if (tY + 12 < H - 8) {
    doc.setFontSize(6.5)
    doc.setTextColor(74, 222, 128);  doc.text('3 = presente', 14, tY + 6)
    doc.setTextColor(251, 191, 36);  doc.text('2 = cartão vermelho', 36, tY + 6)
    doc.setTextColor(107, 114, 128); doc.text('0 = ausente', 80, tY + 6)
    doc.setTextColor(60, 80, 65);    doc.text('— = sem registro', 104, tY + 6)
  }

  // ── Rodapé ──────────────────────────────────────────────────
  doc.setDrawColor(30, 60, 40)
  doc.setLineWidth(0.3)
  doc.line(14, H - 9, W - 14, H - 9)
  doc.setTextColor(60, 100, 70)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('futebol-ranking-comary.vercel.app', W / 2, H - 5, { align: 'center' })

  doc.save(`ranking-turma-rola-${hoje.replace(/\//g, '-')}.pdf`)
}
