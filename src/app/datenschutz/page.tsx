import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'Datenschutzerklärung | MPU Focus',
    description: 'Datenschutzerklärung der MPU Focus',
}

export default function DatenschutzPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zurück zur Startseite
                </Link>

                <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200">
                    <h1 className="text-3xl font-bold tracking-tight mb-8">Datenschutzerklärung</h1>

                    <div className="space-y-8 text-slate-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Datenschutz auf einen Blick</h2>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Allgemeine Hinweise</h3>
                            <p className="mb-4">
                                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Allgemeine Hinweise und Pflichtinformationen</h2>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Datenschutz</h3>
                            <p className="mb-4">
                                Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                            </p>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Hinweis zur verantwortlichen Stelle</h3>
                            <p>
                                Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br />
                                <br />
                                MPU Focus<br />
                                Musterstraße 1<br />
                                12345 Musterstadt<br />
                                E-Mail: info@mpu-focus.de
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Datenerfassung auf dieser Website</h2>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Cookies</h3>
                            <p>
                                Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    )
}
