'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { exportarRankingPdf } from '@/utils/exportPdf'

const links = [
  { href: '/',         label: '🏆 Ranking' },
  { href: '/cadastro', label: '➕ Cadastro' },
  { href: '/rodada',   label: '📋 Rodada' },
  { href: '/historico',label: '📅 Histórico' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-dourado bg-gradient-to-r from-verde-escuro to-verde-campo shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-1 px-4 py-2 sm:px-6 sm:py-0 sm:h-16">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="text-2xl animate-spin" style={{ animationDuration: '6s' }}>⚽</span>
          <span className="font-bold text-dourado uppercase tracking-wide text-sm sm:text-base">
            Futebol Ranking
          </span>
        </Link>

        <ul className="flex w-full sm:w-auto gap-1 list-none m-0 p-0 justify-between sm:justify-end">
          {links.map(({ href, label }) => (
            <li key={href} className="flex-1 sm:flex-none text-center">
              <Link
                href={href}
                className={`block px-2 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors no-underline
                  ${pathname === href
                    ? 'bg-dourado text-verde-escuro'
                    : 'text-muted hover:bg-dourado/15 hover:text-dourado'
                  }`}
              >
                {label}
              </Link>
            </li>
          ))}
          <li className="flex-1 sm:flex-none text-center">
            <button
              onClick={exportarRankingPdf}
              className="w-full block px-2 py-1.5 rounded-md text-xs sm:text-sm font-semibold border border-dourado text-dourado bg-transparent hover:bg-dourado hover:text-verde-escuro transition-colors cursor-pointer"
            >
              📄 PDF
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}
