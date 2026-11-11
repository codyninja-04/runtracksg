import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import { RegisterSW } from '@/components/layout/RegisterSW'
import './globals.css'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: { default: 'RunTrackSG · Run smarter in the Singapore heat', template: '%s · RunTrackSG' },
  description: 'A running log and route planner built for Singapore. Park connectors, East Coast, MacRitchie and Marina Bay, heat adjusted pacing, and training plans that respect the weather.',
  applicationName: 'RunTrackSG',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'RunTrackSG', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#F0FDF4',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}
