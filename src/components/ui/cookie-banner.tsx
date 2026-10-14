'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { ADS_CONSENT_KEY, saveAdsConsent } from '@/lib/ads-tracking'

export function CookieBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const banner = useRef<HTMLElement>(null)
  const [height, setHeight] = useState(0)
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
  useEffect(() => {
    const element = banner.current
    if (!visible || !element) return
    const measure = () => {
      const nextHeight = element.getBoundingClientRect().height + 24
      setHeight(nextHeight)
      document.documentElement.style.scrollPaddingBottom = `${nextHeight}px`
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
      document.documentElement.style.scrollPaddingBottom = ''
    }
  }, [visible, pathname])
  if (pathname === '/website-preview' || pathname.startsWith('/editor-demo'))
    return null
  const choose = (granted: boolean) => {
    saveAdsConsent(granted)
    setVisible(false)
  }
  if (!visible && pathname === '/beratung') return null // This page has its own footer control.
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
    <>
    <div aria-hidden="true" style={{ height }} />
    <section
      ref={banner}
      aria-label="Cookie-Einstellungen"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200 bg-white p-4 text-slate-700 shadow-[0_-8px_30px_-15px_rgba(15,23,42,0.2)] sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:rounded-xl sm:border"
    >
      <h2 className="text-sm font-bold text-slate-900 sm:block hidden">Ihre Privatsphäre</h2>
      <p className="mt-1 text-xs leading-relaxed">
        Optionale Cookies helfen uns, Google Ads auszuwerten. Die Beratung funktioniert auch ohne.{' '}
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
    </>
  )
}
