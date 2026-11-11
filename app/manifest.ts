import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RunTrackSG',
    short_name: 'RunTrackSG',
    description: 'Running log and route planner for Singapore, with heat adjusted pacing.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F0FDF4',
    theme_color: '#16A34A',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [{ name: 'Log a run', url: '/runs/new' }],
  }
}
