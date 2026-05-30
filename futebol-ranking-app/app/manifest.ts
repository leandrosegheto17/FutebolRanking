import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Turma do Rola - Comary',
    short_name: 'Rola Comary',
    description: 'Ranking e presença do grupo de futebol Turma do Rola - Comary',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0e1f15',
    theme_color: '#1a5c2e',
    icons: [
      {
        src: '/Logo.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/Logo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  }
}
