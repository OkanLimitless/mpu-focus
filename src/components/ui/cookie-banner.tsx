'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ADS_CONSENT_KEY, saveAdsConsent } from '@/lib/ads-tracking'

export function CookieBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(ADS_CONSENT_KEY))
    } catch {
      setVisible(true)
    }
    const open = () => setVisible(true)
    window.addEventListener('mpu-open-consent', open)
    return () => window.removeEventListener('mpu-open-consent', open)
  }, [])
  if (pathname === '/website-preview' || pathname.startsWith('/editor-demo'))
    return null
  const choose = (granted: boolean) => {
    saveAdsConsent(granted)
    setVisible(false)
  }
  if (!visible)
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-2 left-2 z-50 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm"
      >
        Cookies
      </button>
    )
  return (
    <section
      aria-label="Cookie-Einstellungen"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200 bg-white p-4 text-slate-700 shadow-[0_-8px_30px_-15px_rgba(15,23,42,0.2)] sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:rounded-xl sm:border"
    >
      <h2 className="text-sm font-bold text-slate-900">Ihre Privatsphäre</h2>
      <p className="mt-1 text-xs leading-relaxed">
        Mit Ihrer Zustimmung nutzen wir Google Ads zur Erfolgsmessung unserer
        Anzeigen. Die Beratung funktioniert auch ohne optionale Cookies.{' '}
        <a
          href="/datenschutz"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Datenschutz
        </a>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => choose(false)}
          className="min-h-[48px] rounded-lg border border-slate-300 px-2 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Nur notwendige
        </button>
        <button
          type="button"
          onClick={() => choose(true)}
          className="min-h-[48px] rounded-lg border border-slate-300 px-2 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Alle akzeptieren
        </button>
      </div>
    </section>
  )
}
