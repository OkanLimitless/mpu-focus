'use client'

import { useState, useEffect } from 'react'
import { Button } from './button'

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('mpu-cookie-consent')
        if (!consent) {
            setIsVisible(true)
        }
    }, [])

    if (!isVisible) return null

    const handleAcceptAll = () => {
        localStorage.setItem('mpu-cookie-consent', 'all')
        setIsVisible(false)
    }

    const handleEssential = () => {
        localStorage.setItem('mpu-cookie-consent', 'essential')
        setIsVisible(false)
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 bg-slate-900 border-t border-slate-800 text-slate-200 shadow-2xl">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex-1 text-sm">
                    <h3 className="text-lg font-semibold text-white mb-2">Wir respektieren Ihre Privatsphäre</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Wir verwenden Cookies, um Ihnen das beste Nutzererlebnis zu bieten. Einige sind essenziell (für die Kernfunktionen der Website), während andere uns helfen, diese Website und Ihre Erfahrung zu verbessern.{' '}
                        <a href="/datenschutz" className="underline hover:text-white transition-colors">Mehr zum Datenschutz erfahren</a>
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
                    <Button variant="outline" onClick={handleEssential} className="w-full sm:w-auto border-slate-700 hover:bg-slate-800 text-slate-300">
                        Nur essenzielle
                    </Button>
                    <Button onClick={handleAcceptAll} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white border-transparent">
                        Alle akzeptieren
                    </Button>
                </div>
            </div>
        </div>
    )
}
