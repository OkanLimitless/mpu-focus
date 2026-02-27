import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'Impressum | MPU Focus',
    description: 'Impressum der MPU Focus',
}

export default function ImpressumPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zurück zur Startseite
                </Link>

                <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200">
                    <h1 className="text-3xl font-bold tracking-tight mb-8">Impressum</h1>

                    <div className="space-y-8 text-slate-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">Angaben gemäß § 5 TMG</h2>
                            <p>
                                MPU Focus<br />
                                (Musterdaten, bitte anpassen)<br />
                                Musterstraße 1<br />
                                12345 Musterstadt
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">Kontakt</h2>
                            <p>
                                Telefon: +49 (0) 123 456789<br />
                                E-Mail: info@mpu-focus.de
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">Umsatzsteuer-ID</h2>
                            <p>
                                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                                DE 123 456 789 (Musterdaten)
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
                            <p>
                                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    )
}
