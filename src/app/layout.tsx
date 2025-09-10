import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { Toaster } from '@/components/ui/toaster'
import { LanguageSwitcher } from '@/components/providers/i18n-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MPU Beratung | 92% Erfolgsquote | Kostenloses Beratungsgespräch - MPU Focus',
  description: 'Professionelle MPU-Vorbereitung mit über 90% Erfolgsquote. Individuelle Beratung von Experten für Alkohol-, Drogen- und Punkte-MPU. Kostenloses Beratungsgespräch vereinbaren.',
  keywords: 'MPU Beratung, MPU Vorbereitung, Führerschein zurück, Alkohol MPU, Drogen MPU, Punkte MPU, MPU bestehen, MPU Hilfe',
  authors: [{ name: 'MPU Focus' }],
  creator: 'MPU Focus',
  publisher: 'MPU Focus',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://mpu-focus.de',
    title: 'MPU Focus | Professionelle MPU-Beratung mit 92% Erfolgsquote',
    description: 'Bestehen Sie Ihre MPU im ersten Anlauf. Individuelle Beratung von Experten. Kostenloses Beratungsgespräch vereinbaren.',
    siteName: 'MPU Focus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MPU Focus | Professionelle MPU-Beratung',
    description: 'Bestehen Sie Ihre MPU im ersten Anlauf. 92% Erfolgsquote.',
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
          <div className="fixed top-3 right-3 z-50">
            <LanguageSwitcher />
          </div>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
