import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Turma do Rola - Comary',
  description: 'Ranking e presença do grupo de futebol Turma do Rola - Comary',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Rola Comary',
  },
  icons: {
    icon: '/Logo.jpg',
    apple: '/Logo.jpg',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a5c2e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
