import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { Toaster } from '@/components/ui/toaster'
import { CookieBanner } from '@/components/ui/cookie-banner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MPU Beratung | Kostenlose Erstberatung - MPU Focus',
  description: 'Professionelle MPU-Vorbereitung mit individueller Beratung fuer Alkohol-, Drogen- und Punkte-MPU. Kostenloses Beratungsgespraech vereinbaren.',
  keywords: 'MPU Beratung, MPU Vorbereitung, Führerschein zurück, Alkohol MPU, Drogen MPU, Punkte MPU, MPU bestehen, MPU Hilfe',
  authors: [{ name: 'MPU Focus' }],
  creator: 'MPU Focus',
  publisher: 'MPU Focus',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://mpu-focus.de',
    title: 'MPU Focus | Professionelle MPU-Beratung',
    description: 'Individuelle MPU-Vorbereitung mit strukturiertem Vorgehen. Kostenloses Beratungsgespraech vereinbaren.',
    siteName: 'MPU Focus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MPU Focus | Professionelle MPU-Beratung',
    description: 'Individuelle MPU-Vorbereitung mit strukturiertem Vorgehen.',
  },
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <AuthProvider>

          {children}
          <Toaster />
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  )
}
